"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import {
  addChatMessage,
  clearChatMessages,
  dateKey,
  getChatMessages,
  logFoodItems,
  updateChatMessage,
  updateStreak,
} from "@/src/services/firestoreService";
import { resolveMealItems } from "@/src/services/mealResolver";
import { useToast } from "@/src/components/Toast";
import MealConfirmCard from "@/src/components/MealConfirmCard";
import useSpeechInput from "@/src/hooks/useSpeechInput";
import styles from "./ChatPage.module.css";

const MAX_LENGTH = 500;
// Matches MAX_HISTORY_TURNS on the route — no point sending more than it keeps.
const HISTORY_TURNS = 8;

const SUGGESTIONS = [
  "2 rotis, a bowl of dal and a cup of chai",
  "Idli sambar and filter coffee",
  "Chicken biryani and a glass of buttermilk",
];

// Local-only id for a message not yet persisted.
const tempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, toastNode } = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // Guards the ?q= auto-send so React strict-mode's double effect (and any
  // re-render) can't fire the same prefilled message twice.
  const autoSentRef = useRef(false);

  const speech = useSpeechInput({
    onResult: (transcript) => setInput(transcript.slice(0, MAX_LENGTH)),
  });

  // ─── Load history ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      try {
        const history = await getChatMessages(user.uid, 50);
        if (!cancelled) setMessages(history);
      } catch (err) {
        console.warn("Failed to load chat history:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Keep the newest message in view as the transcript grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  // ─── Send ───────────────────────────────────────────────────────────────
  const send = useCallback(
    async (rawText) => {
      const text = rawText.trim().slice(0, MAX_LENGTH);
      if (!text || thinking || !user) return;

      setInput("");
      speech.stop();

      const userMsg = { id: tempId(), role: "user", text };
      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);

      // Persist the user's turn immediately so it survives a reload even if the
      // AI call then fails.
      addChatMessage(user.uid, { role: "user", text })
        .then((id) =>
          setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, id } : m))),
        )
        .catch((err) => console.warn("Failed to persist message:", err));

      try {
        const history = [...messages, userMsg]
          .slice(-HISTORY_TURNS)
          .map((m) => ({ role: m.role, text: m.text }));

        const token = await user.getIdToken();
        const res = await fetch("/api/chat-log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ messages: history, localHour: new Date().getHours() }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Couldn't reach the AI. Try again.");
        }

        // Ground the AI's numbers in real nutrition data where we can.
        const items =
          data.kind === "meal" ? await resolveMealItems(data.items || []) : [];

        const assistant = {
          role: "assistant",
          text: data.reply,
          items,
          meal: data.meal,
          logged: false,
        };

        const localId = tempId();
        setMessages((prev) => [...prev, { id: localId, ...assistant }]);

        // Fire-and-forget: the card is already on screen and fully usable, so a
        // slow or failing Firestore write must not hold the typing indicator
        // open behind an await.
        addChatMessage(user.uid, assistant)
          .then((id) =>
            setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, id } : m))),
          )
          .catch((err) => console.warn("Failed to persist reply:", err));
      } catch (err) {
        // "Failed to fetch" is the browser's own wording for an unreachable
        // network — say something the user can act on instead.
        const message =
          err.message === "Failed to fetch"
            ? "Network error — check your connection and try again."
            : err.message || "Something went wrong. Try again.";

        setMessages((prev) => [
          ...prev,
          { id: tempId(), role: "assistant", text: message, items: [], error: true },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [messages, thinking, user, speech],
  );

  // ─── Auto-send text handed over from the Today page ──────────────────────
  useEffect(() => {
    if (loading || autoSentRef.current || !user) return;
    const q = searchParams.get("q");
    if (!q) return;
    autoSentRef.current = true;
    // Drop ?q= so a refresh doesn't resend the same sentence.
    router.replace("/chat");
    send(q);
  }, [loading, user, searchParams, router, send]);

  // ─── Log a confirmed meal ───────────────────────────────────────────────
  const handleLog = async (msgId, items, meal) => {
    if (!user) return;
    try {
      await logFoodItems(user.uid, dateKey(), items, meal);
      updateStreak(user.uid).catch(() => {});

      // Freeze the card at exactly what was saved.
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, items, meal, logged: true } : m)),
      );
      if (!String(msgId).startsWith("temp-")) {
        updateChatMessage(user.uid, msgId, { items, meal, logged: true }).catch((err) =>
          console.warn("Failed to mark logged:", err),
        );
      }

      const kcal = items.reduce((sum, i) => sum + (i.calories || 0), 0);
      showToast(
        `Logged ${items.length} item${items.length > 1 ? "s" : ""} · ${kcal} kcal`,
        "success",
      );
    } catch (err) {
      console.warn("Failed to log meal:", err);
      showToast("Couldn't save that — nothing was logged.");
    }
  };

  const handleClear = async () => {
    if (!user || messages.length === 0) return;
    const snapshot = messages;
    setMessages([]);
    try {
      await clearChatMessages(user.uid);
    } catch (err) {
      console.warn("Failed to clear chat:", err);
      setMessages(snapshot);
      showToast("Couldn't clear the chat.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button
          className={styles.back}
          onClick={() => router.push("/")}
          aria-label="Back to Today"
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </button>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>AI Log</h1>
          <p className={styles.subtitle}>Tell me what you ate</p>
        </div>
        {messages.length > 0 && (
          <button className={styles.clear} onClick={handleClear} aria-label="Clear chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        )}
      </header>

      <div className={styles.scroll} ref={scrollRef}>
        {loading ? (
          <div className={styles.center}>
            <div className="spinner spinner-lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Just say what you ate</h2>
            <p className={styles.emptyText}>
              Describe your meal in plain words. I&apos;ll work out the portions, calories
              and macros, then log it.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className={styles.suggestion} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className={styles.userRow}>
                  <div className={styles.userBubble}>{msg.text}</div>
                </div>
              ) : (
                <div key={msg.id} className={styles.aiRow}>
                  <div
                    className={`${styles.aiBubble} ${msg.error ? styles.aiBubbleError : ""}`}
                  >
                    {msg.text}
                  </div>
                  {msg.items?.length > 0 && (
                    <MealConfirmCard
                      // Remount when the logged state flips so the card's own
                      // item state is re-seeded from the saved values.
                      key={`${msg.id}-${msg.logged ? "logged" : "draft"}`}
                      items={msg.items}
                      meal={msg.meal}
                      logged={!!msg.logged}
                      onLog={(items, meal) => handleLog(msg.id, items, meal)}
                    />
                  )}
                </div>
              ),
            )}

            {thinking && (
              <div className={styles.aiRow}>
                <div className={styles.typing}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        {speech.supported && (
          <button
            type="button"
            className={`${styles.mic} ${speech.listening ? styles.micActive : ""}`}
            onClick={speech.toggle}
            aria-label={speech.listening ? "Stop dictating" : "Dictate your meal"}
            aria-pressed={speech.listening}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
            </svg>
          </button>
        )}

        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={speech.listening ? "Listening…" : "e.g. 2 rotis and a bowl of dal"}
          aria-label="Describe what you ate"
          maxLength={MAX_LENGTH}
          enterKeyHint="send"
          disabled={thinking}
        />

        <button
          type="submit"
          className={styles.send}
          disabled={!input.trim() || thinking}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>

      {toastNode}
    </div>
  );
}

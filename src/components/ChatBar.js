"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { parseMeal } from "@/src/services/chatLogClient";
import MealConfirmCard from "@/src/components/MealConfirmCard";
import useSpeechInput from "@/src/hooks/useSpeechInput";
import styles from "./ChatBar.module.css";

const MAX_LENGTH = 500;

/**
 * The "What did you eat?" bar on the Today page.
 *
 * Logs in place: type (or dictate) a meal, review the card that appears right
 * under the bar, tap Log — the ring updates without ever leaving Today. The
 * chat icon still opens the full conversation for back-and-forth.
 *
 * `onLog(items, meal)` is HomePage's writer; it owns the entries state, so the
 * totals update the instant the user confirms.
 */
export default function ChatBar({ onLog }) {
  const router = useRouter();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null); // { id, items, meal }
  const [note, setNote] = useState(null); // { text, error }

  const speech = useSpeechInput({
    onResult: (transcript) => setText(transcript.slice(0, MAX_LENGTH)),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = text.trim().slice(0, MAX_LENGTH);
    if (!q) {
      router.push("/chat");
      return;
    }
    if (busy || !user) return;

    speech.stop();
    setBusy(true);
    setNote(null);
    setDraft(null);
    try {
      // Only this sentence — the bar has no transcript, so nothing earlier can
      // be re-parsed and logged twice.
      const result = await parseMeal(user, [{ role: "user", text: q }]);
      if (result.kind === "meal") {
        setDraft({ id: Date.now(), items: result.items, meal: result.meal });
        setText("");
      } else {
        setNote({ text: result.reply, error: false });
      }
    } catch (err) {
      setNote({ text: err.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const handleLog = async (items, meal) => {
    try {
      await onLog(items, meal);
      setDraft(null);
    } catch {
      // HomePage already showed the error toast; the card stays for a retry.
    }
  };

  const hasText = !!text.trim();

  return (
    <div>
      <form className={styles.bar} onSubmit={handleSubmit}>
        <button
          type="button"
          className={styles.icon}
          onClick={() => router.push("/chat")}
          aria-label="Open AI chat"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>

        <input
          className={styles.input}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            busy ? "Working it out…" : speech.listening ? "Listening…" : "What did you eat?"
          }
          aria-label="Describe what you ate"
          enterKeyHint="send"
          maxLength={MAX_LENGTH}
          disabled={busy}
        />

        {speech.supported && !hasText && !busy && (
          <button
            type="button"
            className={`${styles.send} ${speech.listening ? styles.micActive : ""}`}
            onClick={speech.toggle}
            aria-label={speech.listening ? "Stop dictating" : "Dictate your meal"}
            aria-pressed={speech.listening}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
            </svg>
          </button>
        )}

        {(hasText || busy || !speech.supported) && (
          <button
            type="submit"
            className={`${styles.send} ${hasText ? styles.sendActive : ""}`}
            disabled={busy}
            aria-label={hasText ? "Log this meal" : "Open AI chat"}
          >
            {busy ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        )}
      </form>

      {note && (
        <div className={`${styles.note} ${note.error ? styles.noteError : ""}`}>
          <span>{note.text}</span>
          <button className={styles.noteClose} onClick={() => setNote(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {draft && (
        <div className={styles.draft}>
          <MealConfirmCard
            key={draft.id}
            items={draft.items}
            meal={draft.meal}
            onLog={handleLog}
          />
          <button className={styles.discard} onClick={() => setDraft(null)}>
            Discard
          </button>
        </div>
      )}
    </div>
  );
}

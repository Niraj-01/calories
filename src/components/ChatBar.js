"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./ChatBar.module.css";

/**
 * The "What did you eat?" entry point on the Today page.
 *
 * Typing here and submitting hands the text straight to /chat, which picks it up
 * and sends it on mount — so the user never types the same sentence twice. Just
 * tapping without typing opens an empty chat.
 */
export default function ChatBar() {
  const router = useRouter();
  const [text, setText] = useState("");

  const open = (prefill) => {
    const q = prefill?.trim();
    router.push(q ? `/chat?q=${encodeURIComponent(q)}` : "/chat");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    open(text);
  };

  return (
    <form className={styles.bar} onSubmit={handleSubmit}>
      <span className={styles.icon} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </span>

      <input
        className={styles.input}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you eat?"
        aria-label="Describe what you ate"
        enterKeyHint="send"
        maxLength={500}
      />

      <button
        type="submit"
        className={`${styles.send} ${text.trim() ? styles.sendActive : ""}`}
        aria-label={text.trim() ? "Send to AI chat" : "Open AI chat"}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}

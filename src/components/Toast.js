"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Toast.module.css";

/**
 * useToast — tiny, dependency-free toast for surfacing optimistic-update
 * rollbacks (and the occasional success). Returns:
 *   - showToast(message, type?)  // type: "error" (default) | "success"
 *   - toastNode                  // render this once in the page's JSX
 *
 * It auto-dismisses, and is portaled to <body> so it floats above page content
 * and the bottom nav regardless of where it's rendered.
 */
export function useToast() {
  const [toast, setToast] = useState(null); // { id, message, type }

  const showToast = useCallback((message, type = "error") => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const toastNode =
    typeof document !== "undefined" && toast
      ? createPortal(
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type] || styles.error}`}
            role="status"
            aria-live="polite"
            onClick={() => setToast(null)}
          >
            {toast.message}
          </div>,
          document.body,
        )
      : null;

  return { showToast, toastNode };
}

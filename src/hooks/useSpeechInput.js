"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice dictation via the Web Speech API.
 *
 * Supported in Chrome and Android WebView (which is what the Play Store TWA
 * wraps). iOS Safari does not implement it, so `supported` comes back false and
 * the caller simply doesn't render a mic button — the keyboard still works.
 *
 * Interim results are streamed so the user sees words appear as they speak
 * rather than waiting for a pause.
 */
function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function useSpeechInput({ onResult, lang = "en-IN" } = {}) {
  // Resolved during render rather than in an effect — setting it from an effect
  // would cascade an extra render, and the consumer (ChatPage) is ssr:false so
  // `window` is already available on the first client render.
  const [supported] = useState(() => !!getSpeechRecognition());
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  // Held in a ref so restarting recognition doesn't need a fresh callback
  // identity, which would tear down and rebuild the recognizer mid-sentence.
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      // Concatenate every chunk so far — the API reports results incrementally.
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onResultRef.current?.(transcript);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || listening) return;
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if it's already running — nothing to recover from.
    }
  }, [listening]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      /* not running */
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}

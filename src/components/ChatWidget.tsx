"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OPEN_CHAT } from "./chat-events";

type Message = {
  role: "user" | "assistant";
  text: string;
  error?: boolean;
};

const GREETING: Message = {
  role: "assistant",
  text: "Здравствуйте! Я отвечаю на вопросы о курсах по документам учебного центра. Что вас интересует?",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [atFooter, setAtFooter] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const history = [...messagesRef.current, { role: "user" as const, text }];
    setMessages(history);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        res.ok
          ? { role: "assistant", text: data.answer }
          : { role: "assistant", text: data.error ?? "Что-то пошло не так.", error: true },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Нет связи с сервером. Попробуйте ещё раз.", error: true },
      ]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const question = (e as CustomEvent<{ question?: string }>).detail?.question;
      if (question) void send(question);
    };
    window.addEventListener(OPEN_CHAT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT, onOpen);
  }, [send]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, busy]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // The footer carries its own way in; the floating button would cover its wordmark.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setAtFooter(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  if (!open) {
    if (atFooter) return null;
    return (
      <button className="btn chat-fab" onClick={() => setOpen(true)}>
        Ассистент
      </button>
    );
  }

  return (
    <section
      className="chat-panel"
      role="dialog"
      aria-label="Ассистент учебного центра"
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <div className="chat-head">
        <h2>Ассистент</h2>
        <button onClick={() => setOpen(false)}>Закрыть</button>
      </div>
      <div className="chat-log" ref={log} aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}${m.error ? " error" : ""}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="msg assistant">Ищу в документах…</div>}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          const value = draft;
          setDraft("");
          void send(value);
        }}
      >
        <input
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ваш вопрос"
          aria-label="Ваш вопрос ассистенту"
        />
        <button className="btn" type="submit" disabled={busy}>
          Отправить
        </button>
      </form>
    </section>
  );
}

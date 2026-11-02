"use client";

import { useState } from "react";
import { openChat } from "./chat-events";

export default function AskForm() {
  const [question, setQuestion] = useState("");

  return (
    <form
      className="ask"
      onSubmit={(e) => {
        e.preventDefault();
        openChat(question.trim() || undefined);
        setQuestion("");
      }}
    >
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Что входит в курс по аналитике?"
        aria-label="Вопрос ассистенту"
      />
      <button type="submit">Спросить</button>
    </form>
  );
}

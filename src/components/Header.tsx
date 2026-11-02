"use client";

import { useEffect, useState } from "react";
import { openChat } from "./chat-events";

/** Takes the ink of the chapter currently under it. */
export default function Header() {
  const [ink, setInk] = useState<"dark" | "light">("dark");
  const [ground, setGround] = useState("");

  useEffect(() => {
    const update = () => {
      const stack = document
        .elementsFromPoint(window.innerWidth / 2, 36)
        .filter((el): el is HTMLElement => el instanceof HTMLElement && !el.closest("header"));
      const chapter = stack.find((el) => el.dataset.fieldInk);
      const filled = stack.find((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)");
      setInk(chapter?.dataset.fieldInk === "light" ? "light" : "dark");
      setGround(filled ? getComputedStyle(filled).backgroundColor : "");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <header className="site-header" data-ink={ink} style={{ backgroundColor: ground || undefined }}>
      <a className="wordmark" href="#top">
        Цифра
      </a>
      <nav className="site-nav" aria-label="Основная навигация">
        <a href="#directions">Направления</a>
        <a href="#how">Как учимся</a>
        <a href="#faq">Вопросы</a>
        <button className="btn" onClick={() => openChat()}>
          Подобрать курс
        </button>
      </nav>
    </header>
  );
}

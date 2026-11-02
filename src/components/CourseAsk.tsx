"use client";

import { openChat } from "./chat-events";

export default function CourseAsk({ title }: { title: string }) {
  return (
    <button
      className="link-btn"
      onClick={() => openChat(`Расскажите о курсе «${title}»: программа, формат и стоимость.`)}
    >
      Спросить об этом курсе
    </button>
  );
}

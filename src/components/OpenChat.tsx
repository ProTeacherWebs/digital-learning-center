"use client";

import { openChat } from "./chat-events";

export default function OpenChat({ children }: { children: React.ReactNode }) {
  return (
    <button className="link-btn footer-open" onClick={() => openChat()}>
      {children}
    </button>
  );
}

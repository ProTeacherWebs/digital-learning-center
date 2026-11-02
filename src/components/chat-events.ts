export const OPEN_CHAT = "open-chat";

/** Opens the assistant, optionally sending a first question. */
export function openChat(question?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT, { detail: { question } }));
}

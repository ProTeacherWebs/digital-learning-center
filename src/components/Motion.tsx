"use client";

import { useEffect } from "react";

/** Reveals every [data-reveal] element once as it enters, staggered among its siblings. */
export default function Motion() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    items.forEach((el) => {
      const siblings = Array.from(el.parentElement?.children ?? []).filter((c) =>
        c.hasAttribute("data-reveal"),
      );
      el.style.setProperty("--i", String(Math.min(siblings.indexOf(el), 5)));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}

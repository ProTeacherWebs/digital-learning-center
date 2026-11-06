import { connection } from "next/server";
import { loadDirections } from "@/lib/catalog";
import OpenChat from "./OpenChat";

export default async function SiteFooter() {
  await connection();
  const directions = await loadDirections();

  return (
    <footer className="footer" data-field-ink="light">
      <p className="footer-name display" aria-label="Цифра">
        Цифра
      </p>
      <div className="footer-grid">
        <ul className="footer-places">
          {directions.map((d) => (
            <li key={d.id}>
              <a href={`#${d.id}`}>{d.name}</a>
            </li>
          ))}
        </ul>
        <div className="footer-links">
          <div>
            <h3>Страница</h3>
            <ul>
              <li>
                <a href="#directions">Направления</a>
              </li>
              <li>
                <a href="#how">Как учимся</a>
              </li>
              <li>
                <a href="#faq">Вопросы</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Ассистент</h3>
            <ul>
              <li>Отвечает по документам центра</li>
              <li>
                <OpenChat>Задать вопрос</OpenChat>
              </li>
            </ul>
          </div>
        </div>
        <p className="credits">
          Фотографии: «Blue punch card front», public domain; «Employees in computer room plotter in use Hughes Aircraft Company», Hughes Aircraft Company, public domain; «Michael Holley Computer 1978 NWCN», Gale Sherry, public domain; «RS 42471-12 PCB 02», Mister rf,{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>. Все через{" "}
          <a href="https://commons.wikimedia.org">Wikimedia Commons</a>.
        </p>
      </div>
      <div className="footer-last small">
        <span>© 2026 Учебный центр «Цифра»</span>
        <a href="#top">Наверх</a>
      </div>
    </footer>
  );
}

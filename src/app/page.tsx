import AskForm from "@/components/AskForm";
import ChatWidget from "@/components/ChatWidget";
import CourseAsk from "@/components/CourseAsk";
import Header from "@/components/Header";
import Motion from "@/components/Motion";
import OpenChat from "@/components/OpenChat";
import {
  directions,
  formatPrice,
  pluralize,
  shortestMonths,
} from "@/data/courses";

const stages = [
  {
    title: "Выбираете курс",
    text: "Рассказываете о целях ассистенту, он подскажет подходящее направление и уровень.",
    image: "/images/blue-punch-card-front-horiz.png",
    alt: "Синяя перфокарта с набором символов",
    bg: "var(--field-1)",
  },
  {
    title: "Учитесь на практике",
    text: "Каждый модуль заканчивается заданием, которое можно показать работодателю.",
    image: "/images/employees-in-computer-room-plotter-in-use.jpg",
    alt: "Сотрудники в машинном зале с большими компьютерами, 1970-е",
    bg: "var(--field-3)",
  },
  {
    title: "Собираете портфолио",
    text: "На выходе итоговый проект и понимание, куда расти дальше.",
    image: "/images/michael-holley-computer-1978-nwcn.jpg",
    alt: "Домашний компьютер 1978 года с двумя дисководами",
    bg: "var(--field-4)",
  },
];

const faq = [
  {
    q: "Нужен ли опыт, чтобы начать?",
    a: "Для большинства курсов опыт не нужен. Если сомневаетесь, спросите ассистента, он подскажет, с чего начать.",
  },
  {
    q: "Как выбрать направление?",
    a: "Опишите ассистенту, чем вы занимаетесь и чего хотите достичь: он предложит подходящие курсы.",
  },
  {
    q: "Откуда ассистент берёт ответы?",
    a: "Только из документов учебного центра. Если в них нет ответа, ассистент так и скажет.",
  },
  {
    q: "Можно ли учиться онлайн?",
    a: "Да, все курсы из списка проходят онлайн, часть с практикой.",
  },
  {
    q: "Где посмотреть стоимость?",
    a: "Цена указана у каждого курса. Условия уточните у ассистента.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main id="top">
        <section className="hero" data-field-ink="dark">
          <div className="hero-paper" />
          <h1 className="hero-title display">
            <span className="copy over">
              <span>Цифровые</span>
              <span>навыки</span>
            </span>
            <span className="copy under" aria-hidden="true">
              <span>Цифровые</span>
              <span>навыки</span>
            </span>
          </h1>
          <p className="hero-lead">
            Учебный центр «Цифра»: курсы по маркетингу, дизайну, разработке, аналитике и AI.
          </p>
        </section>

        <section className="list" id="directions" data-field-ink="dark">
          <h2 className="head" data-reveal>
            Пять направлений
          </h2>
          <ul>
            {directions.map((d) => {
              const n = d.courses.length;
              return (
                <li key={d.id} data-reveal>
                  <a className="poster-line" href={`#${d.id}`}>
                    <span className="name display">{d.name}</span>
                    <span className="detail">
                      {n} {pluralize(n, "курс", "курса", "курсов")} · от {shortestMonths(d)} мес
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        {directions.map((d) => (
          <section
            key={d.id}
            id={d.id}
            className="chapter"
            style={{ "--field": d.field } as React.CSSProperties}
            data-field-ink={d.ink}
          >
            <h2 className="display" data-reveal>
              {d.name}
            </h2>
            <div className="chapter-body">
              <p className="chapter-intro lead" data-reveal>
                {d.intro}
              </p>
              <ul className="courses">
                {d.courses.map((c) => (
                  <li key={c.title} className="course" data-reveal>
                    <div className="course-top">
                      <h3>{c.title}</h3>
                      <span className="price">{formatPrice(c.price)}</span>
                    </div>
                    <p>{c.description}</p>
                    <div className="course-foot">
                      <span className="small">
                        {c.months} мес · {c.format}
                      </span>
                      <CourseAsk title={c.title} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section className="how on-ink" id="how" data-field-ink="light">
          <div className="how-grid">
            <h2 className="head how-title" data-reveal>
              Как проходит обучение
            </h2>
            {stages.map((s) => (
              <div className="stage" key={s.title} data-reveal>
                <div className="tile" style={{ "--tile-bg": s.bg } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={s.alt} loading="lazy" decoding="async" />
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="faq" id="faq" data-field-ink="dark">
          <h2 className="head" data-reveal>
            Частые вопросы
          </h2>
          <div className="faq-list">
            {faq.map((item) => (
              <details key={item.q} name="faq" data-reveal>
                <summary>
                  {item.q}
                  <span className="plus" aria-hidden="true" />
                </summary>
                <p className="answer">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cta" data-field-ink="dark">
          <div className="cta-row">
            <div className="cta-side" aria-hidden="true" />
            <div className="cta-main" data-reveal>
              <h2>Не знаете, какой курс выбрать?</h2>
              <p>Задайте вопрос, и ассистент ответит по документам центра.</p>
              <AskForm />
            </div>
            <div className="cta-side">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/rs-42471-12-pcb-02.jpg"
                alt="Печатная плата 1970-х с электронными компонентами"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>
      </main>

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

      <ChatWidget />
      <Motion />
    </>
  );
}

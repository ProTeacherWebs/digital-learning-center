import { Suspense } from "react";
import AskForm from "@/components/AskForm";
import Catalog from "@/components/Catalog";
import ChatWidget from "@/components/ChatWidget";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";

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
    a: "Многие курсы можно проходить онлайн, у каждого курса указан формат: офлайн или офлайн и онлайн.",
  },
  {
    q: "Где посмотреть стоимость?",
    a: "Цена указана у курсов, для которых она известна. Остальное уточните у ассистента.",
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

        <Suspense fallback={<div className="catalog-fallback" />}>
          <Catalog />
        </Suspense>

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

      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>

      <ChatWidget />
    </>
  );
}

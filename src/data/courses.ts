// Sample content: course names, durations and prices are placeholders to be replaced by the centre.

export type Course = {
  title: string;
  description: string;
  months: number;
  format: string;
  price: number;
};

export type Direction = {
  id: string;
  name: string;
  intro: string;
  /** Flat field colour of the chapter and the ink used on it. */
  field: string;
  ink: "dark" | "light";
  courses: Course[];
};

export const directions: Direction[] = [
  {
    id: "marketing",
    name: "Маркетинг",
    intro:
      "Привлекать клиентов и считать результат: от первой рекламной кампании до стратегии продвижения бренда.",
    field: "var(--field-1)",
    ink: "dark",
    courses: [
      {
        title: "Интернет-маркетолог",
        description: "Каналы, воронки и аналитика: собираете маркетинговый план под реальный продукт.",
        months: 4,
        format: "онлайн",
        price: 39900,
      },
      {
        title: "SMM и контент",
        description: "Контент-план, тексты, визуал и работа с сообществом в соцсетях.",
        months: 2,
        format: "онлайн",
        price: 24900,
      },
      {
        title: "Таргет и контекстная реклама",
        description: "Запускаете и оптимизируете рекламу в основных рекламных кабинетах.",
        months: 3,
        format: "онлайн + практика",
        price: 29900,
      },
    ],
  },
  {
    id: "design",
    name: "Дизайн",
    intro:
      "Интерфейсы, графика и движение: учитесь делать так, чтобы продуктом было удобно и приятно пользоваться.",
    field: "var(--field-3)",
    ink: "dark",
    courses: [
      {
        title: "UX/UI-дизайн",
        description: "Исследования, прототипы и дизайн-системы в Figma, итоговый кейс для портфолио.",
        months: 5,
        format: "онлайн",
        price: 44900,
      },
      {
        title: "Графический дизайн",
        description: "Композиция, типографика и фирменный стиль: от логотипа до упаковки.",
        months: 4,
        format: "онлайн",
        price: 34900,
      },
      {
        title: "Motion-дизайн",
        description: "Анимация интерфейсов и роликов: ритм, тайминг и подготовка к монтажу.",
        months: 3,
        format: "онлайн",
        price: 32900,
      },
    ],
  },
  {
    id: "development",
    name: "Разработка",
    intro:
      "Пишете код, который работает: от сайтов и сервисов до автоматического тестирования.",
    field: "var(--field-4)",
    ink: "dark",
    courses: [
      {
        title: "Frontend-разработчик",
        description: "HTML, CSS, JavaScript и React: собираете несколько сайтов и одно приложение.",
        months: 6,
        format: "онлайн",
        price: 59900,
      },
      {
        title: "Python-разработчик",
        description: "Язык, базы данных и веб-сервисы: учебный проект от идеи до запуска.",
        months: 6,
        format: "онлайн",
        price: 59900,
      },
      {
        title: "Тестирование ПО",
        description: "Тест-дизайн, баг-репорты и основы автоматизации на реальных приложениях.",
        months: 3,
        format: "онлайн",
        price: 29900,
      },
    ],
  },
  {
    id: "analytics",
    name: "Аналитика",
    intro:
      "Данные становятся решениями: считаете метрики, строите отчёты и находите точки роста.",
    field: "var(--field-5)",
    ink: "dark",
    courses: [
      {
        title: "Аналитик данных",
        description: "SQL, Python и визуализация: от выгрузки данных до выводов для бизнеса.",
        months: 5,
        format: "онлайн",
        price: 49900,
      },
      {
        title: "SQL и BI",
        description: "Запросы, витрины и дашборды в BI-системах для ежедневной работы.",
        months: 2,
        format: "онлайн",
        price: 19900,
      },
      {
        title: "Веб-аналитика",
        description: "Настраиваете сбор данных на сайте и учитесь читать поведение пользователей.",
        months: 2,
        format: "онлайн",
        price: 22900,
      },
    ],
  },
  {
    id: "ai",
    name: "AI",
    intro:
      "Нейросети в работе: от повседневных задач до собственных ассистентов на ваших данных.",
    field: "var(--field-2)",
    ink: "dark",
    courses: [
      {
        title: "Нейросети для работы",
        description: "Тексты, изображения и таблицы: встраиваете нейросети в рабочие процессы.",
        months: 1,
        format: "онлайн",
        price: 14900,
      },
      {
        title: "Промпт-инжиниринг",
        description: "Учитесь формулировать задачи так, чтобы модель отвечала точно и предсказуемо.",
        months: 2,
        format: "онлайн",
        price: 19900,
      },
      {
        title: "Разработка AI-ассистентов",
        description: "RAG, подключение моделей и источников знаний: собираете своего ассистента.",
        months: 4,
        format: "онлайн + практика",
        price: 54900,
      },
    ],
  },
];

const rub = new Intl.NumberFormat("ru-RU");
export const formatPrice = (price: number) => `${rub.format(price)} ₽`;

export function pluralize(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const shortestMonths = (d: Direction) => Math.min(...d.courses.map((c) => c.months));

import { knowledge } from "./knowledge";

/** The workbook the site reads its courses from: sheet "Курсы" (and "Стоимость" for prices). */
const WORKBOOK = "proweb-ceny-i-prepodavateli.xlsx";

export type Course = {
  title: string;
  description: string;
  duration: string;
  age: string;
  format: string;
  /** Lowest price per block (about a month) over all tariffs, in sum. */
  price?: number;
};

export type Direction = {
  id: string;
  name: string;
  intro?: string;
  /** Flat field colour of the chapter. */
  field: string;
  courses: Course[];
};

const OTHER = "Другие курсы";

/** Order, text and colour of the known directions; anything else follows in order of appearance. */
const KNOWN: { name: string; intro: string }[] = [
  {
    name: "Маркетинг",
    intro: "Привлекать клиентов и считать результат: соцсети, реклама и продвижение.",
  },
  {
    name: "Дизайн",
    intro: "Графика, интерфейсы, видео и 3D: учитесь делать красиво и удобно.",
  },
  {
    name: "Разработка",
    intro: "Пишете код, который работает: сайты, сервисы, боты и тестирование.",
  },
  {
    name: "Аналитика",
    intro: "Данные становятся решениями: статистика, базы данных и машинное обучение.",
  },
  {
    name: "AI",
    intro: "Нейросети в работе: от идеи до готового цифрового продукта.",
  },
];

/** Direction of the courses that were in the workbook first; a "Направление" column overrides it. */
const DEFAULT_DIRECTION: Record<string, string> = {
  "Pro SMM": "Маркетинг",
  "Интернет маркетинг": "Маркетинг",
  "Pro Design": "Дизайн",
  "Motion design & Видеомонтаж": "Дизайн",
  Мобилография: "Дизайн",
  Blender: "Дизайн",
  "Дизайн интерьера и экстерьера": "Дизайн",
  "Frontend разработка": "Разработка",
  "Python (Backend разработка)": "Разработка",
  "QA Тестировщик": "Разработка",
  "Jr Системный администратор": "Разработка",
  "Аналитик данных": "Аналитика",
  "Data Science": "Аналитика",
  "AI-разработчик": "AI",
};

const FIELDS = ["var(--field-1)", "var(--field-3)", "var(--field-4)", "var(--field-5)", "var(--field-2)"];

let cache: { signature: string; directions: Direction[] } | null = null;

type Row = (name: string) => string;

async function readWorkbook(data: Buffer): Promise<Direction[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as unknown as ArrayBuffer);

  const rows = (sheetName: string): Row[] => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) return [];
    const headers: Record<string, number> = {};
    sheet.getRow(1).eachCell((cell, col) => (headers[cell.text.trim()] = col));
    const out: Row[] = [];
    sheet.eachRow((row, n) => {
      if (n > 1) out.push((name) => (headers[name] ? row.getCell(headers[name]).text.trim() : ""));
    });
    return out;
  };

  const minPrice = new Map<string, number>();
  for (const row of rows("Стоимость")) {
    const price = Number(row("Цена, сум").replace(/\s/g, ""));
    const title = row("Курс");
    if (title && price > 0) minPrice.set(title, Math.min(price, minPrice.get(title) ?? Infinity));
  }

  const byDirection = new Map<string, Course[]>();
  for (const row of rows("Курсы")) {
    const title = row("Курс");
    if (!title) continue;
    const direction = row("Направление") || DEFAULT_DIRECTION[title] || OTHER;
    const list = byDirection.get(direction) ?? [];
    list.push({
      title,
      description: row("Краткое описание"),
      duration: row("Длительность"),
      age: row("Мин. возраст"),
      format: row("Формат"),
      price: minPrice.get(title),
    });
    byDirection.set(direction, list);
  }

  const known = KNOWN.map((k) => k.name);
  const names = [
    ...known.filter((n) => byDirection.has(n)),
    ...[...byDirection.keys()].filter((n) => !known.includes(n) && n !== OTHER),
    ...(byDirection.has(OTHER) ? [OTHER] : []),
  ];
  return names.map((name, i) => ({
    id: `direction-${i + 1}`,
    name,
    intro: KNOWN.find((k) => k.name === name)?.intro,
    field: FIELDS[i % FIELDS.length],
    courses: byDirection.get(name)!,
  }));
}

/** Directions and their courses from the workbook; re-read whenever the file changes. */
export async function loadDirections(): Promise<Direction[]> {
  try {
    const file = await knowledge().file(WORKBOOK);
    if (!file) return cache?.directions ?? [];
    if (cache?.signature !== file.version) {
      cache = { signature: file.version, directions: await readWorkbook(file.buffer) };
    }
    return cache.directions;
  } catch (error) {
    // The file may be caught mid-save: keep showing the last good version.
    console.warn("[catalog] could not read the workbook:", error instanceof Error ? error.message : error);
    return cache?.directions ?? [];
  }
}

const rub = new Intl.NumberFormat("ru-RU");
export const formatPrice = (price: number) => `${rub.format(price)} сум`;

export function pluralize(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

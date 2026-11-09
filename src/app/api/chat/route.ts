import { GoogleGenAI } from "@google/genai";
import { search, type Hit } from "@/lib/rag";

const MIN_SCORE = 0.55;

const SYSTEM = `Ты ассистент учебного центра «Цифра» (курсы по маркетингу, дизайну, разработке, аналитике данных и AI).
Отвечай по-русски, коротко и по делу, только на основе приведённых фрагментов документов центра.
Если во фрагментах нет ответа, честно скажи, что такой информации у тебя нет, и предложи оставить заявку на сайте.
Ничего не выдумывай: ни цены, ни даты, ни условия.
Не упоминай источники, названия файлов и номера фрагментов.
Во фрагментах могут быть данные о разных курсах: отвечай только по тому курсу, о котором спросили, и не переноси цены, сроки и условия с других курсов.`;

type Message = { role: "user" | "assistant"; text: string };

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages?: Message[] };
  const question = messages?.at(-1)?.text?.trim();
  if (!messages || !question) return json({ error: "Пустой вопрос" }, 400);

  if (!process.env.GEMINI_API_KEY) {
    return json(
      { error: "Ассистент ещё не настроен: добавьте GEMINI_API_KEY в файл .env." },
      503,
    );
  }

  try {
    const { hits: found, indexing } = await search(question);
    const hits: Hit[] = found.filter((h) => h.score >= MIN_SCORE);
    if (found.length === 0 && indexing) {
      return json({
        answer:
          "Я ещё читаю документы центра, это займёт несколько минут. Повторите вопрос чуть позже.",
      });
    }
    if (hits.length === 0) {
      return json({
        answer:
          "В документах центра я не нашёл ответа на этот вопрос. Оставьте заявку на сайте, менеджер ответит лично.",
      });
    }

    const context = hits
      .map((h, i) => `[${i + 1}]\n${h.text}`)
      .join("\n\n");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      config: { systemInstruction: SYSTEM },
      contents: [
        ...messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
        {
          role: "user",
          parts: [{ text: `Фрагменты документов:\n${context}\n\nВопрос: ${question}` }],
        },
      ],
    });

    return json({ answer: response.text ?? "" });
  } catch (error) {
    console.error("chat failed", error);
    const message = error instanceof Error ? error.message : "";
    if (/\b429\b|RESOURCE_EXHAUSTED/.test(message)) {
      return json({ error: "Превышен лимит запросов Gemini. Подождите минуту и повторите." }, 429);
    }
    return json({ error: "Не удалось получить ответ. Попробуйте ещё раз позже." }, 500);
  }
}

import { eventState, json } from "../../../lib/server";
import { listEntries, storeEntry } from "../../../lib/entries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const event = await eventState();
    return json({ ...event, entries: event.status === "gallery" ? await listEntries() : [] });
  } catch {
    return json({ error: "Не удалось загрузить галерею" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    if ((await eventState()).status !== "collecting") {
      return json({ error: "Приём фотографий закрыт" }, 409);
    }
    const form = await request.formData();
    const photo = form.get("photo");
    const name = form.get("name");
    const text = form.get("text");
    if (!(photo instanceof File) || !photo.size || typeof name !== "string" || typeof text !== "string"
      || !name.trim() || !text.trim()) {
      return json({ error: "Нужны фотография, имя и пожелание" }, 400);
    }
    if (photo.size > 5 * 1024 * 1024) return json({ error: "Фотография больше 5 МБ" }, 413);
    if (!await storeEntry(photo, name.trim(), text.trim())) {
      return json({ error: "Приём фотографий уже завершён" }, 409);
    }
    return json({ ok: true }, 201);
  } catch {
    return json({ error: "Не удалось обработать или сохранить фотографию. Повторите отправку" }, 500);
  }
}

import { exclusive, eventState, saveTimer, json } from "../../../../lib/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { hours, minutes } = await request.json();
    const duration = hours * 60 + minutes;
    if (!Number.isSafeInteger(hours) || hours < 0 || !Number.isInteger(minutes)
      || minutes < 0 || minutes > 59 || duration <= 0
      || !Number.isSafeInteger(duration) || Date.now() + duration * 60000 > 8.64e15) {
      return json({ error: "Укажите целые часы от 0 и минуты от 0 до 59; длительность должна быть больше нуля" }, 400);
    }
    return await exclusive(async () => {
      if ((await eventState()).status === "collecting") return json({ error: "Сначала сбросьте таймер" }, 409);
      await saveTimer(new Date(Date.now() + duration * 60000).toISOString());
      return json(await eventState());
    });
  } catch {
    return json({ error: "Не удалось запустить таймер" }, 500);
  }
}

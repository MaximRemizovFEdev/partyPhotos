import { eventState, json } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await eventState());
  } catch {
    return json({ error: "Не удалось загрузить состояние мероприятия" }, 500);
  }
}

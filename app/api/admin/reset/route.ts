import { exclusive, saveTimer, eventState, json } from "../../../../lib/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    return await exclusive(async () => {
      await saveTimer(null);
      return json(await eventState());
    });
  } catch {
    return json({ error: "Не удалось сбросить таймер" }, 500);
  }
}

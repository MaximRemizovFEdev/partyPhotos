import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { EventState } from "./types";

export const dataDir = path.resolve(process.env.DATA_DIR || "data");

export async function eventState(): Promise<EventState> {
  await mkdir(dataDir, { recursive: true });
  let endsAt: string | null = null;
  try {
    ({ endsAt } = JSON.parse(await readFile(path.join(dataDir, "timer.json"), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const now = Date.now();
  return {
    status: !endsAt ? "waiting" : Date.parse(endsAt) > now ? "collecting" : "gallery",
    name: process.env.EVENT_NAME || "Один кадр",
    serverTime: new Date(now).toISOString(),
    endsAt,
  };
}

// One process: serialize timer changes and the final entry commit.
let pending = Promise.resolve();
export function exclusive<T>(action: () => Promise<T>): Promise<T> {
  const result = pending.then(action);
  pending = result.then(() => undefined, () => undefined);
  return result;
}

export async function saveTimer(endsAt: string | null) {
  await mkdir(dataDir, { recursive: true });
  const temporary = path.join(dataDir, `timer-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify({ endsAt }));
  await rename(temporary, path.join(dataDir, "timer.json"));
}

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

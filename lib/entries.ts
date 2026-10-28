import { mkdir, readdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { dataDir, eventState, exclusive } from "./server";
import type { Entry } from "./types";

export async function listEntries(): Promise<Entry[]> {
  const directories = await readdir(dataDir, { withFileTypes: true });
  const entries = await Promise.all(directories.filter((item) => item.isDirectory()).map(async (item) => {
    if (!/^[0-9a-f-]{36}$/.test(item.name)) return null;
    try {
      const directory = path.join(dataDir, item.name);
      await access(path.join(directory, "photo-min.jpg"));
      const info = JSON.parse(await readFile(path.join(directory, "info.json"), "utf8"));
      const metadata = await sharp(path.join(directory, "photo.jpg")).metadata();
      if (typeof info.name !== "string" || typeof info.text !== "string") return null;
      return {
        id: item.name, name: info.name, text: info.text,
        src: `/api/photos/${item.name}/full`, thumbnail: `/api/photos/${item.name}/min`,
        width: metadata.width!, height: metadata.height!,
      };
    } catch {
      return null;
    }
  }));
  return entries.filter((entry): entry is Entry => entry !== null);
}

export async function storeEntry(photo: File, name: string, text: string) {
  const input = Buffer.from(await photo.arrayBuffer());
  const image = sharp(input).rotate();
  const [full, min] = await Promise.all([
    image.clone().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
    image.clone().resize(400, 400, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer(),
  ]);
  return exclusive(async () => {
    if ((await eventState()).status !== "collecting") return false;
    const directory = path.join(dataDir, randomUUID());
    await mkdir(directory);
    await Promise.all([
      writeFile(path.join(directory, "photo.jpg"), full),
      writeFile(path.join(directory, "photo-min.jpg"), min),
    ]);
    await writeFile(path.join(directory, "info.json"), JSON.stringify({ name, text }));
    return true;
  });
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../../../../../lib/server";

export const runtime = "nodejs";

export async function GET(_request: Request, context: {
  params: Promise<{ id: string; variant: string }>;
}) {
  const { id, variant } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || !["full", "min"].includes(variant)) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(dataDir, id, variant === "full" ? "photo.jpg" : "photo-min.jpg"));
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

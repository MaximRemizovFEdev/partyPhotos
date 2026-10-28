import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

test("API: submission, image processing, expiry, restart and reset", { timeout: 120000 }, async () => {
  await mkdir(".test-data", { recursive: true });
  const directory = await mkdtemp(path.resolve(".test-data/run-"));
  const port = 3197;
  const base = `http://127.0.0.1:${port}`;
  let server;
  let logs = "";

  async function start() {
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
      env: { ...process.env, DATA_DIR: directory },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (data) => { logs += data; });
    server.stderr.on("data", (data) => { logs += data; });
    for (let i = 0; i < 100; i++) {
      try {
        const response = await fetch(`${base}/api/event`);
        if (response.ok) return;
      } catch { /* Wait for the server to bind. */ }
      if (server.exitCode !== null) throw new Error(logs);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Server did not start: ${logs}`);
  }

  async function stop() {
    if (!server || server.exitCode !== null) return;
    const closed = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await closed;
  }

  const get = async (route) => (await fetch(`${base}${route}`)).json();
  const admin = (action, body = {}) => fetch(`${base}/api/admin/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const jpeg = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "coral" } })
    .jpeg().toBuffer();
  function submit(bytes = jpeg, name = "  Максим  ", text = "  С днём рождения!\nСчастья!  ") {
    const form = new FormData();
    form.set("photo", new Blob([bytes], { type: "image/jpeg" }), "photo.jpg");
    form.set("name", name);
    form.set("text", text);
    return fetch(`${base}/api/entries`, { method: "POST", body: form });
  }

  try {
    await start();
    assert.equal((await get("/api/event")).status, "waiting");
    assert.equal((await fetch(`${base}/admin`)).status, 404);
    assert.equal((await fetch(`${base}/odmen`)).status, 200);
    assert.equal((await fetch(`${base}/api/admin/reset`, { method: "POST" })).status, 200);
    assert.equal((await submit()).status, 409);
    for (const body of [{ hours: 0, minutes: 0 }, { hours: -1, minutes: 5 }, { hours: 0, minutes: 60 }]) {
      assert.equal((await admin("start", body)).status, 400);
    }
    assert.equal((await admin("start", { hours: 25, minutes: 1 })).status, 200);
    assert.equal((await get("/api/event")).status, "collecting");
    assert.equal((await admin("start", { hours: 0, minutes: 1 })).status, 409);
    assert.equal((await submit(Buffer.from("broken"))).status, 500);
    assert.equal((await submit(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
    assert.equal((await submit(jpeg, "   ")).status, 400);
    assert.equal((await submit()).status, 201);
    const ids = (await readdir(directory)).filter((name) => name !== "timer.json");
    assert.equal(ids.length, 1);
    const info = JSON.parse(await readFile(path.join(directory, ids[0], "info.json"), "utf8"));
    assert.deepEqual({ ...info, text: info.text.replaceAll("\r\n", "\n") }, {
      name: "Максим", text: "С днём рождения!\nСчастья!",
    });
    for (const [filename, width] of [["photo.jpg", 2000], ["photo-min.jpg", 400]]) {
      const metadata = await sharp(path.join(directory, ids[0], filename)).metadata();
      assert.equal(metadata.width, width);
      assert.equal(metadata.format, "jpeg");
    }
    assert.deepEqual((await get("/api/entries")).entries, []);
    await stop();
    await start();
    assert.equal((await get("/api/event")).status, "collecting");
    assert.equal((await admin("reset")).status, 200);
    assert.equal((await get("/api/event")).status, "waiting");
    assert.deepEqual((await get("/api/entries")).entries, []);
    assert.equal((await readdir(directory)).includes(ids[0]), true);
    await admin("start", { hours: 0, minutes: 1 });
    // Small source stays small; server deliberately has no text length limit.
    const small = await sharp(jpeg).resize(100, 60).toBuffer();
    assert.equal((await submit(small, "Я".repeat(51), "Т".repeat(301))).status, 201);
    for (let i = 0; i < 28; i++) assert.equal((await submit(small)).status, 201);
    await mkdir(path.join(directory, "11111111-1111-4111-8111-111111111111"));
    await writeFile(path.join(directory, "timer.json"), JSON.stringify({
      endsAt: new Date(Date.now() + 1000).toISOString(),
    }));
    assert.equal((await get("/api/event")).status, "collecting");
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal((await get("/api/event")).status, "gallery");
    assert.equal((await submit()).status, 409);
    const galleryResponse = await fetch(`${base}/api/entries`);
    assert.equal(galleryResponse.headers.get("cache-control"), "no-store");
    const gallery = await galleryResponse.json();
    assert.equal(gallery.entries.length, 30);
    const entry = gallery.entries.find((entry) => entry.id === ids[0]);
    assert.equal(entry.width, 2000);
    assert.equal(gallery.entries.filter((entry) => entry.width === 100).length, 29);
    const image = await fetch(`${base}${entry.thumbnail}`);
    assert.equal(image.headers.get("content-type"), "image/jpeg");
    assert.match(image.headers.get("cache-control"), /immutable/);
    assert.equal((await fetch(`${base}/api/photos/${ids[0]}/invalid`)).status, 404);
    await stop();
    await start();
    assert.equal((await get("/api/event")).status, "gallery");
    assert.equal((await get("/api/entries")).entries.length, 30);
    await admin("reset");
    assert.equal((await get("/api/event")).status, "waiting");
    assert.deepEqual((await get("/api/entries")).entries, []);
    assert.equal((await readdir(directory)).filter((name) => !name.endsWith(".json")).length, 31);
  } finally {
    await stop();
    console.log(`Isolated test data: ${directory}`);
  }
});

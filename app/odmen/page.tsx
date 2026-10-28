"use client";

import { useState } from "react";
import { formatTime, requestJson, useEvent } from "../../lib/client";

const labels = { waiting: "Ожидание старта", collecting: "Приём фотографий", gallery: "Галерея открыта" };

export default function Admin() {
  const { event, error, remaining, refresh } = useEvent();
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function action(type: "start" | "reset") {
    setBusy(true);
    setMessage("");
    try {
      await requestJson(`/api/admin/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: Number(hours), minutes: Number(minutes) }),
      });
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell narrow">
    <p className="eyebrow">Один кадр / управление</p>
    <h1>Таймер праздника</h1>
    <p>Статус: {event ? labels[event.status] : "Загрузка…"}</p>
    <p className="admin-time">{formatTime(remaining)}</p>
    {(error || message) && <p role="alert">{message || error}</p>}
    <form className="panel" onSubmit={(event) => { event.preventDefault(); void action("start"); }}>
      <label>Часы<input type="number" min="0" step="1" required value={hours}
        onChange={(event) => setHours(event.target.value)} /></label>
      <label>Минуты<input type="number" min="0" max="59" step="1" required value={minutes}
        onChange={(event) => setMinutes(event.target.value)} /></label>
      <button disabled={busy || !event || event.status === "collecting"}>Старт</button>
      <button type="button" className="secondary" disabled={busy || !event}
        onClick={() => void action("reset")}>Сбросить таймер</button>
      <small>Сброс сохраняет фотографии и отметки участия гостей.</small>
    </form>
    <a href="/">На страницу гостей</a>
  </main>;
}

"use client";

import { useRef, useState } from "react";
import Camera from "./Camera";
import { requestJson } from "../lib/client";

export const participationKey = "partyPhoto";

export default function ParticipationForm({ open, onSuccess, refresh }: {
  open: boolean;
  onSuccess: () => void;
  refresh: () => Promise<void>;
}) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState("");
  const valid = photo && name.trim() && text.trim() && name.length <= 50 && text.length <= 300;

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !open || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("photo", photo!, "photo.jpg");
      form.set("name", name.trim());
      form.set("text", text.trim());
      await requestJson("/api/entries", { method: "POST", body: form });
      try { localStorage.setItem(participationKey, "done"); } catch { /* Storage may be disabled. */ }
      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось отправить. Попробуйте ещё раз.");
      void refresh();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return <form className="panel" onSubmit={send}>
    <div className="assignment">
      <h2>Сделай фото, которое имениннице будет приятно пересмотреть через год, и оставь пожелание.</h2>
      <p>Один кадр. Все фотографии откроются, когда закончится таймер.</p>
    </div>
    <Camera onCapture={setPhoto} />
    <label htmlFor="wish">Пожелание <span>{text.length}/300</span></label>
    <textarea id="wish" required maxLength={300} rows={4} value={text}
      placeholder="Что хочется пожелать и запомнить?" onChange={(event) => setText(event.target.value)} />
    <label htmlFor="name">Ваше имя <span>{name.length}/50</span></label>
    <input id="name" required maxLength={50} value={name} autoComplete="given-name"
      placeholder="Как вас зовут?" onChange={(event) => setName(event.target.value)} />
    <p className="privacy">
      После окончания таймера ваше фото, имя и пожелание будут видны всем,
      у кого есть ссылка на мероприятие.
    </p>
    {error && <p role="alert">{error}</p>}
    {!open && <p role="status">Время вышло. Уточняем статус мероприятия…</p>}
    <button disabled={!valid || !open || busy}>{busy ? "Отправляем…" : "Отправить"}</button>
  </form>;
}

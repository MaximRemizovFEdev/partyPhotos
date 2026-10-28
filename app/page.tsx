"use client";

import { useEffect, useState } from "react";
import { useEvent } from "../lib/client";
import Timer from "../components/Timer";
import ParticipationForm, { participationKey } from "../components/ParticipationForm";
import Gallery from "../components/Gallery";

export default function Home() {
  const { event, remaining, error, refresh } = useEvent();
  const [participated, setParticipated] = useState<boolean | null>(null);
  useEffect(() => {
    try { setParticipated(localStorage.getItem(participationKey) === "done"); }
    catch { setParticipated(false); }
  }, []);

  return <main className={`shell ${event?.status === "gallery" ? "wide" : "narrow"}`}>
    <header>
      <p className="eyebrow">На память о нашем празднике</p>
      <h1>{event?.name || "Один кадр"}<span className="title-dot">.</span></h1>
      <p className="intro">Мгновение сегодня. Тёплое воспоминание навсегда.</p>
    </header>
    {error && <div className="notice" role="alert"><p>{error}</p>
      <button className="secondary" onClick={() => void refresh()}>Повторить</button></div>}
    {!event && !error && <p role="status">Загрузка…</p>}
    {event?.status === "waiting" && <section className="panel waiting">
      <span className="spark" aria-hidden="true">✳</span>
      <h2>Приём фотографий скоро начнётся</h2>
      <p>Оставьте эту страницу открытой — праздник начнётся здесь.</p>
    </section>}
    {event?.status === "collecting" && <>
      <Timer remaining={remaining} />
      {participated === true && <section className="panel waiting">
        <span className="spark" aria-hidden="true">✓</span>
        <h2>Ваш кадр сохранён</h2>
        <p>Спасибо за тёплые слова! Все фотографии откроются после окончания таймера.</p>
      </section>}
      {participated === false && <ParticipationForm open={remaining > 0}
        refresh={refresh} onSuccess={() => setParticipated(true)} />}
    </>}
    {event?.status === "gallery" && <section className="gallery">
      <p className="eyebrow">Наши моменты вместе</p>
      <h2>Праздник в ваших кадрах</h2>
      <Gallery />
    </section>}
    <footer>Один кадр · С любовью к моментам</footer>
  </main>;
}

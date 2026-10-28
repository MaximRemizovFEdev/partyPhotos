"use client";

import { useEffect, useState } from "react";

export default function ClearStorage() {
  const [status, setStatus] = useState("Очищаем localStorage…");

  useEffect(() => {
    try {
      localStorage.clear();
      setStatus("localStorage очищен. Можно участвовать заново.");
    } catch {
      setStatus("Не удалось очистить localStorage. Проверьте настройки браузера.");
    }
  }, []);

  return <main className="shell narrow">
    <section className="panel waiting">
      <h1>Очистка данных</h1>
      <p role="status">{status}</p>
      <a href="/">На главную</a>
    </section>
  </main>;
}

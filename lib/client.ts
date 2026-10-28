"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventState } from "./types";

export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Не удалось выполнить запрос");
  return data;
}

export function useEvent() {
  const [event, setEvent] = useState<EventState | null>(null);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  const anchor = useRef({ at: 0, remaining: 0 });
  const active = useRef(false);
  const loading = useRef(false);
  const refresh = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const data = await requestJson<EventState>("/api/event");
      if (!active.current) return;
      const milliseconds = data.endsAt ? Math.max(0, Date.parse(data.endsAt) - Date.parse(data.serverTime)) : 0;
      anchor.current = { at: performance.now(), remaining: milliseconds };
      setRemaining(milliseconds);
      setEvent(data);
      setError("");
    } catch {
      if (active.current) setError("Не удалось обновить статус. Проверьте соединение и повторите попытку.");
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    active.current = true;
    void refresh();
    const poll = setInterval(refresh, 5000);
    const tick = setInterval(() => {
      const value = Math.max(0, anchor.current.remaining - (performance.now() - anchor.current.at));
      setRemaining(value);
      if (anchor.current.remaining > 0 && value === 0) {
        anchor.current.remaining = 0;
        void refresh();
      }
    }, 1000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active.current = false;
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  return { event, error, remaining, refresh };
}

export function formatTime(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, "0")).join(":");
}

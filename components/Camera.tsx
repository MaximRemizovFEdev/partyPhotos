"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function Camera({ onCapture }: { onCapture: (photo: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [preview, setPreview] = useState("");

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    const current = ++generation.current;
    stop();
    setBusy(true);
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unavailable");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } }, audio: false,
      });
      if (current !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (current === generation.current) setMultiple(devices.filter((d) => d.kind === "videoinput").length > 1);
    } catch {
      if (current === generation.current) {
        stop();
        setError("Не удалось включить камеру. Разрешите доступ в браузере и попробуйте ещё раз.");
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, [facing, stop]);

  useEffect(() => {
    void start();
    const leave = () => { ++generation.current; stop(); };
    window.addEventListener("pagehide", leave);
    return () => {
      ++generation.current;
      stop();
      window.removeEventListener("pagehide", leave);
    };
  }, [start, stop]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function capture() {
    const element = video.current;
    if (!element?.videoWidth || !ready || busy) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext("2d")!.drawImage(element, 0, 0);
    canvas.toBlob((blob) => {
      setBusy(false);
      if (!blob) { setError("Не удалось сделать фото. Повторите попытку."); return; }
      setPreview(URL.createObjectURL(blob));
      stop();
      onCapture(blob);
    }, "image/jpeg");
  }

  return <section className="camera" aria-label="Камера">
    <div className="viewfinder">
      {preview ? <img src={preview} alt="Ваш единственный кадр" /> :
        <video ref={video} autoPlay muted playsInline onLoadedData={() => setReady(true)} />}
      <span className="frame-label">{preview ? "Кадр сделан" : "Один момент. Один кадр."}</span>
    </div>
    {error && <p role="alert">{error}</p>}
    {!preview && <div className="camera-actions">
      {!ready && <button type="button" disabled={busy} onClick={() => void start()}>
        {busy ? "Включаем камеру…" : "Включить камеру"}
      </button>}
      {ready && <button type="button" disabled={busy} onClick={capture}>Сделать фото</button>}
      {multiple && <button type="button" className="secondary" disabled={busy}
        onClick={() => setFacing(facing === "user" ? "environment" : "user")}>Переключить камеру</button>}
    </div>}
    {preview && <small>Этот момент уже пойман. Теперь оставьте тёплые слова.</small>}
  </section>;
}

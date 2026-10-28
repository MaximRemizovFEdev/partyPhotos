"use client";

import { useEffect, useState } from "react";
import { MasonryPhotoAlbum } from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "react-photo-album/masonry.css";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { requestJson } from "../lib/client";
import type { Entry } from "../lib/types";

export default function Gallery() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    requestJson<{ entries: Entry[] }>("/api/entries")
      .then((data) => { if (active) setEntries(data.entries); })
      .catch(() => { if (active) setError("Не удалось загрузить фотографии."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  if (loading) return <p role="status">Собираем ваши воспоминания…</p>;
  if (error) return <div role="alert"><p>{error}</p>
    <button onClick={() => setAttempt(attempt + 1)}>Повторить загрузку</button></div>;
  if (!entries.length) return <p>Пока никто не оставил фотографию</p>;

  return <>
    <MasonryPhotoAlbum
      photos={entries.map((entry) => ({ ...entry, src: entry.thumbnail, alt: `Фото: ${entry.name}` }))}
      columns={(width) => width < 760 ? 2 : width < 1000 ? 3 : 4}
      spacing={16}
      onClick={({ index }) => setIndex(index)}
      componentsProps={{ image: { loading: "lazy" } }}
    />
    <Lightbox
      open={index >= 0}
      index={index}
      close={() => setIndex(-1)}
      slides={entries.map((entry) => ({
        src: entry.src, width: entry.width, height: entry.height,
        title: entry.name, description: entry.text,
      }))}
      plugins={[Captions]}
      captions={{ descriptionMaxLines: 301 }}
      carousel={{ preload: 1 }}
      labels={{ Close: "Закрыть", Previous: "Предыдущее фото", Next: "Следующее фото" }}
    />
  </>;
}

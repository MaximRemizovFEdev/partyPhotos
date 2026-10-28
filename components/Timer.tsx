import { formatTime } from "../lib/client";

export default function Timer({ remaining }: { remaining: number }) {
  return <div className="timer">
    <span>До открытия фотографий</span>
    <strong role="timer">{formatTime(remaining)}</strong>
    <small>Успейте отправить до окончания отсчёта</small>
  </div>;
}

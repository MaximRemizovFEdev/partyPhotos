export type EventState = {
  status: "waiting" | "collecting" | "gallery";
  name: string;
  serverTime: string;
  endsAt: string | null;
};

export type Entry = {
  id: string;
  name: string;
  text: string;
  src: string;
  thumbnail: string;
  width: number;
  height: number;
};

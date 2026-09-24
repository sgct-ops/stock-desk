export type Stats = {
  on: { products: number; sizes: number };
  off: { products: number; sizes: number };
  watch: { products: number; sizes: number };
  ok: { products: number; sizes: number };
  short: number;
};
export type Person = { uid: string; name: string; email: string };
export type Report = {
  code: string;        // DDMMYY-NN, e.g. 240926-01
  date: string;        // YYYY-MM-DD (report date, from the .md front matter)
  seq: number;         // NN
  title: string;
  md: string;
  fileName: string;
  stats: Stats;
  uploadedAt: number;  // ms since epoch
  uploadedBy: Person;
};
export type Note = { id: string; text: string; at: number; by: Person };

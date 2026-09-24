/** Report codes are DDMMYY-NN: the report's date plus a 2-digit upload number for that date.
 *  24 Sep 2026, first upload → 240926-01; a second upload for the same date → 240926-02. */
export function dayKey(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`Bad date ${isoDate}`);
  return `${m[3]}${m[2]}${m[1].slice(2)}`;
}
export function makeCode(isoDate: string, seq: number): string {
  return `${dayKey(isoDate)}-${String(seq).padStart(2, '0')}`;
}
export function parseCode(code: string): { date: string; seq: number } | null {
  const m = code.match(/^(\d{2})(\d{2})(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { date: `20${m[3]}-${m[2]}-${m[1]}`, seq: Number(m[4]) };
}
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

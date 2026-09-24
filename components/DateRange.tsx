'use client';
import { addDays, todayIso } from '@/lib/codes';

export type Range = { from: string; to: string };
const PRESETS: { label: string; days: number }[] = [
  { label: 'Today', days: 1 }, { label: 'Last 5 days', days: 5 }, { label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 },
];

export function presetRange(days: number): Range { const to = todayIso(); return { from: addDays(to, -(days - 1)), to }; }

export default function DateRange({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="filters">
      <label className="field"><span>From</span>
        <input type="date" id="from" value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} />
      </label>
      <label className="field"><span>To</span>
        <input type="date" id="to" value={value.to} min={value.from} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} />
      </label>
      <div className="presets" role="group" aria-label="Quick ranges">
        {PRESETS.map((p) => {
          const r = presetRange(p.days);
          const on = r.from === value.from && r.to === value.to;
          return <button key={p.label} type="button" className="pill" aria-pressed={on} onClick={() => onChange(r)}>{p.label}</button>;
        })}
      </div>
    </div>
  );
}

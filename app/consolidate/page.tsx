'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { useAuth } from '@/components/Auth';
import { useSync } from '@/components/Sync';
import DateRange, { presetRange, type Range } from '@/components/DateRange';
import { listReports } from '@/lib/reports';
import { consolidate, toMarkdown, BASKETS, type Basket, type Item } from '@/lib/consolidate';
import { fmtDate, renderSheet } from '@/lib/render';
import { downloadText } from '@/lib/download';
import type { Report } from '@/lib/types';

const META: Record<Basket, { label: string; c: string }> = {
  on: { label: 'Switch ON', c: 'var(--on)' }, off: { label: 'Switch OFF', c: 'var(--off)' },
  watch: { label: 'Watch', c: 'var(--warn)' }, ok: { label: 'Correctly set', c: 'var(--ok)' },
};
const numCls = (v: string) => (parseFloat(v) < 0 ? 'num neg' : 'num');

function History({ it }: { it: Item }) {
  return <span className="hist" title={it.history.map((h) => META[h].label).join(' → ')}>{it.history.map((h, i) => <i key={i} className={h} />)}</span>;
}

function Consolidate() {
  const params = useSearchParams();
  const { tick } = useSync();
  const [range, setRange] = useState<Range>(() => {
    const f = params.get('from'), t = params.get('to');
    return f && t ? { from: f, to: t } : presetRange(5);
  });
  const [latestOnly, setLatestOnly] = useState(true);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [err, setErr] = useState('');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    setReports(null); setErr('');
    history.replaceState(null, '', `?from=${range.from}&to=${range.to}`);
    listReports(range.from, range.to).then(setReports).catch(() => setErr('Couldn’t load reports for this range.'));
  }, [range.from, range.to, tick]);

  // When a date has several uploads, "latest per day" keeps only the last one (highest -NN).
  const used = useMemo(() => {
    if (!reports) return [];
    if (!latestOnly) return reports;
    const last = new Map<string, Report>();
    reports.forEach((r) => { const p = last.get(r.date); if (!p || r.seq > p.seq) last.set(r.date, r); });
    return [...last.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [reports, latestOnly]);
  const c = useMemo(() => consolidate(used), [used]);
  const md = useMemo(() => (used.length ? toMarkdown(c, range.from, range.to) : ''), [c, used.length, range]);

  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => { window.print(); setPrinting(false); }, 150);
    return () => clearTimeout(t);
  }, [printing]);

  return (
    <>
      <div className="page-h"><h1>Consolidate</h1><span className="meta">Merge reports over a date range into one list of unique product sizes</span></div>
      <DateRange value={range} onChange={setRange} />
      <div className="bar" style={{ paddingTop: 0 }}>
        <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
          <input type="checkbox" id="latest" checked={latestOnly} onChange={(e) => setLatestOnly(e.target.checked)} />
          Use only the latest upload for each day
        </label>
        <span className="spacer" />
        <button className="btn" type="button" disabled={!md} onClick={() => downloadText(`stock-report-consolidated-${range.from}_to_${range.to}.md`, md)}>Download consolidated .md</button>
        <button className="btn primary" type="button" disabled={!md} onClick={() => setPrinting(true)}>Print for Karan</button>
      </div>
      {err && <div className="status err">{err}</div>}
      {!reports && !err && <p className="meta">Loading…</p>}
      {reports && !used.length && <div className="empty"><h2>No reports between {fmtDate(range.from)} and {fmtDate(range.to)}</h2><p>Pick another range or <Link href="/">upload a report</Link>.</p></div>}
      {used.length > 0 && (
        <>
          <div className="kpis">
            <div className="kpi" style={{ ['--c' as any]: 'var(--accent)' }}><span className="n">{used.length}</span><span className="l">Reports merged</span><span className="s">{c.dates.length} days · {used.map((r) => r.code).join(', ')}</span></div>
            <div className="kpi" style={{ ['--c' as any]: 'var(--muted)' }}><span className="n">{c.occurrences}</span><span className="l">Product-size rows</span><span className="s">across all reports</span></div>
            <div className="kpi" style={{ ['--c' as any]: 'var(--warn)' }}><span className="n">{c.duplicates}</span><span className="l">Duplicates removed</span><span className="s">same size seen on more than one day</span></div>
            <div className="kpi" style={{ ['--c' as any]: 'var(--on)' }}><span className="n">{c.items.length}</span><span className="l">Unique sizes</span><span className="s">{c.moved.length} changed basket · {c.resolved.length} dropped out</span></div>
          </div>
          <p className="meta" style={{ marginTop: -8, marginBottom: 20 }}>Each size appears once. When it was in more than one report, the most recent report decides its basket and stock. The coloured squares show its basket on each day, oldest first.</p>
          {BASKETS.map((k) => c.byBasket[k].length > 0 && (
            <section className="sec" key={k} style={{ ['--c' as any]: META[k].c }}>
              <h2><span className="dot" />{META[k].label} <span className="count">{c.byBasket[k].length} unique sizes</span></h2>
              <div className="tbl-wrap"><table>
                <thead><tr><th>Product</th><th>Size</th><th>Stock (latest)</th><th>{k === 'off' ? 'Next PO' : 'PO · ETA'}</th><th>Seen</th><th>First seen</th><th>Last report</th><th>History</th></tr></thead>
                <tbody>{c.byBasket[k].map((it) => (
                  <tr key={it.key}>
                    <td className="prod">{it.product}</td>
                    <td><span className="sz">{it.size}</span></td>
                    <td className={numCls(it.stock)}>{it.stock}</td>
                    <td>{k === 'off' ? (it.row['next po'] || '') : [it.row.po, it.row.eta].filter(Boolean).join(' · ')}</td>
                    <td className="num">{it.days.length} of {c.dates.length}</td>
                    <td className="meta">{fmtDate(it.firstSeen)}</td>
                    <td><Link className="code" href={`/report/?code=${it.lastCode}`}>{it.lastCode}</Link></td>
                    <td><History it={it} /></td>
                  </tr>
                ))}</tbody>
              </table></div>
            </section>
          ))}
          {printing && <div className="sheet-wrap" dangerouslySetInnerHTML={{ __html: renderSheet({ md }) }} />}
        </>
      )}
    </>
  );
}

function Guard() {
  const { role } = useAuth();
  if (!role?.canConsolidate) return <div className="empty" style={{ marginTop: 24 }}><h2>Consolidation is for Shantanu only</h2><p><Link href="/">Back to reports</Link></p></div>;
  return <Consolidate />;
}

export default function Page() {
  return <Shell><Suspense fallback={<p className="meta">Loading…</p>}><Guard /></Suspense></Shell>;
}

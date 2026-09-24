'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { useAuth } from '@/components/Auth';
import { useSync } from '@/components/Sync';
import { watchReports } from '@/lib/reports';
import { addDays, todayIso } from '@/lib/codes';
import { fmtDate, renderSheet } from '@/lib/render';
import type { Report } from '@/lib/types';

/** Karan's one-page A4 summary: pick a report (latest by default) and print it. */
function Karan() {
  const params = useSearchParams();
  const { tick } = useSync();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [code, setCode] = useState<string>(params.get('code') || '');
  const [err, setErr] = useState('');

  useEffect(() => {
    const to = todayIso();
    return watchReports(addDays(to, -89), to, (list) => {
      setReports(list);
      setCode((c) => (c && list.some((r) => r.code === c) ? c : list[0]?.code || ''));
    }, () => setErr('Couldn’t load reports. Check your connection and refresh.'));
  }, [tick]);

  const rec = reports?.find((r) => r.code === code) || null;
  const pick = (c: string) => { setCode(c); history.replaceState(null, '', `?code=${c}`); };

  return (
    <>
      <div className="page-h"><h1>Karan</h1><span className="meta">One-page A4 summary to print or save as PDF</span></div>
      <div className="bar">
        <label className="meta" htmlFor="kpick" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 12 }}>Report</label>
        <select id="kpick" value={code} disabled={!reports?.length} onChange={(e) => pick(e.target.value)}>
          {!reports?.length && <option value="">No reports yet</option>}
          {reports?.map((r) => <option key={r.code} value={r.code}>{r.code} · {fmtDate(r.date)}</option>)}
        </select>
        {rec && <Link className="meta" href={`/report/?code=${rec.code}#shantanu`}>Open full report</Link>}
        <span className="spacer" />
        <button className="btn primary" type="button" disabled={!rec} onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      {err && <div className="status err">{err}</div>}
      {!reports && !err && <p className="meta">Loading…</p>}
      {reports && !reports.length && <div className="empty"><h2>No reports in the last 90 days</h2><p><Link href="/">Upload one on Reports</Link>.</p></div>}
      {rec && (
        <>
          <p className="meta">In the print dialog choose A4, margins None, and turn on background graphics.</p>
          <div className="sheet-wrap" dangerouslySetInnerHTML={{ __html: renderSheet(rec) }} />
        </>
      )}
    </>
  );
}

function Guard() {
  const { role } = useAuth();
  if (!role?.views.includes('karan')) return <div className="empty" style={{ marginTop: 24 }}><h2>This page isn’t available on your login</h2><p><Link href="/">Back to reports</Link></p></div>;
  return <Karan />;
}

export default function Page() {
  return <Shell><Suspense fallback={<p className="meta">Loading…</p>}><Guard /></Suspense></Shell>;
}

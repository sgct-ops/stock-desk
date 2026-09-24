'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import Notes from '@/components/Notes';
import { useAuth } from '@/components/Auth';
import { deleteReport, getReport } from '@/lib/reports';
import { fmtDate, renderReport, renderSheet } from '@/lib/render';
import { downloadText } from '@/lib/download';
import type { Report } from '@/lib/types';

import type { View } from '@/lib/roles';
const ALL_VIEWS: { id: View; name: string; sub: string }[] = [
  { id: 'shantanu', name: 'Shantanu', sub: 'Review & notes' },
  { id: 'kabir', name: 'Kabir', sub: 'Review & notes' },
  { id: 'karan', name: 'Karan', sub: 'Print summary' },
];

function ReportPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const VIEWS = ALL_VIEWS.filter((v) => role?.views.includes(v.id));
  const code = params.get('code') || '';
  const [rec, setRec] = useState<Report | null | undefined>(undefined);
  const [view, setView] = useState<View>(role?.views[0] ?? 'kabir');
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => { const h = window.location.hash.slice(1) as View; if (VIEWS.some((v) => v.id === h)) setView(h); }, []);
  useEffect(() => { setRec(undefined); if (code) getReport(code).then(setRec).catch(() => setRec(null)); else setRec(null); }, [code]);
  const pick = (v: View) => { setView(v); history.replaceState(null, '', `?code=${code}#${v}`); };

  if (rec === undefined) return <p className="meta" style={{ paddingTop: 24 }}>Loading {code}…</p>;
  if (!rec) return <div className="empty" style={{ marginTop: 24 }}><h2>Report {code || ''} not found</h2><p><Link href="/">Back to all reports</Link></p></div>;

  return (
    <>
      <div className="page-h">
        <h1><span className="code" style={{ fontSize: 'inherit' }}>{rec.code}</span></h1>
        <span className="meta">{fmtDate(rec.date)} · uploaded {new Date(rec.uploadedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} by {rec.uploadedBy?.name}</span>
      </div>
      <div className="bar">
        <nav className="tabs" role="tablist" aria-label="Views" style={{ marginLeft: 0 }}>
          {VIEWS.map((v) => (
            <button key={v.id} className="tab" role="tab" aria-selected={view === v.id} onClick={() => pick(v.id)}><b>{v.name}</b><small>{v.sub}</small></button>
          ))}
        </nav>
        <span className="spacer" />
        <div className="row-actions">
          <button className="btn" type="button" onClick={() => downloadText(`stock-report-${rec.code}.md`, rec.md)}>Download .md</button>
          {view === 'karan' && <button className="btn primary" type="button" onClick={() => window.print()}>Print / Save as PDF</button>}
          {role?.canDelete && user?.uid === rec.uploadedBy?.uid && (confirmDel
            ? <><button className="btn" type="button" style={{ color: 'var(--off)', borderColor: 'var(--off)' }} onClick={async () => { await deleteReport(rec.code); router.push('/'); }}>Delete {rec.code} for everyone</button><button className="btn" type="button" onClick={() => setConfirmDel(false)}>Keep it</button></>
            : <button className="btn" type="button" onClick={() => setConfirmDel(true)}>Delete</button>)}
        </div>
      </div>
      {!VIEWS.some((v) => v.id === view) ? null : view !== 'karan' ? (
        <div className="grid">
          <div dangerouslySetInnerHTML={{ __html: renderReport(rec) }} />
          <Notes code={rec.code} />
        </div>
      ) : (
        <>
          <p className="meta">One A4 page. In the print dialog choose A4, margins None, and turn on background graphics.</p>
          <div className="sheet-wrap" dangerouslySetInnerHTML={{ __html: renderSheet(rec) }} />
        </>
      )}
    </>
  );
}

export default function Page() {
  return <Shell><Suspense fallback={<p className="meta">Loading…</p>}><ReportPage /></Suspense></Shell>;
}

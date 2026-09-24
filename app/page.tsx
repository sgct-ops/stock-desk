'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import Upload from '@/components/Upload';
import { useAuth } from '@/components/Auth';
import DateRange, { presetRange, type Range } from '@/components/DateRange';
import { watchReports } from '@/lib/reports';
import { fmtDate } from '@/lib/render';
import type { Report } from '@/lib/types';

export default function Home() {
  const { role } = useAuth();
  const [range, setRange] = useState<Range>(() => presetRange(30));
  const [reports, setReports] = useState<Report[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { setReports(null); setErr(''); return watchReports(range.from, range.to, setReports, () => setErr('Couldn’t load reports. Check your connection and refresh.')); }, [range.from, range.to]);
  const days = reports ? new Set(reports.map((r) => r.date)).size : 0;

  return (
    <Shell>
      <div className="page-h"><h1>Reports</h1><span className="meta">Every uploaded report, by code and date</span></div>
      {role?.canUpload && <Upload />}
      <DateRange value={range} onChange={setRange} />
      <div className="bar" style={{ paddingTop: 0 }}>
        <span className="meta">{reports ? `${reports.length} report${reports.length === 1 ? '' : 's'} across ${days} day${days === 1 ? '' : 's'}` : 'Loading…'}</span>
        <span className="spacer" />
        {role?.canConsolidate && reports && reports.length > 1 && <Link className="btn" href={`/consolidate/?from=${range.from}&to=${range.to}`}>Consolidate these {reports.length}</Link>}
      </div>
      {err && <div className="status err">{err}</div>}
      {reports && !reports.length && <div className="empty"><h2>No reports in this range</h2><p>{role?.canUpload ? 'Pick a wider range, or upload a report above.' : 'Pick a wider range. New reports appear here as soon as Shantanu uploads them.'}</p></div>}
      {reports && reports.length > 0 && (
        <div className="tbl-wrap list">
          <table>
            <thead><tr><th>Code</th><th>Report date</th><th>Baskets (sizes)</th><th>Orders short</th><th>Uploaded</th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.code}>
                  <td><Link className="code" href={`/report/?code=${r.code}#${role?.views[0] ?? ''}`}>{r.code}</Link></td>
                  <td>{fmtDate(r.date)}</td>
                  <td><div className="counts">
                    <span className="cnt on" title="Switch ON">ON {r.stats.on.sizes}</span>
                    <span className="cnt off" title="Switch OFF">OFF {r.stats.off.sizes}</span>
                    <span className="cnt watch" title="Watch">Watch {r.stats.watch.sizes}</span>
                    <span className="cnt ok" title="Correctly set">OK {r.stats.ok.sizes}</span>
                  </div></td>
                  <td className="num">{r.stats.short}</td>
                  <td className="meta">{new Date(r.uploadedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {r.uploadedBy?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

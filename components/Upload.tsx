'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { uploadReport } from '@/lib/reports';
import { useAuth } from './Auth';
import type { Report } from '@/lib/types';

export default function Upload() {
  const { user, role } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'good' | 'err'; text: string; rec?: Report } | null>(null);

  async function handle(file: File) {
    if (!user || !role?.canUpload) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) { setMsg({ kind: 'err', text: 'Choose the daily .md report file.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const md = await file.text();
      const rec = await uploadReport(md, file.name, user);
      setMsg({ kind: 'good', text: `Saved as ${rec.code}: ${rec.stats.on.sizes} to switch ON, ${rec.stats.off.sizes} to switch OFF, ${rec.stats.watch.sizes} to watch.`, rec });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.code === 'permission-denied' ? 'Only shantanu@carbontree.com can upload reports.' : (e?.message || 'Upload didn’t save. Try again.') });
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className={'drop' + (over ? ' over' : '')}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}>
        <div className="txt">
          <h3>Upload a report</h3>
          <p>Drop the daily <code>.md</code> file here, or choose it. Each upload gets its own code from the report date and upload number, e.g. <span className="code">240926-01</span>. A second upload for the same date becomes <span className="code">240926-02</span>; nothing is overwritten.</p>
        </div>
        <input ref={input} type="file" id="file" accept=".md,.markdown,text/markdown,text/plain" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ''; }} />
        <button className="btn primary" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Saving…' : 'Choose .md file'}</button>
      </div>
      {msg && (
        <div className={'status ' + msg.kind} role="status" style={{ marginBottom: 18 }}>
          <span>{msg.text}</span>
          {msg.rec && <Link href={`/report/?code=${msg.rec.code}`}>Open {msg.rec.code}</Link>}
        </div>
      )}
    </>
  );
}

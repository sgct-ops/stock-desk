'use client';
import { useEffect, useState } from 'react';
import { addNote, watchNotes } from '@/lib/reports';
import { useAuth } from './Auth';
import type { Note } from '@/lib/types';

export default function Notes({ code }: { code: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => watchNotes(code, setNotes), [code]);
  return (
    <aside className="notes">
      <h3>Notes on {code}</h3>
      <div className="sub">Shared between Shantanu and Kabir through the day.</div>
      <div className="note-list">
        {notes.length ? notes.map((n) => (
          <div className="note" key={n.id}>
            <div className="who"><b>{n.by?.name || 'Teammate'}</b> · {new Date(n.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            <div className="t">{n.text}</div>
          </div>
        )) : <div className="meta">No notes yet.</div>}
      </div>
      <label className="meta" htmlFor="note">Add a note</label>
      <textarea id="note" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Chicory M switched off at 12:10" />
      {err && <div className="status err">{err}</div>}
      <button className="btn primary" type="button" disabled={busy || !text.trim()} onClick={async () => {
        if (!user) return; setBusy(true); setErr('');
        try { await addNote(code, text.trim(), user); setText(''); } catch { setErr('The note didn’t save. Try again.'); }
        setBusy(false);
      }}>Add note</button>
    </aside>
  );
}

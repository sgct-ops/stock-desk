'use client';
import {
  collection, doc, getDoc, getDocFromServer, getDocs, getDocsFromServer, onSnapshot, orderBy, query, where, runTransaction,
  addDoc, deleteDoc, serverTimestamp, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { fbDb } from './firebase';
import { dayKey, makeCode } from './codes';
import { parseMd, stats as reportStats } from './render';
import type { Note, Person, Report } from './types';

const ms = (v: unknown): number => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : Date.now());
const person = (u: User): Person => ({ uid: u.uid, name: u.displayName || u.email || 'Teammate', email: u.email || '' });

function fromDoc(id: string, d: Record<string, any>): Report {
  return { ...(d as Report), code: id, uploadedAt: ms(d.uploadedAt) };
}

export type ParsedUpload = { date: string; title: string; stats: Report['stats'] };

/** Validate a report .md before upload. Throws a readable error. */
export function checkReport(md: string, fileName: string): ParsedUpload {
  const rep = parseMd(md);
  let date: string | undefined = rep.date;
  if (!date) { const m = fileName.match(/(\d{4}-\d{2}-\d{2})/); if (m) date = m[1]; }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('No date found. Add "date: YYYY-MM-DD" at the top of the file, or put the date in the file name.');
  const s = reportStats(rep);
  const count = s.on.rows.length + s.off.rows.length + s.watch.rows.length + s.ok.rows.length;
  if (!count) throw new Error('No basket tables found. The file needs "Basket 1", "Basket 2", "Watch" or "Correctly set" sections with tables.');
  const pick = (k: 'on' | 'off' | 'watch' | 'ok') => ({ products: s[k].products, sizes: s[k].sizes });
  return { date, title: rep.title || 'Stock report', stats: { on: pick('on'), off: pick('off'), watch: pick('watch'), ok: pick('ok'), short: s.short } };
}

/** Save a report and hand it the next code for its date, atomically. */
export async function uploadReport(md: string, fileName: string, user: User): Promise<Report> {
  const parsed = checkReport(md, fileName);
  const day = dayKey(parsed.date);
  const counterRef = doc(fbDb(), 'counters', day);
  return runTransaction(fbDb(), async (tx) => {
    const c = await tx.get(counterRef);
    const seq = c.exists() ? Number(c.data().next) : 1;
    if (seq > 99) throw new Error('This date already has 99 reports.');
    const code = makeCode(parsed.date, seq);
    const rec = {
      code, date: parsed.date, seq, title: parsed.title, md, fileName, stats: parsed.stats,
      uploadedAt: serverTimestamp(), uploadedBy: person(user),
    };
    tx.set(counterRef, { next: seq + 1 });
    tx.set(doc(fbDb(), 'reports', code), rec);
    return { ...rec, uploadedAt: Date.now() } as Report;
  });
}

export async function getReport(code: string): Promise<Report | null> {
  const ref = doc(fbDb(), 'reports', code);
  const s = await getDocFromServer(ref).catch(() => getDoc(ref));
  return s.exists() ? fromDoc(s.id, s.data()) : null;
}

/** Reports whose report date is within [from, to] (inclusive, YYYY-MM-DD), newest first. */
export function watchReports(from: string, to: string, cb: (r: Report[]) => void, onErr: (e: Error) => void): Unsubscribe {
  const q = query(collection(fbDb(), 'reports'), where('date', '>=', from), where('date', '<=', to), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => fromDoc(d.id, d.data()));
    list.sort((a, b) => b.date.localeCompare(a.date) || b.seq - a.seq);
    cb(list);
  }, onErr);
}

export async function listReports(from: string, to: string): Promise<Report[]> {
  const q = query(collection(fbDb(), 'reports'), where('date', '>=', from), where('date', '<=', to), orderBy('date', 'asc'));
  const snap = await getDocsFromServer(q).catch(() => getDocs(q));
  return snap.docs.map((d) => fromDoc(d.id, d.data())).sort((a, b) => a.date.localeCompare(b.date) || a.seq - b.seq);
}

export async function deleteReport(code: string) { await deleteDoc(doc(fbDb(), 'reports', code)); }

export function watchNotes(code: string, cb: (n: Note[]) => void): Unsubscribe {
  const q = query(collection(fbDb(), 'reports', code, 'notes'), orderBy('at', 'asc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), at: ms(d.data().at) }))), () => cb([]));
}
export async function addNote(code: string, text: string, user: User) {
  await addDoc(collection(fbDb(), 'reports', code, 'notes'), { text: text.slice(0, 2000), by: person(user), at: serverTimestamp() });
}

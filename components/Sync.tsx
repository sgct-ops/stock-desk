'use client';
/* Sync: refreshes every open Stock Desk page from Firestore.
 *  - automatically when the page opens and every 6 hours after (also on return to the tab if 6 h have passed);
 *  - when anyone presses Sync: it writes sync/state, and every open page (Shantanu's, Kabir's) refreshes too. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { fbDb } from '@/lib/firebase';
import { useAuth } from './Auth';

export const AUTO_SYNC_MS = 6 * 60 * 60 * 1000;

type SyncState = {
  tick: number;                 // bumps on every sync; pages reload their data when it changes
  lastSynced: number | null;    // when this page last synced
  lastBy: { name: string; at: number } | null; // last manual sync by anyone
  syncing: boolean;
  syncNow: () => Promise<void>;
};
const Ctx = createContext<SyncState>({ tick: 0, lastSynced: null, lastBy: null, syncing: false, syncNow: async () => {} });
export const useSync = () => useContext(Ctx);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [lastBy, setLastBy] = useState<SyncState['lastBy']>(null);
  const [syncing, setSyncing] = useState(false);
  const lastRef = useRef<number>(0);
  const seenRemote = useRef<number | null>(null);

  const refresh = useCallback(() => { lastRef.current = Date.now(); setLastSynced(lastRef.current); setTick((t) => t + 1); }, []);

  // On open, then every 6 hours; also when the tab comes back after 6+ hours asleep.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, AUTO_SYNC_MS);
    const onVis = () => { if (document.visibilityState === 'visible' && Date.now() - lastRef.current >= AUTO_SYNC_MS) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  // A Sync pressed on any page (anyone's) refreshes this one too.
  useEffect(() => onSnapshot(doc(fbDb(), 'sync', 'state'), (s) => {
    if (!s.exists()) return;
    const d = s.data();
    const at = d.at instanceof Timestamp ? d.at.toMillis() : null;
    if (!at) return; // our own write, before the server time lands
    setLastBy({ name: d.by?.name || 'Someone', at });
    if (seenRemote.current === null) { seenRemote.current = at; return; } // first read: nothing new
    if (at > seenRemote.current) { seenRemote.current = at; refresh(); }
  }, () => {}), [refresh]);

  const syncNow = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await setDoc(doc(fbDb(), 'sync', 'state'), { at: serverTimestamp(), by: { uid: user.uid, name: user.displayName || user.email || 'Teammate', email: user.email || '' } });
    } catch { /* still refresh this page even if the broadcast fails */ }
    refresh();
    setTimeout(() => setSyncing(false), 600);
  }, [user, refresh]);

  return <Ctx.Provider value={{ tick, lastSynced, lastBy, syncing, syncNow }}>{children}</Ctx.Provider>;
}

const hhmm = (ms: number) => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function SyncButton() {
  const { lastSynced, lastBy, syncing, syncNow } = useSync();
  const title = [
    lastSynced ? `This page synced ${hhmm(lastSynced)}` : '',
    lastBy ? `Last Sync pressed by ${lastBy.name}, ${hhmm(lastBy.at)}` : '',
    'Auto-syncs every 6 hours. Pressing Sync refreshes everyone’s open Stock Desk.',
  ].filter(Boolean).join('\n');
  return (
    <span className="sync" title={title}>
      <span className="meta">{lastSynced ? `Synced ${new Date(lastSynced).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Not synced'}</span>
      <button className="btn" type="button" onClick={syncNow} disabled={syncing} aria-label="Sync now for everyone">{syncing ? 'Syncing…' : 'Sync'}</button>
    </span>
  );
}

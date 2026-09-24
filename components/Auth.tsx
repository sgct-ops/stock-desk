'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider, ALLOWED_DOMAIN } from '@/lib/firebase';

type Ctx = { user: User | null; loading: boolean };
const AuthCtx = createContext<Ctx>({ user: null, loading: true });
export const useAuth = () => useContext(AuthCtx);

const allowed = (u: User | null) => !!u && !!u.email && u.emailVerified && u.email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Ctx>({ user: null, loading: true });
  const [error, setError] = useState('');
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    if (u && !allowed(u)) { setError(`Only @${ALLOWED_DOMAIN} Google accounts can use Stock Desk. You signed in as ${u.email}.`); await signOut(auth); return; }
    setState({ user: u, loading: false });
  }), []);

  if (state.loading) return <main className="wrap"><p className="meta" style={{ paddingTop: 40 }}>Loading…</p></main>;
  if (!state.user) {
    return (
      <main className="wrap">
        <div className="signin">
          <h1>Stock Desk</h1>
          <p>Daily continue-selling reports for Carbontree. Sign in with your @{ALLOWED_DOMAIN} Google account.</p>
          {error && <div className="status err">{error}</div>}
          <button className="btn primary" type="button" onClick={async () => {
            setError('');
            try { await signInWithPopup(auth, googleProvider); }
            catch (e: any) { if (e?.code !== 'auth/popup-closed-by-user') setError('Sign-in didn’t work. Try again, or check that pop-ups are allowed for this site.'); }
          }}>Sign in with Google</button>
        </div>
      </main>
    );
  }
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export function SignOut() {
  return <button className="btn" type="button" onClick={() => signOut(auth)}>Sign out</button>;
}

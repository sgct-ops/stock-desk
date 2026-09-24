'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { fbAuth, googleProvider, ALLOWED_DOMAIN } from '@/lib/firebase';
import { roleFor, OWNER_EMAIL, type Role } from '@/lib/roles';

type Ctx = { user: User | null; loading: boolean; role: Role | null };
const AuthCtx = createContext<Ctx>({ user: null, loading: true, role: null });
export const useAuth = () => useContext(AuthCtx);

const allowed = (u: User | null) => !!u && !!u.email && u.emailVerified && u.email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Ctx>({ user: null, loading: true, role: null });
  const [error, setError] = useState('');
  useEffect(() => onAuthStateChanged(fbAuth(), async (u) => {
    if (u && !allowed(u)) { setError(`Only @${ALLOWED_DOMAIN} Google accounts can use Stock Desk. You signed in as ${u.email}.`); await signOut(fbAuth()); return; }
    setState({ user: u, loading: false, role: roleFor(u?.email) });
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
            try { await signInWithPopup(fbAuth(), googleProvider); }
            catch (e: any) { if (e?.code !== 'auth/popup-closed-by-user') setError('Sign-in didn’t work. Try again, or check that pop-ups are allowed for this site.'); }
          }}>Sign in with Google</button>
        </div>
      </main>
    );
  }
  if (!state.role) {
    return (
      <main className="wrap">
        <div className="signin">
          <h1>No access yet</h1>
          <p>You’re signed in as <b>{state.user.email}</b>, which doesn’t have access to Stock Desk.</p>
          <p>Please speak to <b>{OWNER_EMAIL}</b> regarding the updates.</p>
          <div className="row-actions"><SignOut /></div>
        </div>
      </main>
    );
  }
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export function SignOut() {
  return <button className="btn" type="button" onClick={() => signOut(fbAuth())}>Sign out</button>;
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, SignOut } from './Auth';

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/';
  const { user, role } = useAuth();
  const cur = (p: string) => (p === '/' ? path === '/' : path.startsWith(p)) ? 'page' : undefined;
  return (
    <>
      <header className="top">
        <div className="top-in" style={{ alignItems: 'center' }}>
          <div className="brand"><Link href="/"><b>Stock Desk</b></Link><span>Continue-selling check · Carbontree</span></div>
          <nav className="nav" aria-label="Main">
            <Link href="/" aria-current={cur('/')}>Reports</Link>
            {role?.canConsolidate && <Link href="/consolidate/" aria-current={cur('/consolidate')}>Consolidate</Link>}
            {role?.views.includes('karan') && <Link href="/karan/" aria-current={cur('/karan')}>Karan</Link>}
          </nav>
          <div className="who">
            {user?.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />}
            <span>{user?.displayName || user?.email}</span>
            <SignOut />
          </div>
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}

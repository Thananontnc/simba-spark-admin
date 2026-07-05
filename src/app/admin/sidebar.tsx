'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    href: '/admin/users',
    label: 'Users',
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: '/admin/timeframes',
    label: 'Timeframes',
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    href: '/admin/courses',
    label: 'Courses & Sections',
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
];

type Props = { userName: string; userEmail: string; signOutAction: () => Promise<void> };

export default function Sidebar({ userName, userEmail, signOutAction }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const sidebarContent = (
    <aside className="w-52 shrink-0 flex flex-col h-full" style={{ background: '#111111', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Brand */}
      <button
        onClick={() => window.location.reload()}
        className="group px-4 py-4 flex items-center gap-2.5 w-full text-left focus:outline-none cursor-pointer"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        aria-label="Refresh page"
      >
        <Image
          src="/simba-logo.webp"
          alt="Simba"
          width={36}
          height={36}
          className="shrink-0"
        />
        <div className="transition-all duration-300 transform group-hover:translate-x-1 origin-left">
          <p className="text-sm font-semibold text-white leading-tight transition-colors duration-300 group-hover:text-amber-400">Simba Spark</p>
          <p className="text-[10px] leading-tight transition-colors duration-300" style={{ color: 'rgba(255,255,255,0.3)' }}>Admin</p>
        </div>
      </button>

      {/* User info */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-medium text-white truncate">{userName}</p>
        <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{userEmail}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="sidebar-link">
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Profile + Signout */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/admin/profile" className="sidebar-link mb-1">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </Link>
        <form action={signOutAction}>
          <button className="sidebar-signout">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile: hamburger trigger (rendered inside header via portal-like pattern) */}
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 z-50 h-full flex flex-col lg:hidden transition-transform duration-200"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {sidebarContent}
      </div>

      {/* Hamburger button — floats in top-left on mobile */}
      <button
        className="fixed top-3 left-4 z-50 lg:hidden flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ background: '#111111', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle menu"
      >
        {open
          ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        }
      </button>
    </>
  );
}

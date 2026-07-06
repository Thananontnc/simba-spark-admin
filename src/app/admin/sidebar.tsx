'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const NAV_SETUP = [
  {
    href: '/admin/users',
    label: 'Users',
    step: '1',
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: '/admin/timeframes',
    label: 'Semesters',
    step: '2',
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    href: '/admin/courses',
    label: 'Courses & Sections',
    step: '3',
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
];

const NAV_MANAGE = [
  {
    href: '/admin',
    label: 'Dashboard',
    exact: true,
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    exact: false,
    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/></svg>,
  },
];

type Props = { userName: string; userEmail: string; signOutAction: () => Promise<void> };

export default function Sidebar({ userName, userEmail, signOutAction }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const initials = userName ? userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'A';

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  const sidebarContent = (
    <aside className="w-56 shrink-0 flex flex-col h-full relative"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        boxShadow: '2px 0 16px rgba(0,0,0,0.08)',
      }}>

      {/* Orange top accent bar */}
      <div className="h-0.5 w-full shrink-0"
        style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }} />

      {/* Brand */}
      <div className="px-4 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="relative">
          <Image src="/simba-logo.webp" alt="Simba" width={34} height={34} className="shrink-0 rounded-xl" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight" style={{ color: 'var(--sidebar-tx)' }}>Simba Spark</p>
          <p className="text-[10px] leading-tight font-medium" style={{ color: 'var(--accent)' }}>Admin Portal</p>
        </div>
      </div>

      {/* User card */}
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
          style={{ background: 'var(--sidebar-user-bg)', border: '1px solid var(--sidebar-user-border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'rgba(245,132,31,0.18)', color: 'var(--accent)' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--sidebar-tx)' }}>{userName}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--sidebar-tx-3)' }}>{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto">

        {/* Manage */}
        <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--sidebar-label)' }}>Overview</p>
        {NAV_MANAGE.map(item => {
          const active = isActive(item.href, item.exact);
          return (
            <Link key={item.href} href={item.href}
              className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}>
              <span className="sidebar-icon">{item.icon}</span>
              <span className="text-[13px]">{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />}
            </Link>
          );
        })}

        {/* Setup — numbered steps */}
        <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--sidebar-label)' }}>Setup</p>
        {NAV_SETUP.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}>
              <span className="sidebar-icon">{item.icon}</span>
              <span className="text-[13px] flex-1">{item.label}</span>
              <span className="text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: active ? 'rgba(255,255,255,0.25)' : 'var(--sidebar-hover)',
                  color: active ? '#fff' : 'var(--sidebar-tx-3)',
                }}>
                {item.step}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 space-y-0.5"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <Link href="/admin/profile"
          className={`sidebar-link ${pathname === '/admin/profile' ? 'sidebar-link-active' : ''}`}>
          <svg className="sidebar-icon" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="text-[13px]">Profile</span>
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="sidebar-signout">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="text-[13px]">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex h-screen sticky top-0">{sidebarContent}</div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={() => setOpen(false)} />
      )}

      <div className="fixed top-0 left-0 z-50 h-full flex flex-col lg:hidden transition-transform duration-200"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}>
        {sidebarContent}
      </div>

      <button
        className="fixed top-3 left-3 z-50 lg:hidden flex items-center justify-center w-9 h-9 rounded-xl"
        style={{
          background: 'var(--sidebar-bg)',
          color: 'var(--sidebar-tx-2)',
          border: '1px solid var(--sidebar-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle menu">
        {open
          ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        }
      </button>
    </>
  );
}

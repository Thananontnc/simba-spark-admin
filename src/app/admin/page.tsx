import sql from '@/lib/db';
import { auth } from '@/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Admin';

  const [[userStats], [sectionStats], [bookingStats]] = await Promise.all([
    sql`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE role = 'instructor')::int AS instructors,
      COUNT(*) FILTER (WHERE role = 'student')::int AS students,
      COUNT(*) FILTER (WHERE role = 'admin')::int AS admins
      FROM users`,
    sql`SELECT COUNT(*)::int AS total FROM sections`,
    sql`SELECT COUNT(*)::int AS total FROM bookings`,
  ]);

  const stats = [
    {
      label: 'Total Users',
      value: userStats.total,
      sub: `${userStats.students} students · ${userStats.instructors} instructors`,
      href: '/admin/users',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      color: 'rgba(59,130,246,0.1)',
      textColor: '#3b82f6',
    },
    {
      label: 'Active Sections',
      value: sectionStats.total,
      sub: 'Across all courses',
      href: '/admin/courses',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
      color: 'rgba(245,132,31,0.1)',
      textColor: '#f5841f',
    },
    {
      label: 'Bookings Made',
      value: bookingStats.total,
      sub: 'FCFS teaching slots',
      href: '/admin/courses',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      color: 'rgba(34,197,94,0.1)',
      textColor: '#16a34a',
    },
  ];

  const quickLinks = [
    { href: '/admin/users', label: 'Add a user', desc: 'Pre-authorize a new account' },
    { href: '/admin/timeframes', label: 'Create timeframe', desc: 'Set a 2-week block window' },
    { href: '/admin/courses', label: 'New section', desc: 'Create course + assign instructor' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--tx)' }}>
          Good day, {firstName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--tx-2)' }}>
          Here&apos;s an overview of Simba Spark.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className="rounded-xl p-5 group transition-all hover:shadow-md"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: s.color, color: s.textColor }}>
                {s.icon}
              </div>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
                className="mt-1 transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--tx-3)' }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--tx)' }}>{s.value}</p>
            <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--tx)' }}>{s.label}</p>
            <p className="text-xs" style={{ color: 'var(--tx-3)' }}>{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Quick Actions</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {quickLinks.map((q) => (
            <Link key={q.href} href={q.href}
              className="flex items-center justify-between px-5 py-3.5 group hover:bg-[var(--subtle)] transition-colors">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{q.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>{q.desc}</p>
              </div>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
                className="shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--tx-3)' }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

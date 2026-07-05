import sql from '@/lib/db';
import { auth } from '@/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function fmt(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
function fmtTime(t: string) { return t.slice(0, 5); }

export default async function AdminPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Admin';

  const [[userStats], [sectionStats], [bookingStats], recentBookings, recentUsers, upcomingTimeframes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE role='instructor')::int AS instructors, COUNT(*) FILTER (WHERE role='student')::int AS students FROM users`,
    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE instructor_id IS NULL)::int AS no_instructor FROM sections`,
    sql`SELECT COUNT(*)::int AS total FROM bookings`,
    sql`SELECT b.id, c.course_code, s.section_number, u.full_name AS instructor_name, b.date::text, b.start_time::text, b.room
        FROM bookings b JOIN sections s ON s.id=b.section_id JOIN courses c ON c.id=s.course_id
        LEFT JOIN users u ON u.id=s.instructor_id
        ORDER BY b.created_at DESC LIMIT 5`,
    sql`SELECT full_name, email, role, created_at::text FROM users ORDER BY created_at DESC LIMIT 5`,
    sql`SELECT label, start_date::text, end_date::text FROM timeframes WHERE start_date >= CURRENT_DATE ORDER BY start_date LIMIT 3`,
  ]);

  const stats = [
    { label: 'Total Users', value: userStats.total, sub: `${userStats.students} students · ${userStats.instructors} instructors`, href: '/admin/users', color: 'rgba(59,130,246,0.1)', textColor: '#3b82f6', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: 'Active Sections', value: sectionStats.total, sub: sectionStats.no_instructor > 0 ? `⚠ ${sectionStats.no_instructor} without instructor` : 'All assigned', href: '/admin/courses', color: 'rgba(245,132,31,0.1)', textColor: '#f5841f', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    { label: 'Bookings Made', value: bookingStats.total, sub: 'FCFS teaching slots', href: '/admin/bookings', color: 'rgba(34,197,94,0.1)', textColor: '#16a34a', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ];

  type RecentBooking = { id: number; course_code: string; section_number: string; instructor_name: string | null; date: string; start_time: string; room: string | null };
  type RecentUser = { full_name: string; email: string; role: string; created_at: string };
  type Timeframe = { label: string; start_date: string; end_date: string };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--tx)' }}>Good day, {firstName} 👋</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--tx-2)' }}>Here&apos;s an overview of Simba Spark.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="rounded-xl p-5 group transition-all hover:shadow-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color, color: s.textColor }}>{s.icon}</div>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="mt-1 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--tx-3)' }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--tx)' }}>{s.value}</p>
            <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--tx)' }}>{s.label}</p>
            <p className="text-xs" style={{ color: s.sub.startsWith('⚠') ? 'var(--accent)' : 'var(--tx-3)' }}>{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Recent bookings */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Recent Bookings</p>
            <Link href="/admin/bookings" className="text-xs" style={{ color: 'var(--accent)' }}>View all →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {(recentBookings as RecentBooking[]).map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tx)' }}>{b.course_code} · {b.section_number}</p>
                  <p className="text-xs" style={{ color: 'var(--tx-3)' }}>{b.instructor_name ?? 'Unassigned'}{b.room ? ` · ${b.room}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{fmtTime(b.start_time)}</p>
                  <p className="text-xs" style={{ color: 'var(--tx-3)' }}>{fmt(b.date)}</p>
                </div>
              </div>
            ))}
            {recentBookings.length === 0 && <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--tx-3)' }}>No bookings yet.</p>}
          </div>
        </div>

        {/* Recent users + upcoming timeframes */}
        <div className="space-y-6">
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Recent Users</p>
              <Link href="/admin/users" className="text-xs" style={{ color: 'var(--accent)' }}>View all →</Link>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {(recentUsers as RecentUser[]).map((u, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--tx)' }}>{u.full_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--tx-3)' }}>{u.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium capitalize shrink-0"
                    style={{ background: u.role === 'admin' ? 'rgba(245,132,31,0.12)' : u.role === 'instructor' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)', color: u.role === 'admin' ? '#c45f00' : u.role === 'instructor' ? '#2563eb' : '#15803d' }}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {upcomingTimeframes.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Upcoming Blocks</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {(upcomingTimeframes as Timeframe[]).map((tf, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{tf.label}</p>
                    <p className="text-xs" style={{ color: 'var(--tx-3)' }}>{fmt(tf.start_date)} → {fmt(tf.end_date)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Quick Actions</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            { href: '/admin/users', label: 'Add a user', desc: 'Pre-authorize a new account' },
            { href: '/admin/timeframes', label: 'Create timeframe', desc: 'Set a 2-week block window' },
            { href: '/admin/courses', label: 'New section', desc: 'Create course + assign instructor' },
          ].map(q => (
            <Link key={q.href} href={q.href} className="flex items-center justify-between px-5 py-3.5 group hover:bg-[var(--subtle)] transition-colors">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{q.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>{q.desc}</p>
              </div>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--tx-3)' }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

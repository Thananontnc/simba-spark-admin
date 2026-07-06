import sql from '@/lib/db';
import { auth } from '@/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function fmtFull(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(t: string) { return t.slice(0, 5); }

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  admin:      { bg: 'rgba(245,132,31,0.12)',  color: '#c45f00' },
  instructor: { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  student:    { bg: 'rgba(34,197,94,0.12)',   color: '#15803d' },
};

export default async function AdminPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Admin';

  const [
    [userStats],
    [sectionStats],
    [bookingStats],
    [semesterStats],
    [attentionStats],
    recentBookings,
    recentUsers,
    activeBlocks,
    upcomingBlocks,
  ] = await Promise.all([
    sql`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE role='instructor')::int AS instructors,
          COUNT(*) FILTER (WHERE role='student')::int AS students,
          COUNT(*) FILTER (WHERE is_authorized = false)::int AS unauthorized
        FROM users`,
    sql`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE instructor_id IS NULL)::int AS no_instructor,
          (SELECT COUNT(*)::int FROM sections s2
           WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.section_id = s2.id)) AS no_students
        FROM sections`,
    sql`SELECT COUNT(*)::int AS total FROM bookings`,
    sql`SELECT
          COUNT(*)::int AS semesters,
          (SELECT COUNT(*)::int FROM timeframes) AS blocks
        FROM semesters`,
    sql`SELECT
          (SELECT COUNT(*)::int FROM users WHERE password_hash = '' AND is_authorized = true) AS pending_registration,
          (SELECT COUNT(*)::int FROM timeframes tf
           WHERE NOT EXISTS (SELECT 1 FROM sections s WHERE s.timeframe_id = tf.id)) AS empty_blocks`,
    sql`SELECT b.id, c.course_code, c.course_name, s.section_number,
              (SELECT STRING_AGG(u2.full_name, ', ' ORDER BY u2.full_name)
               FROM section_instructors si2 JOIN users u2 ON u2.id = si2.instructor_id
               WHERE si2.section_id = s.id) AS instructor_name,
              b.date::text, b.start_time::text, b.end_time::text, b.room
        FROM bookings b
        JOIN sections s ON s.id = b.section_id
        JOIN courses c ON c.id = s.course_id
        ORDER BY b.created_at DESC LIMIT 6`,
    sql`SELECT full_name, email, role, is_authorized, created_at::text
        FROM users ORDER BY created_at DESC LIMIT 6`,
    sql`SELECT tf.id, tf.label, tf.start_date::text, tf.end_date::text, sem.name AS semester_name,
              COUNT(DISTINCT s.id)::int AS section_count,
              COUNT(DISTINCT b.id)::int AS booking_count
        FROM timeframes tf
        LEFT JOIN semesters sem ON sem.id = tf.semester_id
        LEFT JOIN sections s ON s.timeframe_id = tf.id
        LEFT JOIN bookings b ON b.section_id = s.id
        WHERE CURRENT_DATE BETWEEN tf.start_date AND tf.end_date
        GROUP BY tf.id, tf.label, tf.start_date, tf.end_date, sem.name`,
    sql`SELECT tf.label, tf.start_date::text, tf.end_date::text, sem.name AS semester_name
        FROM timeframes tf
        LEFT JOIN semesters sem ON sem.id = tf.semester_id
        WHERE tf.start_date > CURRENT_DATE
        ORDER BY tf.start_date LIMIT 4`,
  ]);

  type RecentBooking = {
    id: number; course_code: string; course_name: string; section_number: string;
    instructor_name: string | null; date: string; start_time: string; end_time: string; room: string | null;
  };
  type RecentUser = { full_name: string; email: string; role: string; is_authorized: boolean; created_at: string };
  type ActiveBlock = { id: number; label: string; start_date: string; end_date: string; semester_name: string | null; section_count: number; booking_count: number };
  type UpcomingBlock = { label: string; start_date: string; end_date: string; semester_name: string | null };

  // Setup state
  const hasUsers     = userStats.instructors > 0 || userStats.students > 0;
  const hasSemesters = semesterStats.semesters > 0;
  const hasSections  = sectionStats.total > 0;
  const hasBookings  = bookingStats.total > 0;
  const setupDone    = hasUsers && hasSemesters && hasSections;

  const setupSteps = [
    { n: 1, label: 'Add users',         done: hasUsers,     href: '/admin/users',      detail: hasUsers     ? `${userStats.instructors} instructors · ${userStats.students} students`               : 'No users yet' },
    { n: 2, label: 'Create semester',   done: hasSemesters, href: '/admin/timeframes', detail: hasSemesters ? `${semesterStats.semesters} semesters · ${semesterStats.blocks} blocks`               : 'No semesters yet' },
    { n: 3, label: 'Create sections',   done: hasSections,  href: '/admin/courses',    detail: hasSections  ? `${sectionStats.total} sections`                                                      : 'No sections yet' },
    { n: 4, label: 'Bookings ready',    done: hasBookings,  href: '/admin/bookings',   detail: hasBookings  ? `${bookingStats.total} bookings`                                                      : 'Instructors book via their portal' },
  ];
  const nextStep = setupSteps.find(s => !s.done);

  // Warnings
  const warnings: { msg: string; href: string }[] = [];
  if (sectionStats.no_instructor > 0)
    warnings.push({ msg: `${sectionStats.no_instructor} section${sectionStats.no_instructor !== 1 ? 's' : ''} missing instructor`, href: '/admin/courses' });
  if (sectionStats.no_students > 0)
    warnings.push({ msg: `${sectionStats.no_students} section${sectionStats.no_students !== 1 ? 's' : ''} have no students`, href: '/admin/courses' });
  if (attentionStats.pending_registration > 0)
    warnings.push({ msg: `${attentionStats.pending_registration} user${attentionStats.pending_registration !== 1 ? 's' : ''} haven't registered yet`, href: '/admin/users' });
  if (attentionStats.empty_blocks > 0)
    warnings.push({ msg: `${attentionStats.empty_blocks} block${attentionStats.empty_blocks !== 1 ? 's' : ''} have no sections`, href: '/admin/timeframes' });

  const stats = [
    {
      label: 'Users', value: userStats.total,
      sub: `${userStats.students} students · ${userStats.instructors} instructors`,
      warn: userStats.unauthorized > 0 ? `${userStats.unauthorized} unauthorized` : null,
      href: '/admin/users', color: 'rgba(59,130,246,0.12)', tc: '#3b82f6',
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      label: 'Sections', value: sectionStats.total,
      sub: `across ${semesterStats.blocks} blocks`,
      warn: sectionStats.no_instructor > 0 ? `${sectionStats.no_instructor} need instructor` : null,
      href: '/admin/courses', color: 'rgba(245,132,31,0.12)', tc: '#f5841f',
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    },
    {
      label: 'Semesters', value: semesterStats.semesters,
      sub: `${semesterStats.blocks} total blocks`,
      warn: null,
      href: '/admin/timeframes', color: 'rgba(168,85,247,0.12)', tc: '#9333ea',
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
    {
      label: 'Bookings', value: bookingStats.total,
      sub: 'FCFS teaching slots',
      warn: null,
      href: '/admin/bookings', color: 'rgba(34,197,94,0.12)', tc: '#16a34a',
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/></svg>,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--tx)' }}>Good day, {firstName}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>Simba Spark Admin Portal</p>
      </div>

      {/* Setup guide — prominent when incomplete, minimal banner when done */}
      {!setupDone ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid rgba(245,132,31,0.3)', boxShadow: '0 0 0 3px rgba(245,132,31,0.06)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(245,132,31,0.05)' }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>
                Setup guide — {setupSteps.filter(s => s.done).length}/{setupSteps.length} complete
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>Follow these steps to get Simba Spark ready.</p>
            </div>
            {nextStep && (
              <Link href={nextStep.href}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-primary shrink-0">
                Next: {nextStep.label}
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ borderColor: 'var(--border)' }}>
            {setupSteps.map((step, i) => (
              <Link key={step.n} href={step.href}
                className="flex flex-col gap-2 px-5 py-4 group hover:bg-[var(--subtle)] transition-colors"
                style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none', borderTop: i >= 2 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex items-center gap-2">
                  {step.done ? (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: 'rgba(245,132,31,0.15)', color: 'var(--accent)', border: '1.5px solid rgba(245,132,31,0.35)' }}>
                      {step.n}
                    </span>
                  )}
                  <span className="text-xs font-semibold" style={{ color: step.done ? 'var(--tx-2)' : 'var(--tx)' }}>
                    {step.label}
                  </span>
                </div>
                <p className="text-[11px] ml-8 leading-relaxed" style={{ color: step.done ? '#16a34a' : 'var(--tx-3)' }}>
                  {step.detail}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl px-5 py-3 flex items-center gap-3"
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(34,197,94,0.2)', color: '#16a34a' }}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <p className="text-sm font-medium" style={{ color: '#15803d' }}>
            Setup complete — {userStats.instructors} instructors, {userStats.students} students, {sectionStats.total} sections across {semesterStats.blocks} blocks.
          </p>
        </div>
      )}

      {/* Warnings — only if issues exist */}
      {warnings.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid rgba(245,132,31,0.25)' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(245,132,31,0.05)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: 'var(--accent)', flexShrink: 0 }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Needs attention</p>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-3">
            {warnings.map((w, i) => (
              <Link key={i} href={w.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{ background: 'rgba(245,132,31,0.1)', color: '#c45f00', border: '1px solid rgba(245,132,31,0.2)' }}>
                {w.msg}
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className="rounded-xl p-4 group transition-all hover:shadow-md"
            style={{ background: 'var(--surface)', border: `1px solid ${s.warn ? 'rgba(245,132,31,0.3)' : 'var(--border)'}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: s.color, color: s.tc }}>
                {s.icon}
              </div>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
                className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--tx-3)' }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <p className="text-2xl font-bold leading-none mb-1" style={{ color: 'var(--tx)' }}>{s.value}</p>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--tx-2)' }}>{s.label}</p>
            {s.warn ? (
              <p className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>⚠ {s.warn}</p>
            ) : (
              <p className="text-[11px]" style={{ color: 'var(--tx-3)' }}>{s.sub}</p>
            )}
          </Link>
        ))}
      </div>

      {/* Active blocks */}
      {(activeBlocks as ActiveBlock[]).length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid rgba(245,132,31,0.3)' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(245,132,31,0.05)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--accent)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Currently active</p>
          </div>
          <div className="flex flex-wrap gap-4 px-5 py-4">
            {(activeBlocks as ActiveBlock[]).map(b => (
              <Link key={b.id} href="/admin/courses"
                className="flex items-center gap-3 px-4 py-3 rounded-xl group hover:shadow-md transition-all"
                style={{ background: 'rgba(245,132,31,0.07)', border: '1px solid rgba(245,132,31,0.2)' }}>
                <div>
                  {b.semester_name && (
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: 'rgba(245,132,31,0.7)' }}>{b.semester_name}</p>
                  )}
                  <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{b.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--tx-3)' }}>
                    {fmt(b.start_date)} – {fmt(b.end_date)} · {b.section_count} sections · {b.booking_count} bookings
                  </p>
                </div>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
                  className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--accent)', opacity: 0.5 }}>
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recent bookings — wider */}
        <div className="lg:col-span-3 rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Recent Bookings</p>
            <Link href="/admin/bookings" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>View all →</Link>
          </div>
          {(recentBookings as RecentBooking[]).length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--tx-3)' }}>No bookings yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--tx-3)' }}>Instructors will book teaching slots via their portal.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {(recentBookings as RecentBooking[]).map(b => (
                <div key={b.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--subtle)] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{ background: 'rgba(245,132,31,0.1)', color: 'var(--accent)' }}>
                    {b.course_code.slice(-3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>
                      {b.course_code} · {b.course_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--tx-3)' }}>
                      {b.section_number}{b.instructor_name ? ` · ${b.instructor_name}` : ''}{b.room ? ` · ${b.room}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                      {fmtTime(b.start_time)}–{fmtTime(b.end_time)}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--tx-3)' }}>{fmt(b.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Upcoming blocks */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Upcoming Blocks</p>
              <Link href="/admin/timeframes" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Manage →</Link>
            </div>
            {(upcomingBlocks as UpcomingBlock[]).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--tx-3)' }}>No upcoming blocks.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {(upcomingBlocks as UpcomingBlock[]).map((tf, i) => (
                  <div key={i} className="px-5 py-3">
                    {tf.semester_name && (
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--tx-3)' }}>{tf.semester_name}</p>
                    )}
                    <p className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{tf.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>{fmtFull(tf.start_date)} → {fmtFull(tf.end_date)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent users */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Recent Users</p>
              <Link href="/admin/users" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>View all →</Link>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {(recentUsers as RecentUser[]).map((u, i) => {
                const rs = ROLE_STYLE[u.role] ?? ROLE_STYLE.student;
                return (
                  <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: rs.bg, color: rs.color }}>
                      {u.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--tx)' }}>{u.full_name}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--tx-3)' }}>{u.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium capitalize"
                        style={{ background: rs.bg, color: rs.color }}>
                        {u.role}
                      </span>
                      {!u.is_authorized && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            href: '/admin/users', label: 'Add User', desc: 'Pre-authorize account',
            color: 'rgba(59,130,246,0.1)', tc: '#3b82f6',
            icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
          },
          {
            href: '/admin/timeframes', label: 'New Semester', desc: 'Create semester & blocks',
            color: 'rgba(168,85,247,0.1)', tc: '#9333ea',
            icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
          },
          {
            href: '/admin/courses', label: 'Add Section', desc: 'Assign course to block',
            color: 'rgba(245,132,31,0.1)', tc: '#f5841f',
            icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
          },
          {
            href: '/admin/bookings', label: 'Bookings', desc: 'View teaching slots',
            color: 'rgba(34,197,94,0.1)', tc: '#16a34a',
            icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/></svg>,
          },
        ].map(q => (
          <Link key={q.href} href={q.href}
            className="rounded-xl p-4 flex flex-col gap-3 group transition-all hover:shadow-md"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: q.color, color: q.tc }}>
              {q.icon}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{q.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tx-3)' }}>{q.desc}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}

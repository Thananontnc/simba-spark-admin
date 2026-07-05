import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

type Booking = {
  id: number;
  course_name: string;
  course_code: string;
  section_number: string;
  instructor_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  room: string | null;
};

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(t: string) { return t.slice(0, 5); }

export default async function BookingsPage() {
  const bookings = await sql`
    SELECT b.id, c.course_name, c.course_code, s.section_number,
      u.full_name AS instructor_name,
      b.date::text, b.start_time::text, b.end_time::text, b.room
    FROM bookings b
    JOIN sections s ON s.id = b.section_id
    JOIN courses c ON c.id = s.course_id
    LEFT JOIN users u ON u.id = s.instructor_id
    ORDER BY b.date DESC, b.start_time DESC
  ` as Booking[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>All Bookings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''} across all sections.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
                {['Course', 'Section', 'Instructor', 'Date', 'Time', 'Room'].map(h => (
                  <th key={h} className="py-2.5 px-5 text-left text-xs font-medium" style={{ color: 'var(--tx-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b.id} className="hover:bg-[var(--subtle)] transition-colors"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-sm" style={{ color: 'var(--tx)' }}>{b.course_name}</p>
                    <p className="text-xs" style={{ color: 'var(--tx-2)' }}>{b.course_code}</p>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--tx-2)' }}>{b.section_number}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--tx)' }}>
                    {b.instructor_name ?? <span style={{ color: 'var(--tx-3)', fontStyle: 'italic' }}>Unassigned</span>}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--tx)' }}>{fmt(b.date)}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{ background: 'rgba(245,132,31,0.1)', color: 'var(--accent)' }}>
                      {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--tx-2)' }}>
                    {b.room ?? <span style={{ color: 'var(--tx-3)' }}>—</span>}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-sm" style={{ color: 'var(--tx-2)' }}>No bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {bookings.map(b => (
            <div key={b.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--tx)' }}>{b.course_name}</p>
                  <p className="text-xs" style={{ color: 'var(--tx-2)' }}>{b.course_code} · {b.section_number}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium shrink-0"
                  style={{ background: 'rgba(245,132,31,0.1)', color: 'var(--accent)' }}>
                  {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--tx-2)' }}>
                {fmt(b.date)}{b.room ? ` · ${b.room}` : ''}
              </p>
              {b.instructor_name && <p className="text-xs mt-0.5" style={{ color: 'var(--tx-3)' }}>{b.instructor_name}</p>}
            </div>
          ))}
          {bookings.length === 0 && (
            <p className="px-5 py-14 text-center text-sm" style={{ color: 'var(--tx-2)' }}>No bookings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

import sql from '@/lib/db';
import BookingsClient from './bookings-client';

export const dynamic = 'force-dynamic';

type Booking = {
  id: number; course_name: string; course_code: string; section_number: string;
  instructor_name: string | null; date: string; start_time: string; end_time: string; room: string | null;
};

type SectionOption = { id: number; course_code: string; course_name: string; section_number: string; room: string | null };

export default async function BookingsPage() {
  const [bookings, sections] = await Promise.all([
    sql`
      SELECT b.id, c.course_name, c.course_code, s.section_number,
        (SELECT STRING_AGG(u2.full_name, ', ' ORDER BY u2.full_name)
         FROM section_instructors si2 JOIN users u2 ON u2.id = si2.instructor_id
         WHERE si2.section_id = s.id) AS instructor_name,
        b.date::text, b.start_time::text, b.end_time::text, b.room
      FROM bookings b
      JOIN sections s ON s.id = b.section_id
      JOIN courses c ON c.id = s.course_id
      ORDER BY b.date DESC, b.start_time DESC
    ` as Promise<Booking[]>,
    sql`
      SELECT s.id, c.course_code, c.course_name, s.section_number, s.room
      FROM sections s JOIN courses c ON c.id = s.course_id
      ORDER BY c.course_code, s.section_number
    ` as Promise<SectionOption[]>,
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>All Bookings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''} across all sections.
        </p>
      </div>
      <BookingsClient bookings={bookings} sections={sections} />
    </div>
  );
}

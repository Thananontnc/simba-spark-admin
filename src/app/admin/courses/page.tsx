import sql from '@/lib/db';
import CoursesPageTabs from './courses-page-tabs';

export const dynamic = 'force-dynamic';

type Course    = { id: number; course_name: string; course_code: string; credits: number };
type Timeframe = { id: number; label: string; start_date: string; end_date: string; semester_id: number | null };
type Semester  = { id: number; name: string };
type User      = { id: number; full_name: string };
type Enrollment = { section_id: number; student_id: number; student_name: string };
type TimetableBooking = {
  id: number; course_code: string; course_name: string; section_number: string;
  date: string; start_time: string; end_time: string; room: string | null; instructor_name: string | null;
};
type SectionWithInstructors = {
  id: number; course_name: string; course_code: string; credits: number;
  section_number: string; room: string | null; timeframe_id: number | null; timeframe_label: string | null;
  enrolled_count: number; booking_count: number;
  instructors: { id: number; full_name: string }[];
};

export default async function CoursesPage() {
  const [rawSections, courses, timeframes, instructors, students, enrollments, bookings, sectionInstructors, semesters] = await Promise.all([
    sql`
      SELECT s.id, c.course_name, c.course_code, c.credits,
        s.section_number, s.room, tf.label AS timeframe_label, s.timeframe_id,
        COUNT(DISTINCT e.id)::int AS enrolled_count,
        COUNT(DISTINCT b.id)::int AS booking_count
      FROM sections s
      JOIN courses c ON c.id = s.course_id
      LEFT JOIN timeframes tf ON tf.id = s.timeframe_id
      LEFT JOIN enrollments e ON e.section_id = s.id
      LEFT JOIN bookings b ON b.section_id = s.id
      GROUP BY s.id, c.course_name, c.course_code, c.credits, s.section_number, s.room, tf.label, s.timeframe_id, tf.start_date
      ORDER BY tf.start_date NULLS LAST, c.course_code, s.section_number
    `,
    sql`SELECT id, course_name, course_code, credits FROM courses ORDER BY course_code`,
    sql`SELECT id, label, start_date::text, end_date::text, semester_id FROM timeframes ORDER BY start_date`,
    sql`SELECT id, full_name FROM users WHERE role = 'instructor' ORDER BY full_name`,
    sql`SELECT id, full_name FROM users WHERE role = 'student' ORDER BY full_name`,
    sql`SELECT e.section_id, e.student_id, u.full_name AS student_name FROM enrollments e JOIN users u ON u.id = e.student_id`,
    sql`
      SELECT b.id, c.course_code, c.course_name, s.section_number,
        b.date::text, b.start_time::text, b.end_time::text, b.room,
        (SELECT STRING_AGG(u2.full_name, ', ' ORDER BY u2.full_name)
         FROM section_instructors si2 JOIN users u2 ON u2.id = si2.instructor_id
         WHERE si2.section_id = s.id) AS instructor_name
      FROM bookings b
      JOIN sections s ON s.id = b.section_id
      JOIN courses c ON c.id = s.course_id
      ORDER BY b.date, b.start_time
    `,
    sql`SELECT si.section_id, si.instructor_id, u.full_name FROM section_instructors si JOIN users u ON u.id = si.instructor_id`,
    sql`SELECT id, name FROM semesters ORDER BY created_at`,
  ]);

  // Attach instructors array to each section
  const sections: SectionWithInstructors[] = rawSections.map(s => ({
    ...s,
    instructors: (sectionInstructors as { section_id: number; instructor_id: number; full_name: string }[])
      .filter(si => si.section_id === s.id)
      .map(si => ({ id: si.instructor_id, full_name: si.full_name })),
  })) as SectionWithInstructors[];

  return (
    <CoursesPageTabs
      sections={sections}
      courses={courses as Course[]}
      timeframes={timeframes as Timeframe[]}
      semesters={semesters as Semester[]}
      instructors={instructors as User[]}
      students={students as User[]}
      enrollments={enrollments as Enrollment[]}
      bookings={bookings as TimetableBooking[]}
    />
  );
}

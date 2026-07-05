import sql from '@/lib/db';
import CoursesClient from './courses-client';
import CreateSectionForm from './create-section-form';

export const dynamic = 'force-dynamic';

type Course = { id: number; course_name: string; course_code: string; credits: number };
type Section = {
  id: number; course_name: string; course_code: string; credits: number;
  section_number: string; room: string | null; timeframe_label: string | null;
  instructor_id: number | null; instructor_name: string | null; enrolled_count: number;
};
type Timeframe = { id: number; label: string };
type User = { id: number; full_name: string };
type Enrollment = { section_id: number; student_id: number; student_name: string };

export default async function CoursesPage() {
  const [sections, courses, timeframes, instructors, students, enrollments] = await Promise.all([
    sql`
      SELECT s.id, c.course_name, c.course_code, c.credits,
        s.section_number, s.room, tf.label AS timeframe_label,
        s.instructor_id, u.full_name AS instructor_name,
        COUNT(e.id)::int AS enrolled_count
      FROM sections s
      JOIN courses c ON c.id = s.course_id
      LEFT JOIN timeframes tf ON tf.id = s.timeframe_id
      LEFT JOIN users u ON u.id = s.instructor_id
      LEFT JOIN enrollments e ON e.section_id = s.id
      GROUP BY s.id, c.course_name, c.course_code, c.credits, s.section_number, s.room, tf.label, s.instructor_id, u.full_name
      ORDER BY c.course_code, s.section_number
    `,
    sql`SELECT id, course_name, course_code, credits FROM courses ORDER BY course_code`,
    sql`SELECT id, label FROM timeframes ORDER BY start_date`,
    sql`SELECT id, full_name FROM users WHERE role = 'instructor' ORDER BY full_name`,
    sql`SELECT id, full_name FROM users WHERE role = 'student' ORDER BY full_name`,
    sql`SELECT e.section_id, e.student_id, u.full_name AS student_name FROM enrollments e JOIN users u ON u.id = e.student_id`,
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>Courses & Sections</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>Create sections, assign instructors, enroll students.</p>
      </div>

      <CreateSectionForm
        courses={courses as Course[]}
        timeframes={timeframes as Timeframe[]}
      />

      <CoursesClient
        sections={sections as Section[]}
        instructors={instructors as User[]}
        students={students as User[]}
        enrollments={enrollments as Enrollment[]}
      />
    </div>
  );
}

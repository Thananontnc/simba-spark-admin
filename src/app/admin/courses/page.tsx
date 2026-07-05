import sql from '@/lib/db';
import { createCourseWithSection, deleteSection, assignInstructor, enrollStudent, unenrollStudent } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

type Section = {
  id: number; course_name: string; course_code: string; credits: number;
  section_number: string; room: string | null; timeframe_label: string | null;
  instructor_id: number | null; instructor_name: string | null; enrolled_count: number;
};
type Timeframe = { id: number; label: string };
type User = { id: number; full_name: string };
type Enrollment = { section_id: number; student_id: number; student_name: string };

const inp = 'w-full rounded-lg px-3 py-2 text-sm outline-none';
const inpStyle = { background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx)' } as React.CSSProperties;

export default async function CoursesPage() {
  const [sections, timeframes, instructors, students, enrollments] = await Promise.all([
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
      ORDER BY s.id
    `,
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

      {/* Create form */}
      <form action={async (fd: FormData) => { 'use server'; await createCourseWithSection(fd); }}
        className="rounded-xl p-5 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="font-semibold text-sm mb-4" style={{ color: 'var(--tx)' }}>New Section</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Course Name', name: 'course_name', placeholder: 'Introduction to…' },
            { label: 'Course Code', name: 'course_code', placeholder: 'CS101' },
            { label: 'Section No.', name: 'section_number', placeholder: 'SEC-01' },
            { label: 'Room', name: 'room', placeholder: 'Room A72' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>{f.label}</label>
              <input name={f.name} placeholder={f.placeholder} required={f.name !== 'room'}
                className={inp} style={inpStyle} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Credits</label>
            <input name="credits" type="number" min={1} max={6} defaultValue={3} required
              className={inp} style={inpStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Timeframe</label>
            <select name="timeframe_id" className={inp} style={inpStyle}>
              <option value="">— none —</option>
              {(timeframes as Timeframe[]).map(tf => <option key={tf.id} value={tf.id}>{tf.label}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          Create Section
        </button>
      </form>

      {/* Section cards */}
      <div className="space-y-3">
        {(sections as Section[]).map((sec) => {
          const enrolled = (enrollments as Enrollment[]).filter(e => e.section_id === sec.id);
          const available = (students as User[]).filter(u => !enrolled.find(e => e.student_id === u.id));

          return (
            <div key={sec.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

              {/* Section header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--subtle)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{sec.course_name}</span>
                    <span className="text-sm ml-2" style={{ color: 'var(--tx-2)' }}>{sec.course_code}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--tx-2)' }}>{sec.section_number}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--tx-2)' }}>{sec.credits} cr</span>
                    {sec.room && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--tx-2)' }}>{sec.room}</span>}
                    {sec.timeframe_label && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(245,132,31,0.12)', color: 'var(--accent)' }}>{sec.timeframe_label}</span>}
                  </div>
                </div>
                <form action={async (fd: FormData) => { 'use server'; await deleteSection(fd); }}>
                  <input type="hidden" name="id" value={sec.id} />
                  <button type="submit" className="text-xs font-medium" style={{ color: '#ef4444' }}>Delete</button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">

                {/* Instructor */}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tx-2)' }}>Instructor</p>
                  {sec.instructor_name
                    ? <p className="text-sm font-medium mb-3" style={{ color: 'var(--tx)' }}>{sec.instructor_name}</p>
                    : <p className="text-xs mb-3 italic" style={{ color: 'var(--tx-3)' }}>Not assigned</p>
                  }
                  <form action={async (fd: FormData) => { 'use server'; await assignInstructor(fd); }} className="flex gap-2">
                    <input type="hidden" name="section_id" value={sec.id} />
                    <select name="instructor_id" defaultValue={sec.instructor_id ?? ''} className={`flex-1 ${inp}`} style={inpStyle}>
                      <option value="">— unassigned —</option>
                      {(instructors as User[]).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <button type="submit" className="px-3 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>Save</button>
                  </form>
                </div>

                {/* Students */}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tx-2)' }}>
                    Students <span style={{ color: 'var(--accent)' }}>({sec.enrolled_count})</span>
                  </p>
                  <form action={async (fd: FormData) => { 'use server'; await enrollStudent(fd); }} className="flex gap-2 mb-3">
                    <input type="hidden" name="section_id" value={sec.id} />
                    <select name="student_id" className={`flex-1 ${inp}`} style={inpStyle}>
                      <option value="">Add student…</option>
                      {available.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <button type="submit" className="px-3 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>Enroll</button>
                  </form>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {enrolled.map(e => (
                      <div key={e.student_id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'var(--subtle)' }}>
                        <span className="text-xs" style={{ color: 'var(--tx)' }}>{e.student_name}</span>
                        <form action={async (fd: FormData) => { 'use server'; await unenrollStudent(fd); }}>
                          <input type="hidden" name="section_id" value={sec.id} />
                          <input type="hidden" name="student_id" value={e.student_id} />
                          <button type="submit" className="text-[11px] font-medium" style={{ color: '#ef4444' }}>Remove</button>
                        </form>
                      </div>
                    ))}
                    {enrolled.length === 0 && <p className="text-xs italic px-1" style={{ color: 'var(--tx-3)' }}>No students enrolled.</p>}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
        {sections.length === 0 && (
          <div className="rounded-xl p-12 text-center text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--tx-2)' }}>
            No sections yet. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}

'use server';

import { revalidatePath } from 'next/cache';
import sql, { withTransaction } from '@/lib/db';
import { auth } from '@/auth';
import bcrypt from 'bcrypt';

// Server actions are public HTTP endpoints — proxy.ts only guards pages.
// Every action must verify the caller is an admin.
async function requireAdmin() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  return session!;
}

// ── A1: Users ────────────────────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  await requireAdmin();
  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;

  try {
    await sql`
      INSERT INTO users (full_name, email, password_hash, role, is_authorized)
      VALUES (${full_name}, ${email}, '', ${role}, true)
    `;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: 'Email already exists.' };
    return { error: 'Failed to create user.' };
  }
  revalidatePath('/admin/users');
  return { success: true };
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;

  try {
    await sql`
      UPDATE users SET full_name = ${full_name}, email = ${email}, role = ${role}
      WHERE id = ${parseInt(id)}
    `;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: 'Email already exists.' };
    return { error: 'Failed to update user.' };
  }
  revalidatePath('/admin/users');
  return { success: true };
}

export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();
  const id = parseInt(formData.get('id') as string);

  if (session?.user?.id && parseInt(session.user.id) === id) {
    return { error: 'You cannot delete your own account.' };
  }

  try {
    await withTransaction(async (txSql) => {
      await txSql`DELETE FROM enrollments WHERE student_id = ${id}`;
      await txSql`DELETE FROM section_instructors WHERE instructor_id = ${id}`;
      await txSql`UPDATE sections SET instructor_id = NULL WHERE instructor_id = ${id}`;
      await txSql`DELETE FROM users WHERE id = ${id}`;
    });
  } catch {
    return { error: 'Failed to delete user.' };
  }
  revalidatePath('/admin/users');
  return { success: true };
}

export async function adminResetPassword(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  const newPassword = formData.get('new_password') as string;

  if (!newPassword || newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  const hash = await bcrypt.hash(newPassword, 10);
  try {
    await sql`UPDATE users SET password_hash = ${hash}, is_authorized = true WHERE id = ${id}`;
  } catch {
    return { error: 'Failed to reset password.' };
  }
  revalidatePath('/admin/users');
  return { success: true };
}

// ── A3: Semesters ────────────────────────────────────────────────────────────

export async function createSemester(formData: FormData) {
  await requireAdmin();
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Semester name is required.' };
  try {
    await sql`INSERT INTO semesters (name) VALUES (${name})`;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: 'Semester name already exists.' };
    return { error: 'Failed to create semester.' };
  }
  revalidatePath('/admin/timeframes');
  return { success: true };
}

export async function updateSemester(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Semester name is required.' };
  try {
    await sql`UPDATE semesters SET name = ${name} WHERE id = ${id}`;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: 'Semester name already exists.' };
    return { error: 'Failed to update semester.' };
  }
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function deleteSemester(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  const blocks = await sql`SELECT id, label FROM timeframes WHERE semester_id = ${id}`;
  if (blocks.length > 0) {
    const names = blocks.slice(0, 3).map((b: { label: string }) => b.label).join(', ');
    const more = blocks.length > 3 ? ` and ${blocks.length - 3} more` : '';
    return { error: `Contains blocks: ${names}${more}. Delete or reassign them first.` };
  }
  await sql`DELETE FROM semesters WHERE id = ${id}`;
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

// ── A4: Timeframes ───────────────────────────────────────────────────────────

async function validateTimeframe(label: string, start_date: string, end_date: string, excludeId?: number) {
  if (!label?.trim()) return 'Label is required.';
  if (!start_date || !end_date) return 'Start and end dates are required.';
  if (end_date < start_date) return 'End date must be after start date.';

  const overlapping = await sql`
    SELECT label FROM timeframes
    WHERE start_date <= ${end_date} AND end_date >= ${start_date}
      AND id != ${excludeId ?? -1}
    LIMIT 1
  `;
  if (overlapping.length > 0) {
    return `Dates overlap with "${overlapping[0].label}". Blocks must not overlap.`;
  }
  return null;
}

export async function createTimeframe(formData: FormData) {
  await requireAdmin();
  const label = formData.get('label') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;
  const semester_id = formData.get('semester_id') as string;

  const invalid = await validateTimeframe(label, start_date, end_date);
  if (invalid) return { error: invalid };

  await sql`
    INSERT INTO timeframes (label, start_date, end_date, semester_id)
    VALUES (${label}, ${start_date}, ${end_date}, ${semester_id ? parseInt(semester_id) : null})
  `;
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function updateTimeframe(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  const label = formData.get('label') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;
  const semester_id = formData.get('semester_id') as string;

  const invalid = await validateTimeframe(label, start_date, end_date, id);
  if (invalid) return { error: invalid };

  await sql`
    UPDATE timeframes SET label = ${label}, start_date = ${start_date}, end_date = ${end_date},
      semester_id = ${semester_id ? parseInt(semester_id) : null}
    WHERE id = ${id}
  `;
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function deleteTimeframe(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);

  const inUse = await sql`
    SELECT c.course_code, s.section_number
    FROM sections s JOIN courses c ON c.id = s.course_id
    WHERE s.timeframe_id = ${id}
  `;
  if (inUse.length > 0) {
    const list = inUse.slice(0, 3).map(s => `${s.course_code} ${s.section_number}`).join(', ');
    const more = inUse.length > 3 ? ` and ${inUse.length - 3} more` : '';
    return { error: `In use by ${list}${more}. Move or delete those sections first.` };
  }

  await sql`DELETE FROM timeframes WHERE id = ${id}`;
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

// Delete a block together with everything scheduled inside it.
export async function deleteTimeframeCascade(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);

  try {
    await withTransaction(async (txSql) => {
      await txSql`DELETE FROM bookings WHERE section_id IN (SELECT id FROM sections WHERE timeframe_id = ${id})`;
      await txSql`DELETE FROM enrollments WHERE section_id IN (SELECT id FROM sections WHERE timeframe_id = ${id})`;
      await txSql`DELETE FROM section_instructors WHERE section_id IN (SELECT id FROM sections WHERE timeframe_id = ${id})`;
      await txSql`DELETE FROM sections WHERE timeframe_id = ${id}`;
      await txSql`DELETE FROM timeframes WHERE id = ${id}`;
    });
  } catch {
    return { error: 'Failed to delete block.' };
  }
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

// ── A2: Courses & Sections ───────────────────────────────────────────────────

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const course_name = (formData.get('course_name') as string)?.trim();
  const course_code = (formData.get('course_code') as string)?.trim().toUpperCase();
  const credits = parseInt(formData.get('credits') as string) || 3;

  if (!course_name || !course_code) return { error: 'Course code and name are required.' };

  try {
    await sql`INSERT INTO courses (course_name, course_code, credits) VALUES (${course_name}, ${course_code}, ${credits})`;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: `Course code ${course_code} already exists.` };
    return { error: 'Failed to create course.' };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function updateCourse(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  const course_name = (formData.get('course_name') as string)?.trim();
  const course_code = (formData.get('course_code') as string)?.trim().toUpperCase();
  const credits = parseInt(formData.get('credits') as string) || 3;

  if (!course_name || !course_code) return { error: 'Course code and name are required.' };

  try {
    await sql`UPDATE courses SET course_name = ${course_name}, course_code = ${course_code}, credits = ${credits} WHERE id = ${id}`;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: `Course code ${course_code} already exists.` };
    return { error: 'Failed to update course.' };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function deleteCourse(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);

  const inUse = await sql`SELECT COUNT(*)::int AS c FROM sections WHERE course_id = ${id}`;
  if (inUse[0].c > 0) {
    return { error: `Course has ${inUse[0].c} section${inUse[0].c !== 1 ? 's' : ''}. Delete those sections first.` };
  }

  await sql`DELETE FROM courses WHERE id = ${id}`;
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function createCourseWithSection(formData: FormData) {
  await requireAdmin();
  const course_name = formData.get('course_name') as string;
  const course_code = formData.get('course_code') as string;
  const credits = parseInt(formData.get('credits') as string);
  const section_number = formData.get('section_number') as string;
  const room = formData.get('room') as string;
  const timeframe_id = formData.get('timeframe_id') as string;

  try {
    const [course] = await sql`
      INSERT INTO courses (course_name, course_code, credits)
      VALUES (${course_name}, ${course_code}, ${credits})
      ON CONFLICT (course_code) DO UPDATE SET course_name = EXCLUDED.course_name, credits = EXCLUDED.credits
      RETURNING id
    `;
    await sql`
      INSERT INTO sections (course_id, section_number, room, timeframe_id)
      VALUES (${course.id as number}, ${section_number}, ${room || null}, ${timeframe_id ? parseInt(timeframe_id) : null})
    `;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: 'Course code already exists.' };
    return { error: 'Failed to create course.' };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function createSection(formData: FormData) {
  await requireAdmin();
  const course_id = parseInt(formData.get('course_id') as string);
  const section_number = formData.get('section_number') as string;
  const room = formData.get('room') as string;
  const timeframe_id = formData.get('timeframe_id') as string;

  if (!course_id || !section_number) return { error: 'Course and section number required.' };

  try {
    await sql`
      INSERT INTO sections (course_id, section_number, room, timeframe_id)
      VALUES (${course_id}, ${section_number}, ${room || null}, ${timeframe_id ? parseInt(timeframe_id) : null})
    `;
  } catch {
    return { error: 'Failed to create section.' };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function updateSection(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  const section_number = formData.get('section_number') as string;
  const room = formData.get('room') as string;
  const timeframe_id = formData.get('timeframe_id') as string;

  try {
    await sql`
      UPDATE sections
      SET section_number = ${section_number},
          room = ${room || null},
          timeframe_id = ${timeframe_id ? parseInt(timeframe_id) : null}
      WHERE id = ${id}
    `;
  } catch {
    return { success: false, error: 'Failed to update section.' };
  }
  revalidatePath('/admin/courses');
  return { success: true, error: null };
}

export async function deleteSection(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  try {
    await withTransaction(async (txSql) => {
      await txSql`DELETE FROM bookings WHERE section_id = ${id}`;
      await txSql`DELETE FROM enrollments WHERE section_id = ${id}`;
      await txSql`DELETE FROM section_instructors WHERE section_id = ${id}`;
      await txSql`DELETE FROM sections WHERE id = ${id}`;
    });
  } catch {
    return { error: 'Failed to delete section.' };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

// ── A4: Assign Instructor & Enroll Students ──────────────────────────────────

export async function assignInstructor(formData: FormData) {
  await requireAdmin();
  const section_id = parseInt(formData.get('section_id') as string);
  const instructor_id = formData.get('instructor_id') as string;
  const iid = instructor_id ? parseInt(instructor_id) : null;

  // Replace all instructors with the selected one (single-instructor assignment).
  // Note: this replaces any multi-instructor setup made via Block View.
  try {
    await withTransaction(async (txSql) => {
      await txSql`DELETE FROM section_instructors WHERE section_id = ${section_id}`;
      if (iid) {
        await txSql`INSERT INTO section_instructors (section_id, instructor_id) VALUES (${section_id}, ${iid}) ON CONFLICT DO NOTHING`;
      }
      await txSql`UPDATE sections SET instructor_id = ${iid} WHERE id = ${section_id}`;
    });
  } catch {
    return { error: 'Failed to assign instructor.' };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function addSectionInstructor(formData: FormData) {
  await requireAdmin();
  const section_id = parseInt(formData.get('section_id') as string);
  const instructor_id = parseInt(formData.get('instructor_id') as string);
  if (!section_id || !instructor_id) return { error: 'Missing fields.' };
  try {
    await sql`INSERT INTO section_instructors (section_id, instructor_id) VALUES (${section_id}, ${instructor_id}) ON CONFLICT DO NOTHING`;
    await sql`UPDATE sections SET instructor_id = ${instructor_id} WHERE id = ${section_id} AND instructor_id IS NULL`;
  } catch { return { error: 'Failed to add instructor.' }; }
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function removeSectionInstructor(formData: FormData) {
  await requireAdmin();
  const section_id = parseInt(formData.get('section_id') as string);
  const instructor_id = parseInt(formData.get('instructor_id') as string);
  await sql`DELETE FROM section_instructors WHERE section_id = ${section_id} AND instructor_id = ${instructor_id}`;
  const remaining = await sql`SELECT instructor_id FROM section_instructors WHERE section_id = ${section_id} LIMIT 1`;
  const newPrimary = remaining[0]?.instructor_id ?? null;
  await sql`UPDATE sections SET instructor_id = ${newPrimary} WHERE id = ${section_id}`;
  revalidatePath('/admin/courses');
  return { success: true };
}

// Block-course rule: a student takes one section per 2-week block.
// Returns error text if the student is already in another section of the same block.
async function blockConflict(sectionId: number, studentId: number) {
  const clash = await sql`
    SELECT c.course_code, s2.section_number
    FROM enrollments e
    JOIN sections s2 ON s2.id = e.section_id
    JOIN courses c ON c.id = s2.course_id
    WHERE e.student_id = ${studentId}
      AND s2.id != ${sectionId}
      AND s2.timeframe_id IS NOT NULL
      AND s2.timeframe_id = (SELECT timeframe_id FROM sections WHERE id = ${sectionId})
    LIMIT 1
  `;
  if (clash.length > 0) {
    return `Already enrolled in ${clash[0].course_code} ${clash[0].section_number} in the same block.`;
  }
  return null;
}

export async function enrollStudent(formData: FormData) {
  await requireAdmin();
  const section_id = parseInt(formData.get('section_id') as string);
  const student_id = parseInt(formData.get('student_id') as string);

  const conflict = await blockConflict(section_id, student_id);
  if (conflict) return { error: conflict };

  try {
    await sql`
      INSERT INTO enrollments (section_id, student_id)
      VALUES (${section_id}, ${student_id})
    `;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: 'Student already enrolled.' };
    return { error: 'Failed to enroll student.' };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function unenrollStudent(formData: FormData) {
  await requireAdmin();
  const section_id = formData.get('section_id') as string;
  const student_id = formData.get('student_id') as string;

  await sql`
    DELETE FROM enrollments
    WHERE section_id = ${parseInt(section_id)} AND student_id = ${parseInt(student_id)}
  `;
  revalidatePath('/admin/courses');
  return { success: true };
}

// ── Silent mutations (block-view optimistic — no revalidatePath) ─────────────

export async function addSectionInstructorSilent(sectionId: number, instructorId: number) {
  await requireAdmin();
  try {
    await sql`INSERT INTO section_instructors (section_id, instructor_id) VALUES (${sectionId}, ${instructorId}) ON CONFLICT DO NOTHING`;
    await sql`UPDATE sections SET instructor_id = ${instructorId} WHERE id = ${sectionId} AND instructor_id IS NULL`;
    return { success: true };
  } catch {
    return { error: 'Failed to add instructor.' };
  }
}

export async function removeSectionInstructorSilent(sectionId: number, instructorId: number) {
  await requireAdmin();
  try {
    await sql`DELETE FROM section_instructors WHERE section_id = ${sectionId} AND instructor_id = ${instructorId}`;
    const remaining = await sql`SELECT instructor_id FROM section_instructors WHERE section_id = ${sectionId} LIMIT 1`;
    const newPrimary = remaining[0]?.instructor_id ?? null;
    await sql`UPDATE sections SET instructor_id = ${newPrimary} WHERE id = ${sectionId}`;
    return { success: true };
  } catch {
    return { error: 'Failed to remove instructor.' };
  }
}

export async function enrollStudentSilent(sectionId: number, studentId: number) {
  await requireAdmin();
  const conflict = await blockConflict(sectionId, studentId);
  if (conflict) return { error: conflict };
  await sql`INSERT INTO enrollments (section_id, student_id) VALUES (${sectionId}, ${studentId}) ON CONFLICT DO NOTHING`;
  return { success: true };
}

export async function unenrollStudentSilent(sectionId: number, studentId: number) {
  await requireAdmin();
  await sql`DELETE FROM enrollments WHERE section_id = ${sectionId} AND student_id = ${studentId}`;
}

export async function deleteSectionSilent(id: number) {
  await requireAdmin();
  try {
    await withTransaction(async (txSql) => {
      await txSql`DELETE FROM bookings WHERE section_id = ${id}`;
      await txSql`DELETE FROM enrollments WHERE section_id = ${id}`;
      await txSql`DELETE FROM section_instructors WHERE section_id = ${id}`;
      await txSql`DELETE FROM sections WHERE id = ${id}`;
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ── A5: Toggle Authorization ─────────────────────────────────────────────────

export async function toggleAuthorized(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  const current = formData.get('is_authorized') === 'true';
  await sql`UPDATE users SET is_authorized = ${!current} WHERE id = ${id}`;
  revalidatePath('/admin/users');
  return { success: true };
}

// ── A6: Bulk Enroll ──────────────────────────────────────────────────────────

export async function bulkEnrollStudents(formData: FormData) {
  await requireAdmin();
  const section_id = parseInt(formData.get('section_id') as string);
  const ids = formData.getAll('student_ids[]').map(v => parseInt(v as string));
  if (!ids.length) return { error: 'No students selected.' };

  let enrolled = 0;
  let skipped = 0;
  for (const student_id of ids) {
    try {
      if (await blockConflict(section_id, student_id)) { skipped++; continue; }
      await sql`INSERT INTO enrollments (section_id, student_id) VALUES (${section_id}, ${student_id}) ON CONFLICT DO NOTHING`;
      enrolled++;
    } catch { skipped++; }
  }
  revalidatePath('/admin/courses');
  return { success: true, enrolled, skipped };
}

// ── A7: Delete Booking (admin) ───────────────────────────────────────────────

export async function deleteBooking(formData: FormData) {
  await requireAdmin();
  const id = parseInt(formData.get('id') as string);
  await sql`DELETE FROM bookings WHERE id = ${id}`;
  revalidatePath('/admin/bookings');
  return { success: true };
}

// ── A7: Admin booking creation (same FCFS rules as instructor booking) ───────

export async function createBookingAdmin(formData: FormData) {
  await requireAdmin();
  const section_id = parseInt(formData.get('section_id') as string);
  const date = formData.get('date') as string;
  const start_time = formData.get('start_time') as string;
  const end_time = formData.get('end_time') as string;
  const room = (formData.get('room') as string)?.trim() || null;

  if (!section_id || !date || !start_time || !end_time) return { error: 'All fields except room are required.' };
  if (end_time <= start_time) return { error: 'End time must be after start time.' };

  // Weekends are holidays in the block system.
  const dow = new Date(date + 'T00:00:00').getDay();
  if (dow === 0 || dow === 6) return { error: 'Bookings must be on a weekday (Mon–Fri).' };

  // The class must happen inside the section's block window.
  const [tf] = await sql`
    SELECT tf.label, tf.start_date::text, tf.end_date::text
    FROM sections s JOIN timeframes tf ON tf.id = s.timeframe_id
    WHERE s.id = ${section_id}
  `;
  if (!tf) return { error: 'Section has no block assigned — set its timeframe first.' };
  if (date < tf.start_date || date > tf.end_date) {
    return { error: `Date is outside ${tf.label} (${tf.start_date} – ${tf.end_date}).` };
  }

  // FCFS conflict rules — overlap = new_start < existing_end AND new_end > existing_start
  if (room) {
    const roomClash = await sql`
      SELECT b.id FROM bookings b
      WHERE b.date = ${date} AND b.room = ${room}
        AND ${start_time} < b.end_time AND ${end_time} > b.start_time
      LIMIT 1
    `;
    if (roomClash.length > 0) return { error: `Room ${room} is already booked at that time.` };
  }

  const instructorClash = await sql`
    SELECT b.id FROM bookings b
    JOIN section_instructors si ON si.section_id = b.section_id
    WHERE b.date = ${date}
      AND ${start_time} < b.end_time AND ${end_time} > b.start_time
      AND si.instructor_id IN (SELECT instructor_id FROM section_instructors WHERE section_id = ${section_id})
    LIMIT 1
  `;
  if (instructorClash.length > 0) return { error: 'An instructor of this section already has a booking at that time.' };

  const studentClash = await sql`
    SELECT b.id FROM bookings b
    JOIN enrollments e ON e.section_id = b.section_id
    WHERE b.date = ${date}
      AND ${start_time} < b.end_time AND ${end_time} > b.start_time
      AND e.student_id IN (SELECT student_id FROM enrollments WHERE section_id = ${section_id})
    LIMIT 1
  `;
  if (studentClash.length > 0) return { error: 'A student in this section is already in another booking at that time.' };

  await sql`
    INSERT INTO bookings (section_id, date, start_time, end_time, room)
    VALUES (${section_id}, ${date}, ${start_time}, ${end_time}, ${room})
  `;
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/courses');
  return { success: true };
}

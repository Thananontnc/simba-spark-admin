'use server';

import { revalidatePath } from 'next/cache';
import sql from '@/lib/db';

// ── A1: Users ────────────────────────────────────────────────────────────────

export async function createUser(formData: FormData) {
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
  const id = formData.get('id') as string;
  await sql`DELETE FROM users WHERE id = ${parseInt(id)}`;
  revalidatePath('/admin/users');
  return { success: true };
}

// ── A3: Timeframes ───────────────────────────────────────────────────────────

export async function createTimeframe(formData: FormData) {
  const label = formData.get('label') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;

  await sql`
    INSERT INTO timeframes (label, start_date, end_date)
    VALUES (${label}, ${start_date}, ${end_date})
  `;
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function updateTimeframe(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  const label = formData.get('label') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;

  await sql`
    UPDATE timeframes SET label = ${label}, start_date = ${start_date}, end_date = ${end_date}
    WHERE id = ${id}
  `;
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function deleteTimeframe(formData: FormData) {
  const id = formData.get('id') as string;
  try {
    await sql`DELETE FROM timeframes WHERE id = ${parseInt(id)}`;
  } catch {
    return { error: 'Timeframe in use by a section.' };
  }
  revalidatePath('/admin/timeframes');
  revalidatePath('/admin/courses');
  return { success: true };
}

// ── A2: Courses & Sections ───────────────────────────────────────────────────

export async function createCourseWithSection(formData: FormData) {
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

export async function deleteSection(formData: FormData) {
  const id = formData.get('id') as string;
  try {
    await sql`DELETE FROM sections WHERE id = ${parseInt(id)}`;
  } catch {
    return { error: 'Section has existing bookings.' };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

// ── A4: Assign Instructor & Enroll Students ──────────────────────────────────

export async function assignInstructor(formData: FormData) {
  const section_id = formData.get('section_id') as string;
  const instructor_id = formData.get('instructor_id') as string;

  await sql`
    UPDATE sections SET instructor_id = ${instructor_id ? parseInt(instructor_id) : null}
    WHERE id = ${parseInt(section_id)}
  `;
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function enrollStudent(formData: FormData) {
  const section_id = formData.get('section_id') as string;
  const student_id = formData.get('student_id') as string;

  try {
    await sql`
      INSERT INTO enrollments (section_id, student_id)
      VALUES (${parseInt(section_id)}, ${parseInt(student_id)})
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
  const section_id = formData.get('section_id') as string;
  const student_id = formData.get('student_id') as string;

  await sql`
    DELETE FROM enrollments
    WHERE section_id = ${parseInt(section_id)} AND student_id = ${parseInt(student_id)}
  `;
  revalidatePath('/admin/courses');
  return { success: true };
}

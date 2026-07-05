'use server';

import bcrypt from 'bcrypt';
import { revalidatePath } from 'next/cache';
import sql from '@/lib/db';
import { auth } from '@/auth';

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session) return { error: 'Not authenticated.' };

  const id = parseInt(session.user.id);
  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;

  try {
    await sql`UPDATE users SET full_name = ${full_name}, email = ${email} WHERE id = ${id}`;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') return { error: 'Email already in use.' };
    return { error: 'Failed to update profile.' };
  }

  revalidatePath('/admin/profile');
  return { success: true };
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session) return { error: 'Not authenticated.' };

  const id = parseInt(session.user.id);
  const current = formData.get('current_password') as string;
  const next = formData.get('new_password') as string;
  const confirm = formData.get('confirm_password') as string;

  if (next !== confirm) return { error: 'New passwords do not match.' };
  if (next.length < 8) return { error: 'Password must be at least 8 characters.' };

  const [user] = await sql`SELECT password_hash FROM users WHERE id = ${id}`;
  if (!user) return { error: 'User not found.' };

  const valid = await bcrypt.compare(current, user.password_hash as string);
  if (!valid) return { error: 'Current password is incorrect.' };

  const hash = await bcrypt.hash(next, 10);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id}`;

  return { success: true };
}

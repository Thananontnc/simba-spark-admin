'use server';

import bcrypt from 'bcrypt';
import sql from '@/lib/db';

export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirm = formData.get('confirm') as string;

  if (password !== confirm) {
    return { error: 'Passwords do not match.' };
  }

  const [user] = await sql`
    SELECT id, is_authorized, password_hash FROM users WHERE email = ${email}
  `;

  if (!user) {
    return { error: 'Email not authorized. Contact admin.' };
  }

  if (!user.is_authorized) {
    return { error: 'Account not authorized. Contact admin.' };
  }

  if (user.password_hash) {
    return { error: 'Account already registered. Please log in.' };
  }

  const hash = await bcrypt.hash(password, 10);

  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${user.id as number}`;

  return { success: true };
}

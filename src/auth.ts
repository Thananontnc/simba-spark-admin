import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import sql from '@/lib/db';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await sql`
          SELECT id, full_name, email, password_hash, role, is_authorized
          FROM users
          WHERE email = ${credentials.email as string}
        `;

        if (!user || !user.is_authorized || !user.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.password_hash as string);
        if (!valid) return null;

        return { id: String(user.id), name: user.full_name as string, email: user.email as string, role: user.role as string };
      },
    }),
  ],
});

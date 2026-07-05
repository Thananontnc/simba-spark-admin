import { auth } from '@/auth';
import sql from '@/lib/db';
import ProfileClient from './profile-client';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  const [user] = await sql`SELECT id, full_name, email, role, created_at FROM users WHERE id = ${parseInt(session!.user.id)}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>Manage your account details and password.</p>
      </div>
      <ProfileClient user={user as { id: number; full_name: string; email: string; role: string; created_at: string }} />
    </div>
  );
}

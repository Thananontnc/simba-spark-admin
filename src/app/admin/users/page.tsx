import sql from '@/lib/db';
import UsersPageClient from './users-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await sql`SELECT id, full_name, email, role, is_authorized FROM users ORDER BY id`;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>Users</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>Manage accounts and roles.</p>
      </div>
      <UsersPageClient users={users as Parameters<typeof UsersPageClient>[0]['users']} />
    </div>
  );
}

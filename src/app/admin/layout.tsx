import { auth, signOut } from '@/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import Sidebar from './sidebar';
import sql from '@/lib/db';
import { unstable_cache } from 'next/cache';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = parseInt(session!.user.id);

  const getUser = unstable_cache(
    async (id: number) => { const [u] = await sql`SELECT full_name, email FROM users WHERE id = ${id}`; return u; },
    [`admin-user-${userId}`],
    { tags: [`user-${userId}`], revalidate: 60 }
  );
  const user = await getUser(userId);

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', color: 'var(--tx)' }}>

      <Sidebar
        userName={(user?.full_name as string) ?? ''}
        userEmail={(user?.email as string) ?? ''}
        signOutAction={handleSignOut}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center justify-between px-4 shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          {/* Mobile brand (hidden on desktop) */}
          <div className="flex items-center gap-2 lg:hidden pl-10">
            <span className="text-xs font-semibold" style={{ color: 'var(--tx)' }}>Simba Spark</span>
          </div>
          {/* Spacer on desktop */}
          <div className="hidden lg:block" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

    </div>
  );
}

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';

const inp = 'w-full rounded-lg px-3.5 py-2.5 text-sm outline-none';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await signIn('credentials', { email: form.get('email'), password: form.get('password'), redirect: false });
    setLoading(false);
    if (result?.error) { setError('Invalid email or password.'); return; }
    const res = await fetch('/api/auth/session');
    const session = await res.json();
    const role = session?.user?.role;
    router.push(role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor' : '/student');
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/simba-logo.webp" alt="AU Simba" width={88} height={88} className="mx-auto mb-3" priority />
          <p className="text-xs" style={{ color: 'var(--tx-2)' }}>Block Course Scheduling</p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm mb-5" style={{ color: 'var(--tx)' }}>Sign in</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Email</label>
              <input name="email" type="email" required placeholder="you@simba.au"
                className={inp} style={{ background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Password</label>
              <input name="password" type="password" required placeholder="••••••••"
                className={inp} style={{ background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx)' }} />
            </div>
            {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium mt-1"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-xs mt-4" style={{ color: 'var(--tx-2)' }}>
            First time?{' '}
            <Link href="/register" className="font-medium" style={{ color: 'var(--accent)' }}>Create account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

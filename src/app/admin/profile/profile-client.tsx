'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, changePassword } from '@/app/actions/profile';

type User = { id: number; full_name: string; email: string; role: string; created_at: string };

const inp = 'w-full rounded-lg px-3.5 py-2.5 text-sm outline-none';
const inpStyle = { background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx)' } as React.CSSProperties;

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs"
      style={{
        background: type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        color: type === 'success' ? '#16a34a' : '#ef4444',
      }}>
      {type === 'success'
        ? <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      {msg}
    </div>
  );
}

export default function ProfileClient({ user }: { user: User }) {
  const router = useRouter();

  // Profile form state
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profilePending, startProfile] = useTransition();

  // Password form state
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwPending, startPw] = useTransition();
  const [showPw, setShowPw] = useState(false);

  const joinDate = new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const ROLE_COLOR: Record<string, string> = {
    admin: 'rgba(245,132,31,0.12)',
    instructor: 'rgba(59,130,246,0.12)',
    student: 'rgba(34,197,94,0.12)',
  };
  const ROLE_TEXT: Record<string, string> = {
    admin: 'var(--accent)',
    instructor: '#3b82f6',
    student: '#16a34a',
  };

  return (
    <div className="max-w-xl space-y-5">

      {/* Avatar + meta card */}
      <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: ROLE_COLOR[user.role] ?? 'var(--subtle)', color: ROLE_TEXT[user.role] ?? 'var(--tx)' }}>
          {user.full_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--tx)' }}>{user.full_name}</p>
          <p className="text-sm" style={{ color: 'var(--tx-2)' }}>{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-md font-medium capitalize"
              style={{ background: ROLE_COLOR[user.role] ?? 'var(--subtle)', color: ROLE_TEXT[user.role] ?? 'var(--tx)' }}>
              {user.role}
            </span>
            <span className="text-xs" style={{ color: 'var(--tx-2)' }}>Joined {joinDate}</span>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <Section title="Account Info" subtitle="Update your name and email.">
        <form onSubmit={e => {
          e.preventDefault();
          setProfileMsg(null);
          startProfile(async () => {
            const result = await updateProfile(new FormData(e.currentTarget));
            if (result.error) { setProfileMsg({ type: 'error', text: result.error }); return; }
            setProfileMsg({ type: 'success', text: 'Profile updated.' });
            router.refresh();
          });
        }} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Full Name</label>
            <input name="full_name" required defaultValue={user.full_name} className={inp} style={inpStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Email</label>
            <input name="email" type="email" required defaultValue={user.email} className={inp} style={inpStyle} />
          </div>
          {profileMsg && <Alert type={profileMsg.type} msg={profileMsg.text} />}
          <button type="submit" disabled={profilePending}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', opacity: profilePending ? 0.6 : 1 }}>
            {profilePending ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </Section>

      {/* Change password */}
      <Section title="Change Password" subtitle="Must be at least 8 characters.">
        <form onSubmit={e => {
          e.preventDefault();
          setPwMsg(null);
          const form = e.currentTarget;
          startPw(async () => {
            const result = await changePassword(new FormData(form));
            if (result.error) { setPwMsg({ type: 'error', text: result.error }); return; }
            setPwMsg({ type: 'success', text: 'Password changed.' });
            form.reset();
          });
        }} className="space-y-3">
          {(['current_password', 'new_password', 'confirm_password'] as const).map((name, i) => (
            <div key={name}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>
                {['Current Password', 'New Password', 'Confirm New Password'][i]}
              </label>
              <div className="relative">
                <input
                  name={name}
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={name !== 'current_password' ? 8 : 1}
                  placeholder="••••••••"
                  className={`${inp} pr-10`}
                  style={inpStyle}
                />
              </div>
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)}
              className="rounded" style={{ accentColor: 'var(--accent)' }} />
            <span className="text-xs" style={{ color: 'var(--tx-2)' }}>Show passwords</span>
          </label>
          {pwMsg && <Alert type={pwMsg.type} msg={pwMsg.text} />}
          <button type="submit" disabled={pwPending}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', opacity: pwPending ? 0.6 : 1 }}>
            {pwPending ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Section>

    </div>
  );
}

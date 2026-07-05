'use client';

import { useState, useTransition } from 'react';
import { createUser, updateUser, deleteUser } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

type User = { id: number; full_name: string; email: string; role: string; is_authorized: boolean };

const ROLE_PILL: Record<string, string> = {
  admin:      'background:#fff3e8;color:#c45f00',
  instructor: 'background:#e8f0ff;color:#2b5ce6',
  student:    'background:#e8f7ee;color:#1a7f3c',
};
const ROLE_PILL_DARK: Record<string, string> = {
  admin:      'background:#2d1a00;color:#f5841f',
  instructor: 'background:#0d1f4a;color:#7aa4ff',
  student:    'background:#0a2618;color:#4ade80',
};

function Pill({ role }: { role: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium capitalize"
      style={{ background: '#f0f0f0', color: '#555' }}
    >
      {role}
    </span>
  );
}

const inp = 'w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-xl p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-sm" style={{ color: 'var(--tx-2)', background: 'var(--subtle)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UserForm({ defaultValues, hiddenId, onClose, action }: {
  defaultValues?: Partial<User>;
  hiddenId?: number;
  onClose: () => void;
  action: (fd: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form onSubmit={e => {
      e.preventDefault();
      setError('');
      startTransition(async () => {
        const result = await action(new FormData(e.currentTarget));
        if (result.error) { setError(result.error); return; }
        router.refresh();
        onClose();
      });
    }} className="space-y-3">
      {hiddenId !== undefined && <input type="hidden" name="id" value={hiddenId} />}
      <Field label="Full Name">
        <input name="full_name" required defaultValue={defaultValues?.full_name} placeholder="Jane Doe"
          className={inp} style={{ background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx)' }} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required defaultValue={defaultValues?.email} placeholder="jane@simba.au"
          className={inp} style={{ background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx)' }} />
      </Field>
      <Field label="Role">
        <select name="role" defaultValue={defaultValues?.role ?? 'student'}
          className={inp} style={{ background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx)' }}>
          <option value="admin">Admin</option>
          <option value="instructor">Instructor</option>
          <option value="student">Student</option>
        </select>
      </Field>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending}
          className="flex-1 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)', opacity: pending ? 0.6 : 1 }}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onClose}
          className="flex-1 py-2 rounded-lg text-sm"
          style={{ background: 'var(--subtle)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function UsersPageClient({ users }: { users: User[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const router = useRouter();

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  function handleDelete(u: User) {
    if (!confirm(`Delete "${u.full_name}"?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('id', String(u.id));
      await deleteUser(fd);
      router.refresh();
    });
  }

  return (
    <>
      {adding && (
        <Modal title="Add User" onClose={() => setAdding(false)}>
          <UserForm action={createUser} onClose={() => setAdding(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit User" onClose={() => setEditing(null)}>
          <UserForm defaultValues={editing} hiddenId={editing.id} action={updateUser} onClose={() => setEditing(null)} />
        </Modal>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>All Users</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>
              {filtered.length} of {users.length} account{users.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Add User
          </button>
        </div>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--subtle)' }}>
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: 'var(--tx-2)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: 'var(--tx)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: 'var(--tx-2)' }} className="text-xs">✕</button>
            )}
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {(['all', 'admin', 'instructor', 'student'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className="px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors"
                style={{
                  background: roleFilter === r ? 'var(--accent)' : 'transparent',
                  color: roleFilter === r ? 'var(--accent-fg)' : 'var(--tx-2)',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr style={{ background: 'var(--subtle)' }}>
              {['Name', 'Email', 'Role', ''].map(h => (
                <th key={h} className={`py-2.5 px-5 text-left text-xs font-medium ${h === '' ? 'text-right' : ''}`} style={{ color: 'var(--tx-2)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <td className="px-5 py-3 font-medium text-sm" style={{ color: 'var(--tx)' }}>{u.full_name}</td>
                <td className="px-5 py-3 text-sm" style={{ color: 'var(--tx-2)' }}>{u.email}</td>
                <td className="px-5 py-3">
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium capitalize"
                    style={{ background: 'var(--subtle)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-right space-x-3">
                  <button onClick={() => setEditing(u)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Edit</button>
                  <button onClick={() => handleDelete(u)} disabled={pending} className="text-xs font-medium" style={{ color: '#ef4444', opacity: pending ? 0.5 : 1 }}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--tx-2)' }}>
                {users.length === 0 ? 'No users yet.' : 'No users match your search.'}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}

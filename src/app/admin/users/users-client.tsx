'use client';

import { useState, useTransition } from 'react';
import { createUser, updateUser, deleteUser, toggleAuthorized, adminResetPassword } from '@/app/actions/admin';
import { Toast } from '@/components/toast';

type User = { id: number; full_name: string; email: string; role: string; is_authorized: boolean };

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  admin:      { bg: 'rgba(245,132,31,0.12)',  color: '#c45f00' },
  instructor: { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  student:    { bg: 'rgba(34,197,94,0.12)',   color: '#15803d' },
};

function RolePill({ role }: { role: string }) {
  const s = ROLE_STYLE[role] ?? { bg: 'var(--subtle)', color: 'var(--tx-2)' };
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium capitalize"
      style={{ background: s.bg, color: s.color }}>
      {role}
    </span>
  );
}

function AuthBadge({ ok }: { ok: boolean }) {
  return ok ? null : (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium ml-1.5"
      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
      pending
    </span>
  );
}

const inp = 'input-premium';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{title}</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors hover:bg-[var(--subtle)]"
            style={{ color: 'var(--tx-2)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteModal({ user, onClose, onConfirm, pending }: {
  user: User; onClose: () => void; onConfirm: () => void; pending: boolean;
}) {
  return (
    <Modal title="Delete User" onClose={onClose}>
      <div className="mb-5">
        <p className="text-sm mb-1" style={{ color: 'var(--tx)' }}>
          Delete <span className="font-semibold">{user.full_name}</span>?
        </p>
        <p className="text-xs" style={{ color: 'var(--tx-2)' }}>
          This removes the account permanently. Cannot be undone.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={onConfirm} disabled={pending}
          className="flex-1 py-2 rounded-xl text-sm font-medium btn-danger"
          style={{ opacity: pending ? 0.6 : 1 }}>
          {pending ? 'Deleting…' : 'Delete'}
        </button>
        <button onClick={onClose}
          className="flex-1 py-2 rounded-xl text-sm btn-secondary">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    const fd = new FormData();
    fd.append('id', String(user.id));
    fd.append('new_password', newPassword);
    startTransition(async () => {
      const result = await adminResetPassword(fd);
      if (result?.error) { setError(result.error); return; }
      setDone(true);
    });
  }

  return (
    <Modal title="Reset Password" onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#15803d' }}>Password updated. Share these credentials with the user:</p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--tx-3)' }}>EMAIL</p>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--subtle)', border: '1px solid var(--border)' }}>
                  <span className="text-sm font-mono flex-1 select-all" style={{ color: 'var(--tx)' }}>{user.email}</span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(user.email)}
                    className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'rgba(245,132,31,0.1)' }}>
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--tx-3)' }}>NEW PASSWORD</p>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--subtle)', border: '1px solid var(--border)' }}>
                  <span className="text-sm font-mono flex-1 select-all" style={{ color: 'var(--tx)' }}>{newPassword}</span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(newPassword)}
                    className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'rgba(245,132,31,0.1)' }}>
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium btn-secondary">Close</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx-2)' }}>
            Resetting password for <span className="font-semibold" style={{ color: 'var(--tx)' }}>{user.full_name}</span>
            <span className="block mt-0.5 text-[11px]" style={{ color: 'var(--tx-3)' }}>{user.email}</span>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters" className={inp} autoComplete="new-password" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" className={inp} autoComplete="new-password" required />
          </div>
          {error && (
            <p className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-primary">
              {pending ? 'Saving…' : 'Reset Password'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function UserForm({ defaultValues, hiddenId, onClose, action, onSuccess }: {
  defaultValues?: Partial<User>;
  hiddenId?: number;
  onClose: () => void;
  onSuccess?: () => void;
  action: (fd: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <form onSubmit={e => {
      e.preventDefault();
      setError('');
      startTransition(async () => {
        const result = await action(new FormData(e.currentTarget));
        if (result.error) { setError(result.error); return; }
        onSuccess?.();
        onClose();
      });
    }} className="space-y-3.5">
      {hiddenId !== undefined && <input type="hidden" name="id" value={hiddenId} />}
      <Field label="Full Name">
        <input name="full_name" required defaultValue={defaultValues?.full_name}
          placeholder="Jane Doe" className={inp} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required defaultValue={defaultValues?.email}
          placeholder="jane@simba.au" className={inp} />
      </Field>
      <Field label="Role">
        <select name="role" defaultValue={defaultValues?.role ?? 'student'} className={inp}>
          <option value="admin">Admin</option>
          <option value="instructor">Instructor</option>
          <option value="student">Student</option>
        </select>
      </Field>
      {error && (
        <p className="text-xs rounded-lg px-3 py-2"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-primary">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function UsersPageClient({ users }: { users: User[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('id', String(deleting.id));
      const result = await deleteUser(fd);
      setDeleting(null);
      setToast(result.error ?? 'User deleted.');
    });
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {adding && <Modal title="Add User" onClose={() => setAdding(false)}>
        <UserForm action={createUser} onClose={() => setAdding(false)} onSuccess={() => setToast('User created.')} />
      </Modal>}
      {editing && <Modal title="Edit User" onClose={() => setEditing(null)}>
        <UserForm defaultValues={editing} hiddenId={editing.id} action={updateUser} onClose={() => setEditing(null)} onSuccess={() => setToast('User updated.')} />
      </Modal>}
      {deleting && <DeleteModal user={deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} pending={pending} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}

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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium btn-primary">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Add User
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--subtle)' }}>
          <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
              style={{ color: 'var(--tx-2)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: 'var(--tx)' }} />
            {search && <button onClick={() => setSearch('')} style={{ color: 'var(--tx-3)' }} className="text-xs leading-none">✕</button>}
          </div>
          <div className="flex items-center gap-1 rounded-xl p-1"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {(['all', 'admin', 'instructor', 'student'] as const).map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: roleFilter === r ? 'var(--accent)' : 'transparent',
                  color: roleFilter === r ? 'var(--accent-fg)' : 'var(--tx-2)',
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Role', 'Status', ''].map(h => (
                  <th key={h} className={`py-2.5 px-5 text-left text-xs font-medium ${h === '' ? 'text-right' : ''}`}
                    style={{ color: 'var(--tx-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className="group transition-colors hover:bg-[var(--subtle)]"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium text-sm" style={{ color: 'var(--tx)' }}>{u.full_name}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--tx-2)' }}>{u.email}</td>
                  <td className="px-5 py-3"><RolePill role={u.role} /></td>
                  <td className="px-5 py-3">
                    <form action={async (fd: FormData) => { await toggleAuthorized(fd); }}
                      className="inline-flex">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="is_authorized" value={String(u.is_authorized)} />
                      <button type="submit"
                        className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                        style={u.is_authorized
                          ? { background: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.2)' }
                          : { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }
                        }>
                        {u.is_authorized ? 'Authorized' : 'Pending'}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: 'var(--subtle)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}>
                        Edit
                      </button>
                      <button onClick={() => setResetting(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: 'rgba(59,130,246,0.08)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.18)' }}>
                        Reset PW
                      </button>
                      <button onClick={() => setDeleting(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-sm" style={{ color: 'var(--tx-2)' }}>
                  {users.length === 0 ? 'No users yet.' : 'No users match your search.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {filtered.map(u => (
            <div key={u.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--tx)' }}>
                    {u.full_name}
                    <AuthBadge ok={u.is_authorized} />
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>{u.email}</p>
                </div>
                <RolePill role={u.role} />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => setEditing(u)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium btn-secondary">Edit</button>
                <button onClick={() => setResetting(u)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(59,130,246,0.08)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.18)' }}>
                  Reset PW
                </button>
                <form action={async (fd: FormData) => { await toggleAuthorized(fd); }} className="flex-1">
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="is_authorized" value={String(u.is_authorized)} />
                  <button type="submit" className="w-full py-2 rounded-xl text-xs font-medium"
                    style={u.is_authorized
                      ? { background: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.2)' }
                      : { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }
                    }>
                    {u.is_authorized ? 'Revoke' : 'Authorize'}
                  </button>
                </form>
                <button onClick={() => setDeleting(u)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium btn-danger">Delete</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-5 py-14 text-center text-sm" style={{ color: 'var(--tx-2)' }}>
              {users.length === 0 ? 'No users yet.' : 'No match.'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

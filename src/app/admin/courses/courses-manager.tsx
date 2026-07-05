'use client';

import { useState, useTransition } from 'react';
import { createCourse, updateCourse, deleteCourse } from '@/app/actions/admin';
import { Toast } from '@/components/toast';

type Course = { id: number; course_name: string; course_code: string; credits: number };
type Section = { id: number; course_code: string };

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

function CourseForm({ defaultValues, hiddenId, onClose, onSuccess, action }: {
  defaultValues?: Partial<Course>;
  hiddenId?: number;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  action: (fd: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <form onSubmit={e => {
      e.preventDefault();
      setError('');
      const fd = new FormData(e.currentTarget);
      startTransition(async () => {
        const result = await action(fd);
        if (result.error) { setError(result.error); return; }
        onSuccess(hiddenId ? 'Course updated.' : 'Course created.');
        onClose();
      });
    }} className="space-y-3.5">
      {hiddenId !== undefined && <input type="hidden" name="id" value={hiddenId} />}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Course Code</label>
        <input name="course_code" required defaultValue={defaultValues?.course_code}
          placeholder="CS101" className="input-premium" style={{ textTransform: 'uppercase' }} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Course Name</label>
        <input name="course_name" required defaultValue={defaultValues?.course_name}
          placeholder="Introduction to Programming" className="input-premium" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Credits</label>
        <input name="credits" type="number" min={1} max={12} defaultValue={defaultValues?.credits ?? 3}
          className="input-premium" />
      </div>
      {error && (
        <p className="text-xs rounded-lg px-3 py-2"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending} className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-primary">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function CoursesManager({ courses, sections }: { courses: Course[]; sections: Section[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [search, setSearch] = useState('');
  const [, startMutation] = useTransition();

  const sectionCount = (code: string) => sections.filter(s => s.course_code === code).length;

  const q = search.toLowerCase();
  const filtered = !q ? courses : courses.filter(c =>
    c.course_code.toLowerCase().includes(q) || c.course_name.toLowerCase().includes(q));

  function ok(msg: string) { setToastType('success'); setToast(msg); }

  function handleDelete(c: Course) {
    const n = sectionCount(c.course_code);
    if (n > 0) {
      setToastType('error');
      setToast(`${c.course_code} has ${n} section${n !== 1 ? 's' : ''} — delete those first.`);
      return;
    }
    if (!confirm(`Delete course ${c.course_code} — ${c.course_name}?`)) return;
    startMutation(async () => {
      const fd = new FormData();
      fd.append('id', String(c.id));
      const result = await deleteCourse(fd);
      if (result.error) { setToastType('error'); setToast(result.error); }
      else ok('Course deleted.');
    });
  }

  return (
    <>
      {toast && <Toast message={toast} type={toastType} onDone={() => setToast(null)} />}
      {adding && (
        <Modal title="Add Course" onClose={() => setAdding(false)}>
          <CourseForm action={createCourse} onClose={() => setAdding(false)} onSuccess={ok} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit Course" onClose={() => setEditing(null)}>
          <CourseForm defaultValues={editing} hiddenId={editing.id} action={updateCourse}
            onClose={() => setEditing(null)} onSuccess={ok} />
        </Modal>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Course Catalog</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>
              {filtered.length} of {courses.length} course{courses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium btn-primary">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Add Course
          </button>
        </div>

        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--subtle)' }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: 'var(--tx-2)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by code or name…"
              className="flex-1 text-sm outline-none bg-transparent" style={{ color: 'var(--tx)' }} />
            {search && <button onClick={() => setSearch('')} style={{ color: 'var(--tx-3)' }} className="text-xs leading-none">✕</button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
                {['Code', 'Course Name', 'Credits', 'Sections', ''].map(h => (
                  <th key={h} className={`py-2.5 px-5 text-left text-xs font-medium ${h === '' ? 'text-right' : ''}`}
                    style={{ color: 'var(--tx-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const n = sectionCount(c.course_code);
                return (
                  <tr key={c.id} className="group transition-colors hover:bg-[var(--subtle)]"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide"
                        style={{ background: 'rgba(245,132,31,0.13)', color: 'var(--accent)' }}>
                        {c.course_code}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--tx)' }}>{c.course_name}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--tx-2)' }}>{c.credits}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: n > 0 ? 'rgba(34,197,94,0.1)' : 'var(--subtle)', color: n > 0 ? '#15803d' : 'var(--tx-3)' }}>
                        {n}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditing(c)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'var(--subtle)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(c)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium btn-danger">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-sm" style={{ color: 'var(--tx-2)' }}>
                  {courses.length === 0 ? 'No courses yet — add the first one.' : 'No courses match your search.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

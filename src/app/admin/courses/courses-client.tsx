'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSection, assignInstructor, enrollStudent, unenrollStudent } from '@/app/actions/admin';
import { Toast } from '@/components/toast';

type Section = {
  id: number; course_name: string; course_code: string; credits: number;
  section_number: string; room: string | null; timeframe_label: string | null;
  instructor_id: number | null; instructor_name: string | null; enrolled_count: number;
};
type User = { id: number; full_name: string };
type Enrollment = { section_id: number; student_id: number; student_name: string };

function DeleteModal({ name, onClose, onConfirm, pending }: {
  name: string; onClose: () => void; onConfirm: () => void; pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--tx)' }}>Delete Section</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--tx)' }}>
          Delete <span className="font-semibold">{name}</span>?
        </p>
        <p className="text-xs mb-5" style={{ color: 'var(--tx-2)' }}>
          Removes the section, all enrollments and bookings. Cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={pending}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-danger"
            style={{ opacity: pending ? 0.6 : 1 }}>
            {pending ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SectionRow({ sec, enrolled, available, instructors, onDelete }: {
  sec: Section; enrolled: Enrollment[]; available: User[];
  instructors: User[]; onDelete: (sec: Section) => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* Header row — div not button to avoid nested button bug */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors hover:bg-[var(--subtle)]"
        style={{ background: open ? 'var(--subtle)' : 'transparent' }}
        onClick={() => setOpen(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(v => !v); }}>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--tx)' }}>{sec.course_name}</span>
            <span className="text-sm shrink-0" style={{ color: 'var(--tx-2)' }}>{sec.course_code}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--tx-2)' }}>{sec.section_number}</span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--tx-2)' }}>{sec.credits} cr</span>
            {sec.room && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--tx-2)' }}>{sec.room}</span>}
            {sec.timeframe_label && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(245,132,31,0.12)', color: 'var(--accent)' }}>{sec.timeframe_label}</span>}
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>
              {sec.enrolled_count} student{sec.enrolled_count !== 1 ? 's' : ''}
            </span>
            {sec.instructor_name && <span className="text-xs" style={{ color: 'var(--tx-3)' }}>{sec.instructor_name}</span>}
          </div>
        </div>

        {/* Actions — stop propagation so clicks don't toggle accordion */}
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onDelete(sec)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium btn-danger">
            Delete
          </button>
          <svg
            width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
            style={{ color: 'var(--tx-3)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', pointerEvents: 'none' }}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t divide-y divide-[var(--border)] animate-fade-in" style={{ borderColor: 'var(--border)' }}>

          {/* Instructor */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tx-2)' }}>Instructor</p>
            {sec.instructor_name
              ? <p className="text-sm font-medium mb-3" style={{ color: 'var(--tx)' }}>{sec.instructor_name}</p>
              : <p className="text-xs mb-3 italic" style={{ color: 'var(--tx-3)' }}>Not assigned</p>
            }
            <form action={async (fd: FormData) => { await assignInstructor(fd); router.refresh(); }} className="flex gap-2 max-w-sm">
              <input type="hidden" name="section_id" value={sec.id} />
              <select name="instructor_id" defaultValue={sec.instructor_id ?? ''} className="flex-1 input-premium">
                <option value="">— unassigned —</option>
                {instructors.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <button type="submit" className="px-3 py-2 rounded-xl text-xs font-medium btn-primary">Save</button>
            </form>
          </div>

          {/* Students */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tx-2)' }}>
              Students <span style={{ color: 'var(--accent)' }}>({sec.enrolled_count})</span>
            </p>
            <form action={async (fd: FormData) => { await enrollStudent(fd); router.refresh(); }} className="flex gap-2 mb-3 max-w-sm">
              <input type="hidden" name="section_id" value={sec.id} />
              <select name="student_id" className="flex-1 input-premium">
                <option value="">Add student…</option>
                {available.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <button type="submit" className="px-3 py-2 rounded-xl text-xs font-medium btn-primary">Enroll</button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {enrolled.map(e => (
                <div key={e.student_id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--subtle)' }}>
                  <span className="text-xs truncate mr-2" style={{ color: 'var(--tx)' }}>{e.student_name}</span>
                  <form action={async (fd: FormData) => { await unenrollStudent(fd); router.refresh(); }} className="shrink-0">
                    <input type="hidden" name="section_id" value={sec.id} />
                    <input type="hidden" name="student_id" value={e.student_id} />
                    <button type="submit" className="text-[11px] font-medium px-2 py-0.5 rounded btn-danger">Remove</button>
                  </form>
                </div>
              ))}
              {enrolled.length === 0 && <p className="text-xs italic col-span-3 px-1" style={{ color: 'var(--tx-3)' }}>No students enrolled.</p>}
            </div>
            {enrolled.length > 6 && (
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--tx-3)' }}>Scroll · {enrolled.length} students total</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default function CoursesClient({ sections, instructors, students, enrollments }: {
  sections: Section[]; instructors: User[]; students: User[]; enrollments: Enrollment[];
}) {
  const [deleting, setDeleting] = useState<Section | null>(null);
  const [deletePending, startDelete] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  function confirmDelete() {
    if (!deleting) return;
    startDelete(async () => {
      const fd = new FormData();
      fd.append('id', String(deleting.id));
      const result = await deleteSection(fd);
      setToast(result?.error ?? 'Section deleted.');
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <>
      {toast && <Toast message={toast} type={toast.includes('deleted') ? 'success' : 'error'} onDone={() => setToast(null)} />}
      {deleting && <DeleteModal
        name={`${deleting.course_name} — ${deleting.section_number}`}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        pending={deletePending}
      />}
      <div className="space-y-2">
        {sections.map(sec => {
          const enrolled = enrollments.filter(e => e.section_id === sec.id);
          const available = students.filter(u => !enrolled.find(e => e.student_id === u.id));
          return <SectionRow key={sec.id} sec={sec} enrolled={enrolled} available={available} instructors={instructors} onDelete={setDeleting} />;
        })}
        {sections.length === 0 && (
          <div className="rounded-xl p-12 text-center text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--tx-2)' }}>
            No sections yet. Create one above.
          </div>
        )}
      </div>
    </>
  );
}

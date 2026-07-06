'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSection, updateSection, assignInstructor, enrollStudent, unenrollStudent, bulkEnrollStudents } from '@/app/actions/admin';
import { Toast } from '@/components/toast';

type Section = {
  id: number; course_name: string; course_code: string; credits: number;
  section_number: string; room: string | null; timeframe_label: string | null;
  timeframe_id: number | null; instructor_id: number | null; instructor_name: string | null; enrolled_count: number;
};
type User = { id: number; full_name: string };
type Enrollment = { section_id: number; student_id: number; student_name: string };
type Timeframe = { id: number; label: string };

function DeleteModal({ name, onClose, onConfirm, pending }: { name: string; onClose: () => void; onConfirm: () => void; pending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--tx)' }}>Delete Section</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--tx)' }}>Delete <span className="font-semibold">{name}</span>?</p>
        <p className="text-xs mb-5" style={{ color: 'var(--tx-2)' }}>Removes section, all enrollments and bookings. Cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={pending} className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-danger" style={{ opacity: pending ? 0.6 : 1 }}>{pending ? 'Deleting…' : 'Delete'}</button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ sec, timeframes, onClose, onSuccess }: { sec: Section; timeframes: Timeframe[]; onClose: () => void; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Edit Section</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-[var(--subtle)]" style={{ color: 'var(--tx-2)' }}>✕</button>
        </div>
        <p className="text-xs mb-4 font-medium" style={{ color: 'var(--accent)' }}>{sec.course_code} — {sec.course_name}</p>
        <form onSubmit={e => {
          e.preventDefault(); setError('');
          startTransition(async () => {
            const result = await updateSection(new FormData(e.currentTarget));
            if (result?.error) { setError(String(result.error)); return; }
            router.refresh(); onSuccess(); onClose();
          });
        }} className="space-y-3">
          <input type="hidden" name="id" value={sec.id} />
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Section No.</label>
            <input name="section_number" defaultValue={sec.section_number} required className="input-premium" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Room</label>
            <input name="room" defaultValue={sec.room ?? ''} placeholder="Room A72" className="input-premium" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Timeframe</label>
            <select name="timeframe_id" defaultValue={sec.timeframe_id ?? ''} className="input-premium">
              <option value="">— none —</option>
              {timeframes.map(tf => <option key={tf.id} value={tf.id}>{tf.label}</option>)}
            </select>
          </div>
          {error && <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending} className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-primary" style={{ opacity: pending ? 0.6 : 1 }}>{pending ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkEnrollModal({ sec, available, onClose, onSuccess }: { sec: Section; available: User[]; onClose: () => void; onSuccess: (msg: string) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: number) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function handleSubmit() {
    if (!selected.size) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('section_id', String(sec.id));
      selected.forEach(id => fd.append('student_ids[]', String(id)));
      const result = await bulkEnrollStudents(fd);
      router.refresh();
      if (result && 'enrolled' in result) {
        const enrolled = result.enrolled as number;
        const skipped = (result.skipped as number | undefined) ?? 0;
        const msg = skipped > 0
          ? `Enrolled ${enrolled} student${enrolled !== 1 ? 's' : ''}. ${skipped} skipped (block conflict).`
          : `Enrolled ${enrolled} student${enrolled !== 1 ? 's' : ''}.`;
        onSuccess(msg);
      } else {
        onSuccess('Students enrolled.');
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Bulk Enroll Students</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-[var(--subtle)]" style={{ color: 'var(--tx-2)' }}>✕</button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--tx-2)' }}>{sec.course_code} — {sec.section_number} · {selected.size} selected</p>

        {available.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--tx-3)' }}>All students already enrolled.</p>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => setSelected(new Set(available.map(u => u.id)))} className="text-xs px-3 py-1.5 rounded-lg btn-secondary">Select all</button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs px-3 py-1.5 rounded-lg btn-secondary">Clear</button>
            </div>
            <div className="space-y-1 overflow-y-auto mb-4" style={{ maxHeight: '260px' }}>
              {available.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-[var(--subtle)]">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)}
                    className="w-4 h-4 rounded accent-[var(--accent)]" />
                  <span className="text-sm" style={{ color: 'var(--tx)' }}>{u.full_name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={pending || !selected.size}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-primary"
                style={{ opacity: pending || !selected.size ? 0.6 : 1 }}>
                {pending ? 'Enrolling…' : `Enroll ${selected.size || ''} Student${selected.size !== 1 ? 's' : ''}`}
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionRow({ sec, enrolled, available, instructors, timeframes, onDelete, onEdit, onBulkEnroll }: {
  sec: Section; enrolled: Enrollment[]; available: User[]; instructors: User[]; timeframes: Timeframe[];
  onDelete: (s: Section) => void; onEdit: (s: Section) => void; onBulkEnroll: (s: Section) => void;
}) {
  const [open, setOpen] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollPending, startEnroll] = useTransition();
  const [unenrollPending, startUnenroll] = useTransition();
  const router = useRouter();

  const noInstructor = !sec.instructor_id;
  const noStudents = sec.enrolled_count === 0;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: `1px solid ${noInstructor || noStudents ? 'rgba(245,132,31,0.3)' : 'var(--border)'}` }}>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors hover:bg-[var(--subtle)]"
        style={{ background: open ? 'var(--subtle)' : 'transparent' }}
        onClick={() => setOpen(v => !v)} role="button" tabIndex={0}
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
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>{sec.enrolled_count} student{sec.enrolled_count !== 1 ? 's' : ''}</span>
            {sec.instructor_name && <span className="text-xs" style={{ color: 'var(--tx-3)' }}>{sec.instructor_name}</span>}
            {noInstructor && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(245,132,31,0.12)', color: 'var(--accent)' }}>⚠ No instructor</span>}
            {noStudents && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(245,132,31,0.12)', color: 'var(--accent)' }}>⚠ No students</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => onEdit(sec)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium btn-secondary">Edit</button>
          <button type="button" onClick={() => onDelete(sec)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium btn-danger">Delete</button>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
            style={{ color: 'var(--tx-3)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', pointerEvents: 'none' }}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </div>

      {open && (
        <div className="border-t divide-y divide-[var(--border)] animate-fade-in" style={{ borderColor: 'var(--border)' }}>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tx-2)' }}>Instructor</p>
            {sec.instructor_name ? <p className="text-sm font-medium mb-3" style={{ color: 'var(--tx)' }}>{sec.instructor_name}</p> : <p className="text-xs mb-3 italic" style={{ color: 'var(--tx-3)' }}>Not assigned</p>}
            <form action={async (fd: FormData) => { await assignInstructor(fd); }} className="flex gap-2 max-w-sm">
              <input type="hidden" name="section_id" value={sec.id} />
              <select name="instructor_id" defaultValue={sec.instructor_id ?? ''} className="flex-1 input-premium">
                <option value="">— unassigned —</option>
                {instructors.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <button type="submit" className="px-3 py-2 rounded-xl text-xs font-medium btn-primary">Save</button>
            </form>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tx-2)' }}>
                Students <span style={{ color: 'var(--accent)' }}>({sec.enrolled_count})</span>
              </p>
              {available.length > 0 && (
                <button type="button" onClick={() => onBulkEnroll(sec)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium btn-secondary">
                  + Bulk Enroll
                </button>
              )}
            </div>
            <form className="flex gap-2 mb-1 max-w-sm" onSubmit={e => {
              e.preventDefault();
              setEnrollError('');
              const fd = new FormData(e.currentTarget);
              if (!fd.get('student_id')) return;
              startEnroll(async () => {
                const result = await enrollStudent(fd);
                if (result?.error) { setEnrollError(result.error); return; }
                router.refresh();
                (e.target as HTMLFormElement).reset();
              });
            }}>
              <input type="hidden" name="section_id" value={sec.id} />
              <select name="student_id" className="flex-1 input-premium">
                <option value="">Add student…</option>
                {available.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <button type="submit" disabled={enrollPending} className="px-3 py-2 rounded-xl text-xs font-medium btn-primary"
                style={{ opacity: enrollPending ? 0.6 : 1 }}>
                {enrollPending ? '…' : 'Enroll'}
              </button>
            </form>
            {enrollError && (
              <p className="text-xs rounded-lg px-3 py-1.5 mb-2 max-w-sm"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {enrollError}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {enrolled.map(e => (
                <div key={e.student_id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--subtle)' }}>
                  <span className="text-xs truncate mr-2" style={{ color: 'var(--tx)' }}>{e.student_name}</span>
                  <button type="button" disabled={unenrollPending}
                    className="text-[11px] font-medium px-2 py-0.5 rounded btn-danger shrink-0"
                    style={{ opacity: unenrollPending ? 0.6 : 1 }}
                    onClick={() => {
                      const fd = new FormData();
                      fd.append('section_id', String(sec.id));
                      fd.append('student_id', String(e.student_id));
                      startUnenroll(async () => { await unenrollStudent(fd); router.refresh(); });
                    }}>
                    Remove
                  </button>
                </div>
              ))}
              {enrolled.length === 0 && <p className="text-xs italic col-span-3 px-1" style={{ color: 'var(--tx-3)' }}>No students enrolled.</p>}
            </div>
            {enrolled.length > 6 && <p className="text-[10px] mt-1.5" style={{ color: 'var(--tx-3)' }}>Scroll · {enrolled.length} students total</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoursesClient({ sections, instructors, students, enrollments, timeframes }: {
  sections: Section[]; instructors: User[]; students: User[]; enrollments: Enrollment[]; timeframes: Timeframe[];
}) {
  const [deleting, setDeleting] = useState<Section | null>(null);
  const [editing, setEditing] = useState<Section | null>(null);
  const [bulkTarget, setBulkTarget] = useState<Section | null>(null);
  const [deletePending, startDelete] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  function confirmDelete() {
    if (!deleting) return;
    startDelete(async () => {
      const fd = new FormData(); fd.append('id', String(deleting.id));
      const result = await deleteSection(fd);
      setToast(result?.error ? { message: result.error, type: 'error' } : { message: 'Section deleted.', type: 'success' });
      setDeleting(null); router.refresh();
    });
  }

  const noInstructorCount = sections.filter(s => !s.instructor_id).length;
  const noStudentCount = sections.filter(s => s.enrolled_count === 0).length;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      {deleting && <DeleteModal name={`${deleting.course_name} — ${deleting.section_number}`} onClose={() => setDeleting(null)} onConfirm={confirmDelete} pending={deletePending} />}
      {editing && <EditModal sec={editing} timeframes={timeframes} onClose={() => setEditing(null)} onSuccess={() => setToast({ message: 'Section updated.', type: 'success' })} />}
      {bulkTarget && <BulkEnrollModal sec={bulkTarget} available={students.filter(u => !enrollments.find(e => e.section_id === bulkTarget.id && e.student_id === u.id))} onClose={() => setBulkTarget(null)} onSuccess={(msg) => setToast({ message: msg, type: 'success' })} />}

      {(noInstructorCount > 0 || noStudentCount > 0) && (
        <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3" style={{ background: 'rgba(245,132,31,0.07)', border: '1px solid rgba(245,132,31,0.2)' }}>
          <span style={{ color: 'var(--accent)' }}>⚠</span>
          <p className="text-xs" style={{ color: 'var(--tx-2)' }}>
            {noInstructorCount > 0 && <span>{noInstructorCount} section{noInstructorCount !== 1 ? 's' : ''} without instructor. </span>}
            {noStudentCount > 0 && <span>{noStudentCount} section{noStudentCount !== 1 ? 's' : ''} without students.</span>}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {sections.map(sec => {
          const enrolled = enrollments.filter(e => e.section_id === sec.id);
          const available = students.filter(u => !enrolled.find(e => e.student_id === u.id));
          return <SectionRow key={sec.id} sec={sec} enrolled={enrolled} available={available} instructors={instructors} timeframes={timeframes} onDelete={setDeleting} onEdit={setEditing} onBulkEnroll={setBulkTarget} />;
        })}
        {sections.length === 0 && (
          <div className="rounded-xl p-12 text-center text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--tx-2)' }}>No sections yet. Create one above.</div>
        )}
      </div>
    </>
  );
}

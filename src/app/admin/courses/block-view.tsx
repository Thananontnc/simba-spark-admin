'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addSectionInstructorSilent,
  removeSectionInstructorSilent,
  enrollStudentSilent,
  unenrollStudentSilent,
  deleteSectionSilent,
  deleteTimeframeCascade,
} from '@/app/actions/admin';
import CreateSectionForm from './create-section-form';

type Course     = { id: number; course_name: string; course_code: string; credits: number };
type Timeframe  = { id: number; label: string; start_date: string; end_date: string; semester_id: number | null };
type Semester   = { id: number; name: string };
type Instructor = { id: number; full_name: string };
type Student    = { id: number; full_name: string };
type Enrollment = { section_id: number; student_id: number; student_name: string };

type Section = {
  id: number; course_name: string; course_code: string; credits: number;
  section_number: string; room: string | null; timeframe_id: number | null;
  timeframe_label: string | null; enrolled_count: number; booking_count: number;
  instructors: Instructor[];
};

type Props = {
  sections: Section[]; courses: Course[]; timeframes: Timeframe[];
  semesters: Semester[];
  instructors: Instructor[]; students: Student[]; enrollments: Enrollment[];
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function SectionCard({
  sec, allInstructors, allStudents, enrollments, onRemove,
}: {
  sec: Section; allInstructors: Instructor[]; allStudents: Student[];
  enrollments: Enrollment[]; onRemove: (id: number) => void;
}) {
  const [instructors, setInstructors] = useState<Instructor[]>(sec.instructors);
  const [enrolled, setEnrolled] = useState<Enrollment[]>(enrollments.filter(e => e.section_id === sec.id));
  const [showStudents, setShowStudents] = useState(false);
  const [, startMutation] = useTransition();

  // Server data wins whenever fresh props arrive (revalidation after create/edit),
  // otherwise optimistic state goes stale and hides real changes.
  useEffect(() => { setInstructors(sec.instructors); }, [sec.instructors]);
  useEffect(() => { setEnrolled(enrollments.filter(e => e.section_id === sec.id)); }, [enrollments, sec.id]);

  const assignedIds = new Set(instructors.map(i => i.id));
  const enrolledIds = new Set(enrolled.map(e => e.student_id));
  const availableInstructors = allInstructors.filter(i => !assignedIds.has(i.id));
  const availableStudents = allStudents.filter(s => !enrolledIds.has(s.id));

  function handleAddInstructor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const sel = e.currentTarget.querySelector<HTMLSelectElement>('select[name="instructor_id"]');
    const id = parseInt(sel?.value ?? '');
    if (!id) return;
    const inst = allInstructors.find(i => i.id === id);
    if (!inst) return;
    setInstructors(prev => [...prev, inst]);
    if (sel) sel.value = '';
    startMutation(async () => {
      const result = await addSectionInstructorSilent(sec.id, id);
      if (result?.error) {
        setInstructors(prev => prev.filter(i => i.id !== id));
        alert(result.error);
      }
    });
  }

  function handleRemoveInstructor(instructorId: number) {
    setInstructors(prev => prev.filter(i => i.id !== instructorId));
    startMutation(async () => {
      const result = await removeSectionInstructorSilent(sec.id, instructorId);
      if (result?.error) {
        const inst = allInstructors.find(i => i.id === instructorId);
        if (inst) setInstructors(prev => [...prev, inst]);
        alert(result.error);
      }
    });
  }

  function handleEnrollStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const sel = e.currentTarget.querySelector<HTMLSelectElement>('select[name="student_id"]');
    const id = parseInt(sel?.value ?? '');
    if (!id) return;
    const student = allStudents.find(s => s.id === id);
    if (!student) return;
    setEnrolled(prev => [...prev, { section_id: sec.id, student_id: id, student_name: student.full_name }]);
    if (sel) sel.value = '';
    startMutation(async () => {
      const result = await enrollStudentSilent(sec.id, id);
      if (result?.error) {
        setEnrolled(prev => prev.filter(e => e.student_id !== id));
        alert(result.error);
      }
    });
  }

  function handleUnenroll(studentId: number) {
    setEnrolled(prev => prev.filter(e => e.student_id !== studentId));
    startMutation(() => unenrollStudentSilent(sec.id, studentId));
  }

  function handleDelete() {
    if (!confirm(`Delete ${sec.course_code} — ${sec.section_number}? This removes all enrollments and bookings.`)) return;
    onRemove(sec.id);
    startMutation(async () => {
      const result = await deleteSectionSilent(sec.id);
      if (!result.success) {
        alert('Failed to delete section — please refresh and try again.');
        window.location.reload();
      }
    });
  }

  return (
    <div className="rounded-2xl flex flex-col overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide"
              style={{ background: 'rgba(245,132,31,0.13)', color: 'var(--accent)' }}>
              {sec.course_code}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium"
              style={{ background: 'var(--subtle)', color: 'var(--tx-2)' }}>
              {sec.section_number}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md"
              style={{ background: 'var(--subtle)', color: 'var(--tx-3)' }}>
              {sec.credits} cr
            </span>
          </div>
          <button onClick={handleDelete}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs btn-danger">
            ✕
          </button>
        </div>
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--tx)' }}>{sec.course_name}</p>
        {sec.room && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--tx-3)' }}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {sec.room}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 text-center divide-x"
        style={{ borderBottom: '1px solid var(--border)', borderColor: 'var(--border)' }}>
        <div className="py-2.5">
          <p className="text-base font-bold" style={{ color: 'var(--tx)' }}>{enrolled.length}</p>
          <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--tx-3)' }}>Students</p>
        </div>
        <div className="py-2.5">
          <p className="text-base font-bold" style={{ color: sec.booking_count > 0 ? 'var(--accent)' : 'var(--tx)' }}>{sec.booking_count}</p>
          <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--tx-3)' }}>Bookings</p>
        </div>
      </div>

      {/* Instructors */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--tx-3)' }}>Instructors</p>
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
          {instructors.map(inst => (
            <span key={inst.id}
              className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(245,132,31,0.1)', color: 'var(--accent)', border: '1px solid rgba(245,132,31,0.2)' }}>
              {inst.full_name}
              <button type="button" onClick={() => handleRemoveInstructor(inst.id)}
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] hover:bg-[rgba(245,132,31,0.2)] transition-colors ml-0.5">
                ✕
              </button>
            </span>
          ))}
          {instructors.length === 0 && (
            <span className="text-[11px] italic" style={{ color: 'var(--tx-3)' }}>No instructor assigned</span>
          )}
        </div>
        {availableInstructors.length > 0 && (
          <form onSubmit={handleAddInstructor} className="flex gap-2">
            <input type="hidden" name="section_id" value={sec.id} />
            <select name="instructor_id" className="flex-1 input-premium" style={{ paddingTop: '6px', paddingBottom: '6px', fontSize: '12px' }}>
              <option value="">Add instructor…</option>
              {availableInstructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
            </select>
            <button type="submit" className="px-3 rounded-xl text-xs font-medium btn-primary shrink-0">Add</button>
          </form>
        )}
      </div>

      {/* Students */}
      <div className="px-4 py-3">
        <button type="button" onClick={() => setShowStudents(v => !v)}
          className="flex items-center justify-between w-full mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--tx-3)' }}>
            Students <span style={{ color: 'var(--accent)' }}>({enrolled.length})</span>
          </p>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
            style={{ color: 'var(--tx-3)', transform: showStudents ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        {showStudents && (
          <div className="animate-fade-in">
            {availableStudents.length > 0 && (
              <form onSubmit={handleEnrollStudent} className="flex gap-2 mb-2">
                <input type="hidden" name="section_id" value={sec.id} />
                <select name="student_id" className="flex-1 input-premium" style={{ paddingTop: '6px', paddingBottom: '6px', fontSize: '12px' }}>
                  <option value="">Add student…</option>
                  {availableStudents.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                <button type="submit" className="px-3 rounded-xl text-xs font-medium btn-primary shrink-0">Add</button>
              </form>
            )}
            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: '180px' }}>
              {enrolled.map(e => (
                <div key={e.student_id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'var(--subtle)' }}>
                  <span className="text-xs truncate mr-2" style={{ color: 'var(--tx)' }}>{e.student_name}</span>
                  <button type="button" onClick={() => handleUnenroll(e.student_id)}
                    className="text-[10px] px-2 py-0.5 rounded btn-danger shrink-0">Remove</button>
                </div>
              ))}
              {enrolled.length === 0 && (
                <p className="text-xs italic py-2" style={{ color: 'var(--tx-3)' }}>No students enrolled.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlockView({ sections, courses, timeframes, semesters, instructors, students, enrollments }: Props) {
  const router = useRouter();
  const firstSem = semesters[0]?.id ?? null;
  const [selectedSem, setSelectedSem] = useState<number | null>(firstSem);

  // Blocks visible in the selected semester (or all if no semesters defined)
  const visibleTimeframes = selectedSem === null
    ? timeframes
    : timeframes.filter(tf => tf.semester_id === selectedSem);

  const [selectedTf, setSelectedTf] = useState<number | null>(visibleTimeframes[0]?.id ?? null);
  const [showAddForm, setShowAddForm] = useState(false);
  // Derive from props (always fresh after revalidation) minus optimistic deletions,
  // instead of copying props into state once and going stale.
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [deletingBlock, startBlockDelete] = useTransition();
  const localSections = sections.filter(s => !deletedIds.has(s.id));

  const currentTf = visibleTimeframes.find(tf => tf.id === selectedTf);
  const blockSections = selectedTf === null
    ? localSections.filter(s => !s.timeframe_id)
    : localSections.filter(s => s.timeframe_id === selectedTf);

  const noInstructorCount = blockSections.filter(s => s.instructors.length === 0).length;
  const noStudentCount    = blockSections.filter(s => enrollments.filter(e => e.section_id === s.id).length === 0).length;

  function removeSection(id: number) {
    setDeletedIds(prev => new Set(prev).add(id));
  }

  function handleDeleteBlock() {
    if (!currentTf) return;
    const n = blockSections.length;
    const detail = n > 0
      ? `\n\nThis also deletes its ${n} section${n !== 1 ? 's' : ''} with all enrollments and bookings.`
      : '';
    if (!confirm(`Delete ${currentTf.label}?${detail}\n\nThis cannot be undone.`)) return;
    startBlockDelete(async () => {
      const fd = new FormData();
      fd.append('id', String(currentTf.id));
      const result = await deleteTimeframeCascade(fd);
      if (result?.error) { alert(result.error); return; }
      setSelectedTf(visibleTimeframes.find(tf => tf.id !== currentTf.id)?.id ?? null);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Semester selector */}
      {semesters.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--tx-3)' }}>Semester</p>
          <div className="flex gap-2 flex-wrap">
            {semesters.map(sem => {
              const active = selectedSem === sem.id;
              return (
                <button key={sem.id}
                  onClick={() => {
                    setSelectedSem(sem.id);
                    const first = timeframes.find(tf => tf.semester_id === sem.id);
                    setSelectedTf(first?.id ?? null);
                    setShowAddForm(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: active ? 'var(--tx)' : 'var(--surface)',
                    color: active ? 'var(--bg)' : 'var(--tx-2)',
                    border: `1px solid ${active ? 'var(--tx)' : 'var(--border)'}`,
                    boxShadow: active ? 'var(--shadow)' : 'var(--shadow-sm)',
                  }}>
                  {sem.name}
                </button>
              );
            })}
            <button
              onClick={() => { setSelectedSem(null); setSelectedTf(timeframes[0]?.id ?? null); setShowAddForm(false); }}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: selectedSem === null ? 'var(--tx)' : 'var(--surface)',
                color: selectedSem === null ? 'var(--bg)' : 'var(--tx-2)',
                border: `1px solid ${selectedSem === null ? 'var(--tx)' : 'var(--border)'}`,
                boxShadow: 'var(--shadow-sm)',
              }}>
              All
            </button>
          </div>
        </div>
      )}

      {/* Block selector */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--tx-3)' }}>Select Block</p>
        <div className="flex gap-2 flex-wrap">
          {visibleTimeframes.map(tf => {
            const active = selectedTf === tf.id;
            return (
              <button key={tf.id} onClick={() => { setSelectedTf(tf.id); setShowAddForm(false); }}
                className="flex flex-col items-start px-4 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: active ? 'var(--accent)' : 'var(--surface)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: active ? '0 2px 10px rgba(245,132,31,0.28)' : 'var(--shadow-sm)',
                }}>
                <span className="text-xs font-bold" style={{ color: active ? '#fff' : 'var(--tx)' }}>{tf.label}</span>
                <span className="text-[10px]" style={{ color: active ? 'rgba(255,255,255,0.72)' : 'var(--tx-3)' }}>
                  {fmtDate(tf.start_date)} – {fmtDate(tf.end_date)}
                </span>
              </button>
            );
          })}
          <button onClick={() => { setSelectedTf(null); setShowAddForm(false); }}
            className="flex flex-col items-start px-4 py-2.5 rounded-xl text-left transition-all"
            style={{
              background: selectedTf === null ? 'var(--accent)' : 'var(--surface)',
              border: `1px solid ${selectedTf === null ? 'var(--accent)' : 'var(--border)'}`,
              boxShadow: selectedTf === null ? '0 2px 10px rgba(245,132,31,0.28)' : 'var(--shadow-sm)',
            }}>
            <span className="text-xs font-bold" style={{ color: selectedTf === null ? '#fff' : 'var(--tx)' }}>Unscheduled</span>
            <span className="text-[10px]" style={{ color: selectedTf === null ? 'rgba(255,255,255,0.72)' : 'var(--tx-3)' }}>No block assigned</span>
          </button>
        </div>
      </div>

      {/* Block header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>
            {currentTf ? currentTf.label : 'Unscheduled Sections'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>
            {blockSections.length} section{blockSections.length !== 1 ? 's' : ''}
            {currentTf ? ` · ${fmtDate(currentTf.start_date)} – ${fmtDate(currentTf.end_date)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentTf && (
            <button onClick={handleDeleteBlock} disabled={deletingBlock}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium btn-danger"
              style={{ opacity: deletingBlock ? 0.6 : 1 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              {deletingBlock ? 'Deleting…' : 'Delete Block'}
            </button>
          )}
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium btn-primary">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            {showAddForm ? 'Cancel' : 'Add Section'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-5 animate-fade-in">
          <CreateSectionForm
            courses={courses}
            timeframes={timeframes}
            defaultTimeframeId={selectedTf ?? undefined}
            onSuccess={() => setShowAddForm(false)}
          />
        </div>
      )}

      {(noInstructorCount > 0 || noStudentCount > 0) && (
        <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3"
          style={{ background: 'rgba(245,132,31,0.07)', border: '1px solid rgba(245,132,31,0.2)' }}>
          <span style={{ color: 'var(--accent)' }}>⚠</span>
          <p className="text-xs" style={{ color: 'var(--tx-2)' }}>
            {noInstructorCount > 0 && <span>{noInstructorCount} section{noInstructorCount !== 1 ? 's' : ''} without instructor. </span>}
            {noStudentCount > 0 && <span>{noStudentCount} section{noStudentCount !== 1 ? 's' : ''} without students.</span>}
          </p>
        </div>
      )}

      {blockSections.length === 0 ? (
        <div className="rounded-2xl p-14 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--tx-2)' }}>No sections in this block</p>
          <p className="text-xs" style={{ color: 'var(--tx-3)' }}>Click "Add Section" to assign a course to this block.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {blockSections.map(sec => (
            <SectionCard
              key={sec.id}
              sec={sec}
              allInstructors={instructors}
              allStudents={students}
              enrollments={enrollments}
              onRemove={removeSection}
            />
          ))}
        </div>
      )}
    </div>
  );
}

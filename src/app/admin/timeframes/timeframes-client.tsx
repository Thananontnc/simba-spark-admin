'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSemester, updateSemester, deleteSemester,
  createTimeframe, updateTimeframe, deleteTimeframeCascade,
} from '@/app/actions/admin';
import { Toast } from '@/components/toast';

type Semester  = { id: number; name: string };
type Timeframe = { id: number; label: string; start_date: string; end_date: string; semester_id: number | null };
type ToastState = { message: string; type: 'success' | 'error' };

function toLocalISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function today() { return toLocalISO(new Date()); }
function isWeekend(s: string) { if (!s) return false; const d = new Date(s + 'T00:00:00'); return d.getDay() === 0 || d.getDay() === 6; }
function nextMonday(s: string) {
  const d = new Date(s + 'T00:00:00');
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  return toLocalISO(d);
}
function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inp = 'input-premium';

// ── Block form (create or edit) ───────────────────────────────────────────────

function BlockForm({
  semesterId, defaultValues, onSubmit, onCancel, submitLabel,
}: {
  semesterId: number;
  defaultValues?: Partial<Timeframe>;
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean }>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [label, setLabel] = useState(defaultValues?.label ?? '');
  const [startDate, setStartDate] = useState(defaultValues?.start_date?.split('T')[0] ?? '');
  const [endDate, setEndDate] = useState(defaultValues?.end_date?.split('T')[0] ?? '');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!startDate || !endDate) { setError('Both dates required.'); return; }
    if (endDate < startDate) { setError('End date must be after start.'); return; }
    if (isWeekend(startDate) || isWeekend(endDate)) { setError('Dates cannot fall on weekends.'); return; }

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await onSubmit(fd);
      if (result?.error) { setError(result.error); return; }
      router.refresh();
      onCancel();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
      {defaultValues?.id !== undefined && <input type="hidden" name="id" value={defaultValues.id} />}
      <input type="hidden" name="semester_id" value={semesterId} />

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tx-2)' }}>Block Label</label>
        <input name="label" required value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Week 1–2" className={inp} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tx-2)' }}>Start Date</label>
          <input name="start_date" type="date" required min={today()} value={startDate}
            onChange={e => {
              const v = e.target.value;
              if (isWeekend(v)) { setStartDate(nextMonday(v)); return; }
              setStartDate(v);
              if (endDate && endDate < v) setEndDate('');
            }}
            className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tx-2)' }}>End Date</label>
          <input name="end_date" type="date" required min={startDate || today()} value={endDate}
            onChange={e => {
              const v = e.target.value;
              if (isWeekend(v)) { setEndDate(nextMonday(v)); return; }
              setEndDate(v);
            }}
            className={inp} />
        </div>
      </div>
      {error && (
        <p className="text-xs rounded-lg px-3 py-2"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="flex-1 py-2 rounded-xl text-xs font-medium btn-primary"
          style={{ opacity: pending ? 0.6 : 1 }}>
          {pending ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl text-xs btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ── Edit Block modal ──────────────────────────────────────────────────────────

function EditBlockModal({ tf, semesters, onClose, onSuccess }: {
  tf: Timeframe; semesters: Semester[]; onClose: () => void; onSuccess: () => void;
}) {
  const [label, setLabel] = useState(tf.label);
  const [startDate, setStartDate] = useState(tf.start_date.split('T')[0]);
  const [endDate, setEndDate] = useState(tf.end_date.split('T')[0]);
  const [semId, setSemId] = useState<string>(String(tf.semester_id ?? ''));
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Edit Block</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-[var(--subtle)]"
            style={{ color: 'var(--tx-2)' }}>✕</button>
        </div>
        <form onSubmit={e => {
          e.preventDefault(); setError('');
          startTransition(async () => {
            const result = await updateTimeframe(new FormData(e.currentTarget));
            if (result?.error) { setError(result.error); return; }
            router.refresh(); onSuccess(); onClose();
          });
        }} className="space-y-3">
          <input type="hidden" name="id" value={tf.id} />
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tx-2)' }}>Label</label>
            <input name="label" required value={label} onChange={e => setLabel(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tx-2)' }}>Semester</label>
            <select name="semester_id" value={semId} onChange={e => setSemId(e.target.value)} className={inp}>
              <option value="">— none —</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tx-2)' }}>Start</label>
              <input name="start_date" type="date" required value={startDate}
                onChange={e => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(''); }}
                className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tx-2)' }}>End</label>
              <input name="end_date" type="date" required min={startDate} value={endDate}
                onChange={e => setEndDate(e.target.value)} className={inp} />
            </div>
          </div>
          {error && <p className="text-xs rounded-lg px-3 py-2"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-primary" style={{ opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Semester card ─────────────────────────────────────────────────────────────

function SemesterCard({
  sem, blocks, semesters, onToast, onEditSemester, onDeleteSemester,
}: {
  sem: Semester;
  blocks: Timeframe[];
  semesters: Semester[];
  onToast: (t: ToastState) => void;
  onEditSemester: (s: Semester) => void;
  onDeleteSemester: (s: Semester) => void;
}) {
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Timeframe | null>(null);
  const [deletingBlock, startBlockDelete] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();

  function handleDeleteBlock(tf: Timeframe) {
    if (!confirm(`Delete block "${tf.label}"? This also deletes all sections, enrollments, and bookings inside it.`)) return;
    setDeletingId(tf.id);
    startBlockDelete(async () => {
      const fd = new FormData();
      fd.append('id', String(tf.id));
      const result = await deleteTimeframeCascade(fd);
      setDeletingId(null);
      if (result?.error) { onToast({ message: result.error, type: 'error' }); return; }
      router.refresh();
      onToast({ message: 'Block deleted.', type: 'success' });
    });
  }

  return (
    <>
      {editingBlock && (
        <EditBlockModal
          tf={editingBlock}
          semesters={semesters}
          onClose={() => setEditingBlock(null)}
          onSuccess={() => onToast({ message: 'Block updated.', type: 'success' })}
        />
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        {/* Semester header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
            <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{sem.name}</p>
            <span className="text-xs px-2 py-0.5 rounded-md font-medium"
              style={{ background: 'rgba(245,132,31,0.12)', color: 'var(--accent)' }}>
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEditSemester(sem)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}>
              Rename
            </button>
            <button onClick={() => onDeleteSemester(sem)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium btn-danger">
              Delete
            </button>
          </div>
        </div>

        {/* Blocks list */}
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {blocks.map(tf => (
            <div key={tf.id} className="flex items-center justify-between gap-3 px-5 py-3 group hover:bg-[var(--subtle)] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-px h-8 rounded-full ml-1 shrink-0" style={{ background: 'var(--border)' }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tx)' }}>{tf.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>
                    {fmt(tf.start_date)} → {fmt(tf.end_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingBlock(tf)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'var(--subtle)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}>
                  Edit
                </button>
                <button onClick={() => handleDeleteBlock(tf)}
                  disabled={deletingBlock && deletingId === tf.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium btn-danger"
                  style={{ opacity: deletingBlock && deletingId === tf.id ? 0.6 : 1 }}>
                  {deletingBlock && deletingId === tf.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
          {blocks.length === 0 && (
            <p className="px-5 py-4 text-xs italic" style={{ color: 'var(--tx-3)' }}>No blocks yet.</p>
          )}
        </div>

        {/* Add block */}
        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          {showAddBlock ? (
            <BlockForm
              semesterId={sem.id}
              onSubmit={createTimeframe}
              onCancel={() => setShowAddBlock(false)}
              submitLabel="Add Block"
            />
          ) : (
            <button onClick={() => setShowAddBlock(true)}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: 'var(--accent)' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              Add Block to {sem.name}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TimeframesClient({
  semesters,
  timeframes,
}: {
  semesters: Semester[];
  timeframes: Timeframe[];
}) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showNewSemester, setShowNewSemester] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [newSemName, setNewSemName] = useState('');
  const [editSemName, setEditSemName] = useState('');
  const [semError, setSemError] = useState('');
  const [semPending, startSemTransition] = useTransition();
  const [deleteSemPending, startDeleteSem] = useTransition();
  const [editingUnassigned, setEditingUnassigned] = useState<Timeframe | null>(null);
  const router = useRouter();

  const unassignedBlocks = timeframes.filter(tf => !tf.semester_id);

  function handleCreateSemester(e: React.FormEvent) {
    e.preventDefault();
    setSemError('');
    const fd = new FormData();
    fd.append('name', newSemName.trim());
    startSemTransition(async () => {
      const result = await createSemester(fd);
      if (result?.error) { setSemError(result.error); return; }
      router.refresh();
      setShowNewSemester(false);
      setNewSemName('');
      setToast({ message: 'Semester created.', type: 'success' });
    });
  }

  function handleUpdateSemester(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSemester) return;
    setSemError('');
    const fd = new FormData();
    fd.append('id', String(editingSemester.id));
    fd.append('name', editSemName.trim());
    startSemTransition(async () => {
      const result = await updateSemester(fd);
      if (result?.error) { setSemError(result.error); return; }
      router.refresh();
      setEditingSemester(null);
      setToast({ message: 'Semester renamed.', type: 'success' });
    });
  }

  function handleDeleteSemester(sem: Semester) {
    if (!confirm(`Delete semester "${sem.name}"? This will fail if it has blocks inside.`)) return;
    const fd = new FormData();
    fd.append('id', String(sem.id));
    startDeleteSem(async () => {
      const result = await deleteSemester(fd);
      if (result?.error) { setToast({ message: result.error, type: 'error' }); return; }
      router.refresh();
      setToast({ message: 'Semester deleted.', type: 'success' });
    });
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Rename semester modal */}
      {editingSemester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditingSemester(null); }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Rename Semester</h2>
              <button onClick={() => setEditingSemester(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-[var(--subtle)]"
                style={{ color: 'var(--tx-2)' }}>✕</button>
            </div>
            <form onSubmit={handleUpdateSemester} className="space-y-3">
              <input value={editSemName} onChange={e => { setEditSemName(e.target.value); setSemError(''); }}
                placeholder="Semester 1/2026" className={inp} autoFocus required />
              {semError && <p className="text-xs rounded-lg px-3 py-2"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{semError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={semPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-primary" style={{ opacity: semPending ? 0.6 : 1 }}>
                  {semPending ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditingSemester(null)} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Header action */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--tx-3)' }}>
            {semesters.length} Semester{semesters.length !== 1 ? 's' : ''}
          </p>
          {showNewSemester ? (
            <form onSubmit={handleCreateSemester} className="flex items-center gap-2">
              <input value={newSemName} onChange={e => { setNewSemName(e.target.value); setSemError(''); }}
                placeholder="Semester 1/2026" className={inp} autoFocus required
                style={{ maxWidth: '200px' }} />
              <button type="submit" disabled={semPending}
                className="px-4 py-2 rounded-xl text-xs font-medium btn-primary shrink-0">
                {semPending ? '…' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowNewSemester(false); setSemError(''); newSemName && setNewSemName(''); }}
                className="px-3 py-2 rounded-xl text-xs btn-secondary shrink-0">
                Cancel
              </button>
            </form>
          ) : (
            <button onClick={() => setShowNewSemester(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium btn-primary">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              New Semester
            </button>
          )}
        </div>
        {semError && showNewSemester && (
          <p className="text-xs rounded-lg px-3 py-2"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {semError}
          </p>
        )}

        {/* No semesters yet */}
        {semesters.length === 0 && (
          <div className="rounded-2xl p-14 text-center"
            style={{ background: 'var(--surface)', border: '2px dashed var(--border)' }}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--tx-2)' }}>No semesters yet</p>
            <p className="text-xs" style={{ color: 'var(--tx-3)' }}>Create a semester first, then add blocks inside it.</p>
          </div>
        )}

        {/* Semester cards */}
        {semesters.map(sem => (
          <SemesterCard
            key={sem.id}
            sem={sem}
            blocks={timeframes.filter(tf => tf.semester_id === sem.id)}
            semesters={semesters}
            onToast={setToast}
            onEditSemester={s => { setEditingSemester(s); setEditSemName(s.name); setSemError(''); }}
            onDeleteSemester={handleDeleteSemester}
          />
        ))}

        {/* Unassigned blocks */}
        {unassignedBlocks.length > 0 && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4" style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--tx-2)' }}>
                Unassigned Blocks
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--tx-3)' }}>
                  — not linked to any semester. Edit to assign a semester.
                </span>
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {unassignedBlocks.map(tf => (
                <div key={tf.id} className="flex items-center justify-between gap-3 px-5 py-3 group hover:bg-[var(--subtle)] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--tx)' }}>{tf.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>{fmt(tf.start_date)} → {fmt(tf.end_date)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingUnassigned(tf)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: 'var(--subtle)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}>
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Delete block "${tf.label}"? This also deletes all sections, enrollments, and bookings inside it.`)) return;
                        const fd = new FormData(); fd.append('id', String(tf.id));
                        startDeleteSem(async () => {
                          const result = await deleteTimeframeCascade(fd);
                          if (result?.error) { setToast({ message: result.error, type: 'error' }); return; }
                          router.refresh();
                          setToast({ message: 'Block deleted.', type: 'success' });
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium btn-danger">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit modal for unassigned blocks */}
        {editingUnassigned && (
          <EditBlockModal
            tf={editingUnassigned}
            semesters={semesters}
            onClose={() => setEditingUnassigned(null)}
            onSuccess={() => setToast({ message: 'Block updated.', type: 'success' })}
          />
        )}
      </div>
    </>
  );
}

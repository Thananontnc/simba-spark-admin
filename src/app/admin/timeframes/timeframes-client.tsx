'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTimeframe, updateTimeframe, deleteTimeframe } from '@/app/actions/admin';

type Timeframe = { id: number; label: string; start_date: string; end_date: string };

const inp = 'w-full rounded-lg px-3 py-2 text-sm outline-none';
const inpStyle = { background: 'var(--subtle)', border: '1px solid var(--border)', color: 'var(--tx)' } as React.CSSProperties;

function today() {
  return new Date().toISOString().split('T')[0];
}

function isWeekend(dateStr: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

function nextMonday(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1);
  if (day === 6) d.setDate(d.getDate() + 2);
  return d.toISOString().split('T')[0];
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DateField({ label, name, value, onChange, min }: {
  label: string; name: string; value: string;
  onChange: (v: string) => void; min?: string;
}) {
  const weekend = isWeekend(value);
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>{label}</label>
      <input
        name={name}
        type="date"
        required
        min={min ?? today()}
        value={value}
        onChange={e => {
          const v = e.target.value;
          if (isWeekend(v)) { onChange(nextMonday(v)); return; }
          onChange(v);
        }}
        className={inp}
        style={inpStyle}
      />
      {weekend && (
        <p className="text-[10px] mt-1" style={{ color: '#f59e0b' }}>Weekend — moved to Monday</p>
      )}
      <p className="text-[10px] mt-1" style={{ color: 'var(--tx-3)' }}>Sat &amp; Sun are holidays and cannot be selected.</p>
    </div>
  );
}

function TimeframeForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: Partial<Timeframe>;
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean }>;
  onCancel?: () => void;
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
    if (endDate < startDate) { setError('End date must be after start date.'); return; }
    if (isWeekend(startDate) || isWeekend(endDate)) { setError('Dates cannot fall on weekends.'); return; }

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await onSubmit(fd);
      if (result?.error) { setError(result.error); return; }
      router.refresh();
      if (onCancel) onCancel();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {defaultValues?.id !== undefined && <input type="hidden" name="id" value={defaultValues.id} />}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Label</label>
        <input name="label" required value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Block 1 — 2026" className={inp} style={inpStyle} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DateField label="Start Date" name="start_date" value={startDate} onChange={v => { setStartDate(v); if (endDate && endDate < v) setEndDate(''); }} />
        <DateField label="End Date" name="end_date" value={endDate} onChange={setEndDate} min={startDate || today()} />
      </div>
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      <div className={onCancel ? 'flex gap-2 pt-1' : 'pt-1'}>
        <button type="submit" disabled={pending}
          className={`${onCancel ? 'flex-1' : 'w-full'} py-2 rounded-lg text-sm font-medium`}
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)', opacity: pending ? 0.6 : 1 }}>
          {pending ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm"
            style={{ background: 'var(--subtle)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function EditModal({ tf, onClose }: { tf: Timeframe; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Edit Block</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
            style={{ color: 'var(--tx-2)', background: 'var(--subtle)' }}>✕</button>
        </div>
        <TimeframeForm
          defaultValues={tf}
          onSubmit={updateTimeframe}
          onCancel={onClose}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}

export default function TimeframesClient({ timeframes }: { timeframes: Timeframe[] }) {
  const [editing, setEditing] = useState<Timeframe | null>(null);
  const [deletePending, startDelete] = useTransition();
  const router = useRouter();

  function handleDelete(tf: Timeframe) {
    if (!confirm(`Delete "${tf.label}"?`)) return;
    startDelete(async () => {
      const fd = new FormData();
      fd.append('id', String(tf.id));
      await deleteTimeframe(fd);
      router.refresh();
    });
  }

  return (
    <>
      {editing && <EditModal tf={editing} onClose={() => setEditing(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Create form */}
        <div className="rounded-xl p-5 h-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm mb-4" style={{ color: 'var(--tx)' }}>New Block</p>
          <TimeframeForm onSubmit={createTimeframe} submitLabel="Add Timeframe" />
        </div>

        {/* List */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden h-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>All Timeframes</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>{timeframes.length} defined</p>
          </div>
          <div>
            {timeframes.map((tf, i) => (
              <div key={tf.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tx)' }}>{tf.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>{fmt(tf.start_date)} → {fmt(tf.end_date)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setEditing(tf)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Edit</button>
                  <button onClick={() => handleDelete(tf)} disabled={deletePending}
                    className="text-xs font-medium" style={{ color: '#ef4444', opacity: deletePending ? 0.5 : 1 }}>Delete</button>
                </div>
              </div>
            ))}
            {timeframes.length === 0 && (
              <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--tx-2)' }}>No timeframes yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

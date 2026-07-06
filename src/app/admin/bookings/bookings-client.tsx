'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { deleteBooking, createBookingAdmin } from '@/app/actions/admin';
import { Toast } from '@/components/toast';

type Booking = {
  id: number; course_name: string; course_code: string; section_number: string;
  instructor_name: string | null; date: string; start_time: string; end_time: string; room: string | null;
};
type SectionOption = { id: number; course_code: string; course_name: string; section_number: string; room: string | null };

function fmt(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtTime(t: string) { return t.slice(0, 5); }

function NewBookingModal({ sections, onClose, onSuccess }: {
  sections: SectionOption[]; onClose: () => void; onSuccess: () => void;
}) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSectionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // Pre-fill room from the section's default room
    const sec = sections.find(s => s.id === parseInt(e.target.value));
    const roomInput = e.currentTarget.form?.elements.namedItem('room') as HTMLInputElement | null;
    if (roomInput && sec?.room && !roomInput.value) roomInput.value = sec.room;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>New Booking</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors hover:bg-[var(--subtle)]"
            style={{ color: 'var(--tx-2)' }}>✕</button>
        </div>

        <form onSubmit={e => {
          e.preventDefault();
          setError('');
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await createBookingAdmin(fd);
            if (result.error) { setError(result.error); return; }
            onSuccess();
            onClose();
          });
        }} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Section</label>
            <select name="section_id" required className="input-premium" onChange={handleSectionChange} defaultValue="">
              <option value="" disabled>Select section…</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.course_code} · {s.section_number} — {s.course_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Date</label>
            <input name="date" type="date" required className="input-premium" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Start</label>
              <input name="start_time" type="time" required className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>End</label>
              <input name="end_time" type="time" required className="input-premium" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tx-2)' }}>Room</label>
            <input name="room" placeholder="Room A72 (optional)" className="input-premium" />
          </div>
          {error && (
            <p className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending} className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-primary">
              {pending ? 'Checking conflicts…' : 'Create Booking'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BookingsClient({ bookings, sections }: { bookings: Booking[]; sections: SectionOption[] }) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b => {
      const matchSearch = !q ||
        b.course_code.toLowerCase().includes(q) ||
        b.course_name.toLowerCase().includes(q) ||
        (b.instructor_name ?? '').toLowerCase().includes(q) ||
        (b.room ?? '').toLowerCase().includes(q) ||
        b.section_number.toLowerCase().includes(q);
      const matchFrom = !dateFrom || b.date >= dateFrom;
      const matchTo = !dateTo || b.date <= dateTo;
      return matchSearch && matchFrom && matchTo;
    });
  }, [bookings, search, dateFrom, dateTo]);

  function handleDelete(id: number, requireConfirm = false) {
    if (requireConfirm && !confirm('Delete this booking?')) return;
    startTransition(async () => {
      const fd = new FormData(); fd.append('id', String(id));
      await deleteBooking(fd);
      setDeletingId(null); setToast('Booking deleted.');
      router.refresh();
    });
  }

  const hasFilters = search || dateFrom || dateTo;

  return (
    <>
      {toast && <Toast message={toast} type="success" onDone={() => setToast(null)} />}
      {creating && (
        <NewBookingModal sections={sections} onClose={() => setCreating(false)}
          onSuccess={() => setToast('Booking created.')} />
      )}

      <div className="flex justify-end mb-4">
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium btn-primary">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--subtle)', border: '1px solid var(--border)' }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: 'var(--tx-3)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search course, instructor, room…"
            className="flex-1 text-sm outline-none bg-transparent" style={{ color: 'var(--tx)' }} />
          {search && <button onClick={() => setSearch('')} style={{ color: 'var(--tx-3)' }}>✕</button>}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="input-premium text-sm" style={{ width: '140px' }} placeholder="From" />
          <span className="text-xs" style={{ color: 'var(--tx-3)' }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="input-premium text-sm" style={{ width: '140px' }} placeholder="To" />
          {hasFilters && <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-2 rounded-xl text-xs btn-secondary">Clear</button>}
        </div>
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--tx-3)' }}>
        {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
      </p>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
                {['Course', 'Section', 'Instructor', 'Date', 'Time', 'Room', ''].map(h => (
                  <th key={h} className={`py-2.5 px-4 text-left text-xs font-medium ${h === '' ? 'text-right' : ''}`} style={{ color: 'var(--tx-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id} className="hover:bg-[var(--subtle)] transition-colors" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm" style={{ color: 'var(--tx)' }}>{b.course_name}</p>
                    <p className="text-xs" style={{ color: 'var(--tx-2)' }}>{b.course_code}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--tx-2)' }}>{b.section_number}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--tx)' }}>
                    {b.instructor_name ?? <span style={{ color: 'var(--tx-3)', fontStyle: 'italic' }}>Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--tx)' }}>{fmt(b.date)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'rgba(245,132,31,0.1)', color: 'var(--accent)' }}>
                      {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--tx-2)' }}>{b.room ?? <span style={{ color: 'var(--tx-3)' }}>—</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {deletingId === b.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs" style={{ color: 'var(--tx-3)' }}>Sure?</span>
                        <button onClick={() => handleDelete(b.id)} disabled={pending}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium btn-danger" style={{ opacity: pending ? 0.6 : 1 }}>
                          Yes
                        </button>
                        <button onClick={() => setDeletingId(null)} className="px-2.5 py-1 rounded-lg text-xs btn-secondary">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(b.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 btn-danger"
                        style={{ opacity: 1 }}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-14 text-center text-sm" style={{ color: 'var(--tx-2)' }}>
                  {bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {filtered.map(b => (
            <div key={b.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--tx)' }}>{b.course_name}</p>
                  <p className="text-xs" style={{ color: 'var(--tx-2)' }}>{b.course_code} · {b.section_number}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium shrink-0" style={{ background: 'rgba(245,132,31,0.1)', color: 'var(--accent)' }}>
                  {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--tx-2)' }}>{fmt(b.date)}{b.room ? ` · ${b.room}` : ''}</p>
              {b.instructor_name && <p className="text-xs mt-0.5" style={{ color: 'var(--tx-3)' }}>{b.instructor_name}</p>}
              <button onClick={() => handleDelete(b.id, true)} disabled={pending}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium btn-danger w-full" style={{ opacity: pending ? 0.6 : 1 }}>
                Delete
              </button>
            </div>
          ))}
          {filtered.length === 0 && <p className="px-5 py-14 text-center text-sm" style={{ color: 'var(--tx-2)' }}>No bookings match.</p>}
        </div>
      </div>
    </>
  );
}

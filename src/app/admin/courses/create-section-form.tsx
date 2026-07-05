'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSection } from '@/app/actions/admin';
import { Toast } from '@/components/toast';

type Course = { id: number; course_name: string; course_code: string; credits: number };
type Timeframe = { id: number; label: string };

export default function CreateSectionForm({ courses, timeframes }: { courses: Course[]; timeframes: Timeframe[] }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Course | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [sectionNo, setSectionNo] = useState('');
  const [room, setRoom] = useState('');
  const [timeframeId, setTimeframeId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim().length === 0 ? courses : courses.filter(c =>
    c.course_code.toLowerCase().includes(query.toLowerCase()) ||
    c.course_name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function pick(c: Course) {
    setSelected(c);
    setQuery('');
    setDropOpen(false);
  }

  function reset() {
    setSelected(null);
    setQuery('');
    setSectionNo('');
    setRoom('');
    setTimeframeId('');
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError('Select a course first.'); return; }
    if (!sectionNo.trim()) { setError('Section number required.'); return; }
    setError('');
    startTransition(async () => {
      const fd = new FormData();
      fd.append('course_id', String(selected.id));
      fd.append('section_number', sectionNo.trim());
      fd.append('room', room.trim());
      fd.append('timeframe_id', timeframeId);
      const result = await createSection(fd);
      if (result?.error) { setError(result.error); return; }
      setToast('Section created.');
      reset();
      router.refresh();
    });
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <form onSubmit={handleSubmit} className="rounded-2xl p-6 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        <p className="font-semibold text-sm mb-5" style={{ color: 'var(--tx)' }}>Add New Section</p>

        {/* Course picker */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--tx-2)' }}>Course</label>

          {selected ? (
            /* Selected state */
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'rgba(245,132,31,0.07)', border: '1.5px solid rgba(245,132,31,0.3)' }}>
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{selected.course_code}</span>
                <span className="text-sm ml-2" style={{ color: 'var(--tx)' }}>{selected.course_name}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--tx-3)' }}>{selected.credits} cr</span>
              </div>
              <button type="button" onClick={() => { setSelected(null); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: 'var(--tx-3)' }}>
                ✕ change
              </button>
            </div>
          ) : (
            /* Search state */
            <div className="relative" ref={dropRef}>
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl transition-all"
                style={{ background: 'var(--subtle)', border: `1.5px solid ${dropOpen ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: dropOpen ? '0 0 0 3px rgba(245,132,31,0.1)' : 'none' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: 'var(--tx-3)', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setDropOpen(true); }}
                  onFocus={() => setDropOpen(true)}
                  placeholder="Search by code or name…"
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: 'var(--tx)' }}
                />
                {query && <button type="button" onClick={() => setQuery('')} style={{ color: 'var(--tx-3)' }}>✕</button>}
              </div>

              {dropOpen && (
                <div className="absolute z-30 w-full mt-1.5 rounded-xl overflow-hidden shadow-xl animate-fade-in"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '260px', overflowY: 'auto' }}>
                  {filtered.length === 0 ? (
                    <p className="px-4 py-3 text-sm" style={{ color: 'var(--tx-3)' }}>No courses match.</p>
                  ) : (
                    filtered.map(c => (
                      <div key={c.id}
                        onClick={() => pick(c)}
                        className="flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors hover:bg-[var(--subtle)]"
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: 'rgba(245,132,31,0.12)', color: 'var(--accent)', letterSpacing: '0.02em' }}>
                            {c.course_code}
                          </span>
                          <span className="text-sm truncate" style={{ color: 'var(--tx)' }}>{c.course_name}</span>
                        </div>
                        <span className="text-xs shrink-0 ml-3 px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--subtle)', color: 'var(--tx-3)' }}>{c.credits} cr</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--tx-2)' }}>Section No. <span style={{ color: '#ef4444' }}>*</span></label>
            <input value={sectionNo} onChange={e => setSectionNo(e.target.value)}
              placeholder="SEC-01" className="input-premium" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--tx-2)' }}>Room</label>
            <input value={room} onChange={e => setRoom(e.target.value)}
              placeholder="Room A72" className="input-premium" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--tx-2)' }}>Timeframe</label>
            <select value={timeframeId} onChange={e => setTimeframeId(e.target.value)} className="input-premium">
              <option value="">— none —</option>
              {timeframes.map(tf => <option key={tf.id} value={tf.id}>{tf.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-xs rounded-xl px-3 py-2 mb-3"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending}
            className="px-5 py-2.5 rounded-xl text-sm font-medium btn-primary"
            style={{ opacity: pending ? 0.7 : 1 }}>
            {pending ? 'Creating…' : 'Add Section'}
          </button>
          {(selected || sectionNo || room) && (
            <button type="button" onClick={reset}
              className="px-4 py-2.5 rounded-xl text-sm btn-secondary">
              Clear
            </button>
          )}
        </div>
      </form>
    </>
  );
}

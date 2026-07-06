'use client';

import { useState, useMemo } from 'react';

type TimetableBooking = {
  id: number;
  course_code: string;
  course_name: string;
  section_number: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  instructor_name: string | null;
};

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const SLOT_H = 88; // px per 1.5-hour slot
const START_H = 7; // 07:00
const END_H = 21;  // 21:00
// labels every 1.5 hours
const TIME_LABELS: string[] = [];
for (let m = START_H * 60; m <= END_H * 60; m += 90) {
  TIME_LABELS.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function toISO(d: Date) {
  // Local date, not UTC — toISOString() shifts back a day in UTC+ timezones.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TimetableView({ bookings }: { bookings: TimetableBooking[] }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const today = toISO(new Date());

  function prev() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
  function next() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }
  function goToday() { setWeekStart(getMonday(new Date())); }

  const isCurrentWeek = toISO(weekStart) === toISO(getMonday(new Date()));

  const totalH = TIME_LABELS.length * SLOT_H;

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-xs font-medium btn-secondary"
            style={{ fontWeight: isCurrentWeek ? 600 : 450 }}>
            Today
          </button>
          <p className="text-xs" style={{ color: 'var(--tx-3)' }}>
            Week of {fmtShort(weekDays[0])} – {fmtShort(weekDays[4])}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prev}
            className="w-8 h-8 rounded-lg btn-secondary flex items-center justify-center">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button onClick={next}
            className="w-8 h-8 rounded-lg btn-secondary flex items-center justify-center">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
       {/* Horizontal scroll on narrow screens — columns stay readable */}
       <div className="overflow-x-auto">
        <div style={{ minWidth: '640px' }}>

        {/* Day headers */}
        <div className="grid" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
          <div style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }} />
          {weekDays.map((day, i) => {
            const iso = toISO(day);
            const isToday = iso === today;
            return (
              <div key={i} className="py-3 text-center"
                style={{ background: 'var(--subtle)', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: isToday ? 'var(--accent)' : 'var(--tx-3)' }}>
                  {DAYS_SHORT[i]}
                </p>
                <span className={`inline-flex items-center justify-center text-sm font-bold leading-none ${isToday ? 'w-7 h-7 rounded-full' : ''}`}
                  style={{
                    color: isToday ? '#fff' : 'var(--tx)',
                    background: isToday ? 'var(--accent)' : 'transparent',
                  }}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: '580px' }}>
          <div className="grid relative" style={{ gridTemplateColumns: '56px repeat(5, 1fr)', height: `${totalH}px` }}>

            {/* Time labels */}
            <div className="relative" style={{ background: 'var(--subtle)', zIndex: 1 }}>
              {TIME_LABELS.map((label, i) => (
                <div key={label}
                  style={{ position: 'absolute', top: `${i * SLOT_H}px`, width: '100%', height: `${SLOT_H}px`, borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
                  className="flex items-start justify-end pr-2 pt-2">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--tx-3)' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const iso = toISO(day);
              const isToday = iso === today;
              const dayBookings = bookings.filter(b => b.date === iso);

              return (
                <div key={dayIdx} className="relative"
                  style={{ borderLeft: '1px solid var(--border)', background: isToday ? 'rgba(245,132,31,0.02)' : 'transparent' }}>
                  {/* Slot lines */}
                  {TIME_LABELS.map((label, i) => (
                    <div key={label}
                      style={{ position: 'absolute', top: `${i * SLOT_H}px`, width: '100%', height: `${SLOT_H}px`, borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
                      className="flex items-center justify-center">
                      {dayBookings.length === 0 && (
                        <span className="text-[11px]" style={{ color: 'var(--tx-3)', opacity: 0.35 }}>—</span>
                      )}
                    </div>
                  ))}

                  {/* Booking cards */}
                  {dayBookings.map(b => {
                    const startMins = toMins(b.start_time) - START_H * 60;
                    const endMins   = toMins(b.end_time)   - START_H * 60;
                    const top    = (startMins / 90) * SLOT_H + 2;
                    const height = Math.max(((endMins - startMins) / 90) * SLOT_H - 4, 36);

                    return (
                      <div key={b.id}
                        className="absolute rounded-xl overflow-hidden px-2.5 py-2"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: '4px',
                          right: '4px',
                          background: 'linear-gradient(145deg, #f5841f, #e8720d)',
                          boxShadow: '0 2px 10px rgba(245,132,31,0.35)',
                          zIndex: 2,
                        }}>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-extrabold leading-tight text-white tracking-wide truncate">
                            {b.course_code}
                          </p>
                          <span className="text-[9px] font-medium px-1 py-0.5 rounded shrink-0" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                            {b.section_number}
                          </span>
                        </div>
                        {height > 50 && (
                          <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.82)' }}>
                            {b.course_name}
                          </p>
                        )}
                        {height > 66 && (
                          <div className="flex items-center gap-1 mt-1">
                            <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                            </svg>
                            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                            </span>
                          </div>
                        )}
                        {height > 90 && b.instructor_name && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                            <span className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {b.instructor_name}
                            </span>
                          </div>
                        )}
                        {height > 110 && b.room && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                            <span className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {b.room}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        </div>
       </div>
      </div>

      {bookings.length === 0 && (
        <p className="text-center text-sm py-6" style={{ color: 'var(--tx-3)' }}>
          No bookings in the system yet.
        </p>
      )}
    </div>
  );
}

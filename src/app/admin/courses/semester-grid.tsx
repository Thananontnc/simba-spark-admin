'use client';

type Section = {
  id: number; course_name: string; course_code: string;
  section_number: string; timeframe_id: number | null;
  instructors: { id: number; full_name: string }[];
};
type Timeframe = { id: number; label: string; start_date: string; end_date: string };

const ROW_COLORS = [
  { bg: 'rgba(139,178,79,0.22)', border: 'rgba(139,178,79,0.45)' },   // green — like paper Sec666
  { bg: 'rgba(59,110,201,0.20)', border: 'rgba(59,110,201,0.45)' },   // blue — like paper Sec667
  { bg: 'rgba(245,132,31,0.16)', border: 'rgba(245,132,31,0.40)' },   // orange
  { bg: 'rgba(155,89,182,0.16)', border: 'rgba(155,89,182,0.40)' },   // purple
];

const MONTH_SHADES = [
  '#F6E8DC', '#EFD3B8', '#E5B285', '#C97B2E', '#8B4A17',
];

function monthKey(d: string) {
  return d.slice(0, 7); // YYYY-MM
}
function monthName(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' });
}
function dayRange(tf: Timeframe) {
  const s = new Date(tf.start_date + 'T00:00:00');
  const e = new Date(tf.end_date + 'T00:00:00');
  return `${s.getDate()}–${e.getDate()} ${s.getMonth() !== e.getMonth() ? monthName(tf.end_date) : ''}`.trim();
}

export default function SemesterGrid({ sections, timeframes }: { sections: Section[]; timeframes: Timeframe[] }) {
  const tfs = [...timeframes].sort((a, b) => a.start_date.localeCompare(b.start_date));

  // Cohort rows = distinct section_number, sorted
  const cohorts = Array.from(new Set(sections.map(s => s.section_number))).sort();

  // Month header groups
  const months: { key: string; name: string; span: number }[] = [];
  for (const tf of tfs) {
    const key = monthKey(tf.start_date);
    const last = months[months.length - 1];
    if (last && last.key === key) last.span += 1;
    else months.push({ key, name: monthName(tf.start_date), span: 1 });
  }

  function cellSections(cohort: string, tfId: number) {
    return sections.filter(s => s.section_number === cohort && s.timeframe_id === tfId);
  }

  if (tfs.length === 0 || cohorts.length === 0) {
    return (
      <div className="rounded-2xl p-14 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--tx-2)' }}>Nothing to show yet</p>
        <p className="text-xs" style={{ color: 'var(--tx-3)' }}>
          Create timeframes and sections first — the semester grid builds itself from them.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Semester Overview</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--tx-2)' }}>
          Each row is a section group; each column is a 2-week block. Cells list the courses taught in that block.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: `${140 + tfs.length * 150}px` }}>
          <thead>
            {/* Month band */}
            <tr>
              <th style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }} />
              {months.map((m, i) => (
                <th key={m.key} colSpan={m.span}
                  className="py-2 text-xs font-bold text-center"
                  style={{
                    background: MONTH_SHADES[i % MONTH_SHADES.length],
                    color: i >= 3 ? '#fff' : '#4a2f10',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: '1px solid var(--border)',
                  }}>
                  {m.name}
                </th>
              ))}
            </tr>
            {/* Block band */}
            <tr>
              <th className="py-2 px-4 text-left text-[11px] font-semibold"
                style={{ background: 'var(--subtle)', color: 'var(--tx-2)', borderBottom: '1px solid var(--border)' }}>
                Section
              </th>
              {tfs.map(tf => (
                <th key={tf.id} className="py-2 px-2 text-center"
                  style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--tx)' }}>{tf.label}</p>
                  <p className="text-[10px] font-normal" style={{ color: 'var(--tx-3)' }}>{dayRange(tf)}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort, ci) => {
              const color = ROW_COLORS[ci % ROW_COLORS.length];
              return (
                <tr key={cohort}>
                  <td className="py-3 px-4 text-xs font-bold whitespace-nowrap"
                    style={{ color: 'var(--tx)', borderBottom: '1px solid var(--border)', background: 'var(--subtle)' }}>
                    {cohort}
                  </td>
                  {tfs.map(tf => {
                    const cell = cellSections(cohort, tf.id);
                    return (
                      <td key={tf.id} className="py-2 px-2 text-center align-middle"
                        style={{
                          borderBottom: '1px solid var(--border)',
                          borderLeft: '1px solid var(--border)',
                          background: cell.length > 0 ? color.bg : 'transparent',
                          boxShadow: cell.length > 0 ? `inset 0 0 0 1px ${color.border}` : 'none',
                          minWidth: '140px',
                        }}>
                        {cell.length > 0 ? (
                          <div className="flex flex-col gap-0.5 items-center" title={cell.map(s => `${s.course_code} ${s.course_name}${s.instructors.length ? ' — ' + s.instructors.map(i => i.full_name).join(', ') : ''}`).join('\n')}>
                            {cell.map(s => (
                              <span key={s.id} className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--tx)' }}>
                                {s.course_code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: 'var(--tx-3)' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--subtle)' }}>
        {cohorts.map((cohort, ci) => {
          const color = ROW_COLORS[ci % ROW_COLORS.length];
          return (
            <span key={cohort} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--tx-2)' }}>
              <span className="inline-block w-3 h-3 rounded" style={{ background: color.bg, boxShadow: `inset 0 0 0 1px ${color.border}` }} />
              Sec {cohort}
            </span>
          );
        })}
        <span className="text-[11px] ml-auto" style={{ color: 'var(--tx-3)' }}>Hover a cell for course names and lecturers</span>
      </div>
    </div>
  );
}

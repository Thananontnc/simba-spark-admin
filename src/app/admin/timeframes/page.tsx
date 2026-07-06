import sql from '@/lib/db';
import TimeframesClient from './timeframes-client';

export const dynamic = 'force-dynamic';

type Semester = { id: number; name: string };
type Timeframe = { id: number; label: string; start_date: string; end_date: string; semester_id: number | null };

export default async function TimeframesPage() {
  const [semesters, timeframes] = await Promise.all([
    sql`SELECT id, name FROM semesters ORDER BY created_at`,
    sql`SELECT id, label, start_date::text, end_date::text, semester_id FROM timeframes ORDER BY start_date`,
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>Semesters & Blocks</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>Create a semester first, then add 2-week blocks inside it.</p>
      </div>
      <TimeframesClient
        semesters={semesters as Semester[]}
        timeframes={timeframes as Timeframe[]}
      />
    </div>
  );
}

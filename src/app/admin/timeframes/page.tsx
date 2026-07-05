import sql from '@/lib/db';
import TimeframesClient from './timeframes-client';

export const dynamic = 'force-dynamic';

type Timeframe = { id: number; label: string; start_date: string; end_date: string };

export default async function TimeframesPage() {
  const timeframes = await sql`SELECT id, label, start_date::text, end_date::text FROM timeframes ORDER BY start_date`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>Timeframes</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>Define 2-week block windows.</p>
      </div>
      <TimeframesClient timeframes={timeframes as Timeframe[]} />
    </div>
  );
}

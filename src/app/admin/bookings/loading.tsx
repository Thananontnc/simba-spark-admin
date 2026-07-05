export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-36 rounded-lg mb-2" style={{ background: 'var(--subtle)' }} />
      <div className="h-4 w-48 rounded mb-6" style={{ background: 'var(--subtle)' }} />
      <div className="h-16 w-full rounded-xl mb-4" style={{ background: 'var(--subtle)' }} />
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 px-5 py-3.5" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
            <div className="h-4 w-40 rounded" style={{ background: 'var(--subtle)' }} />
            <div className="h-4 w-20 rounded" style={{ background: 'var(--subtle)' }} />
            <div className="h-4 w-28 rounded" style={{ background: 'var(--subtle)' }} />
            <div className="h-4 w-24 rounded" style={{ background: 'var(--subtle)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

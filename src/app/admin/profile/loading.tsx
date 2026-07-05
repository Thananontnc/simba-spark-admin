export default function Loading() {
  return (
    <div className="animate-pulse max-w-lg">
      <div className="h-6 w-24 rounded-lg mb-6" style={{ background: 'var(--subtle)' }} />
      <div className="rounded-xl p-6 mb-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="h-4 w-32 rounded mb-5" style={{ background: 'var(--subtle)' }} />
        {[...Array(3)].map((_, i) => <div key={i} className="h-10 w-full rounded-xl mb-3" style={{ background: 'var(--subtle)' }} />)}
      </div>
    </div>
  );
}

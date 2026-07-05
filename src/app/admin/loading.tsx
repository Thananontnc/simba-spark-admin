export default function AdminLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-6 w-52 rounded-md animate-pulse mb-2" style={{ background: 'var(--subtle)' }} />
        <div className="h-4 w-64 rounded-md animate-pulse" style={{ background: 'var(--subtle)' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-xl animate-pulse mb-3" style={{ background: 'var(--subtle)' }} />
            <div className="h-7 w-16 rounded animate-pulse mb-1.5" style={{ background: 'var(--subtle)' }} />
            <div className="h-4 w-28 rounded animate-pulse mb-1" style={{ background: 'var(--subtle)' }} />
            <div className="h-3 w-36 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
          </div>
        ))}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
            <div>
              <div className="h-4 w-32 rounded animate-pulse mb-1.5" style={{ background: 'var(--subtle)' }} />
              <div className="h-3 w-48 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
            </div>
            <div className="h-3 w-4 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

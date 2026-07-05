export default function TimeframesLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-5 w-32 rounded-md animate-pulse mb-2" style={{ background: 'var(--subtle)' }} />
        <div className="h-3.5 w-52 rounded-md animate-pulse" style={{ background: 'var(--subtle)' }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl p-5 h-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="h-4 w-24 rounded animate-pulse mb-4" style={{ background: 'var(--subtle)' }} />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: 'var(--subtle)' }} />
            ))}
            <div className="h-9 rounded-xl animate-pulse mt-2" style={{ background: 'var(--subtle)' }} />
          </div>
        </div>
        <div className="lg:col-span-2 rounded-xl overflow-hidden h-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="h-4 w-28 rounded animate-pulse mb-1.5" style={{ background: 'var(--subtle)' }} />
            <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
              <div>
                <div className="h-4 w-36 rounded animate-pulse mb-1.5" style={{ background: 'var(--subtle)' }} />
                <div className="h-3 w-52 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
              </div>
              <div className="flex gap-3">
                <div className="h-3 w-8 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
                <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CoursesLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-5 w-40 rounded-md animate-pulse mb-2" style={{ background: 'var(--subtle)' }} />
        <div className="h-3.5 w-64 rounded-md animate-pulse" style={{ background: 'var(--subtle)' }} />
      </div>
      <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="h-4 w-24 rounded animate-pulse mb-4" style={{ background: 'var(--subtle)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: 'var(--subtle)' }} />
          ))}
        </div>
        <div className="h-9 w-32 rounded-xl animate-pulse" style={{ background: 'var(--subtle)' }} />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--subtle)' }}>
              <div className="h-4 w-48 rounded animate-pulse mb-2" style={{ background: 'var(--surface)' }} />
              <div className="flex gap-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-5 w-16 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-5">
                <div className="h-3 w-20 rounded animate-pulse mb-3" style={{ background: 'var(--subtle)' }} />
                <div className="h-4 w-36 rounded animate-pulse mb-3" style={{ background: 'var(--subtle)' }} />
                <div className="h-9 rounded-xl animate-pulse" style={{ background: 'var(--subtle)' }} />
              </div>
              <div className="p-5">
                <div className="h-3 w-20 rounded animate-pulse mb-3" style={{ background: 'var(--subtle)' }} />
                <div className="h-9 rounded-xl animate-pulse mb-3" style={{ background: 'var(--subtle)' }} />
                <div className="space-y-2">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="h-7 rounded-lg animate-pulse" style={{ background: 'var(--subtle)' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

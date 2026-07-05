export default function UsersLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-5 w-24 rounded-md animate-pulse mb-2" style={{ background: 'var(--subtle)' }} />
        <div className="h-3.5 w-48 rounded-md animate-pulse" style={{ background: 'var(--subtle)' }} />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="h-4 w-20 rounded animate-pulse mb-1.5" style={{ background: 'var(--subtle)' }} />
            <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
          </div>
          <div className="h-9 w-24 rounded-xl animate-pulse" style={{ background: 'var(--subtle)' }} />
        </div>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--subtle)' }}>
          <div className="h-9 w-full rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
        </div>
        <div className="hidden sm:block">
          <table className="w-full">
            <tbody>
              {[...Array(6)].map((_, i) => (
                <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  {[60, 80, 30, 25, 20].map((w, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 rounded-md animate-pulse" style={{ background: 'var(--subtle)', width: `${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-4 space-y-2">
              <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
              <div className="h-3 w-56 rounded animate-pulse" style={{ background: 'var(--subtle)' }} />
              <div className="flex gap-2 mt-3">
                <div className="flex-1 h-8 rounded-xl animate-pulse" style={{ background: 'var(--subtle)' }} />
                <div className="flex-1 h-8 rounded-xl animate-pulse" style={{ background: 'var(--subtle)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

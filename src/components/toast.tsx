'use client';

import { useEffect } from 'react';

type Props = {
  message: string;
  type?: 'success' | 'error';
  onDone: () => void;
};

export function Toast({ message, type = 'success', onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-fade-in flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
      style={{
        background: type === 'success' ? '#16a34a' : '#dc2626',
        color: '#fff',
        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      }}>
      {type === 'success'
        ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      }
      {message}
    </div>
  );
}

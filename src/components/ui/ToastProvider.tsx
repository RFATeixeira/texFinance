"use client";
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface Toast { id: number; message: string; type?: 'success'|'error'|'info'; duration?: number; }
interface ToastContextValue { notify: (msg:string, opts?: { type?: 'success'|'error'|'info'; duration?: number }) => void; }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, opts?: { type?: 'success'|'error'|'info'; duration?: number }) => {
    const id = Date.now() + Math.random();
    const toast: Toast = { id, message, type: opts?.type || 'info', duration: opts?.duration || 3000 };
    setToasts(prev => [...prev, toast]);
    setTimeout(()=> {
      setToasts(prev => prev.filter(t=> t.id !== id));
    }, toast.duration);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-xl shadow text-sm text-white animate-fade-in-up ${t.type==='success'?'bg-green-500': t.type==='error'?'bg-red-500':'bg-gray-700'}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(){
  const ctx = useContext(ToastContext);
  if(!ctx) throw new Error('useToast deve estar dentro de ToastProvider');
  return ctx;
}

// Pequena animação opcional (Tailwind pode ser configurado ou inline)
// Adicione em globals.css se desejar:
// .animate-fade-in-up { @apply opacity-0 translate-y-2; animation: fadeInUp .25s forwards; }
// @keyframes fadeInUp { to { opacity:1; transform:translateY(0); } }

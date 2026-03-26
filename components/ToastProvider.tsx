'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type Toast = { id: number; msg: string; icon?: string }
type ToastContextType = { addToast: (msg: string, icon?: string) => void }

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export function useToast() { return useContext(ToastContext) }

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((msg: string, icon = '✓') => {
    const id = ++_id
    setToasts(t => [...t, { id, msg, icon }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            {t.icon} {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

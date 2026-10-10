'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function ComedieBlanquetteEgg() {
  const { armed } = useThemeEgg('theme-comedie-blanquette')
  const [phase, setPhase] = useState<'idle' | 'question' | 'answer' | 'done'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!armed) return
    try {
      const v = localStorage.getItem('cm_blanquette')
      if (v === '2') setPhase('done')
    } catch {}
  }, [armed])

  const handleSearch = useCallback((query: string) => {
    if (!armed || phase === 'done') return false

    const normalized = query.replace(/\s/g, '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (normalized !== 'blanquette') return false

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        const v = localStorage.getItem('cm_blanquette')
        if (!v || v === '0') {
          setPhase('question')
          localStorage.setItem('cm_blanquette', '1')
        } else if (v === '1') {
          setPhase('answer')
          localStorage.setItem('cm_blanquette', '2')
          discoverThemeEgg('theme-comedie-blanquette')
          setTimeout(() => setPhase('done'), 3000)
        }
      } catch {}
    }, 400)

    return true
  }, [armed, phase])

  useEffect(() => {
    if (!armed || phase === 'done') return

    const handler = (e: CustomEvent<{ query: string }>) => {
      handleSearch(e.detail.query)
    }
    window.addEventListener('comedie:search' as any, handler)
    return () => window.removeEventListener('comedie:search' as any, handler)
  }, [armed, phase, handleSearch])

  if (!armed || phase === 'idle' || phase === 'done') return null

  return (
    <div
      style={{
        padding: '40px 16px',
        textAlign: 'center',
        fontFamily: 'var(--f-theatre)',
        fontStyle: 'italic',
        fontSize: 20,
        color: 'var(--or-clair)',
      }}
    >
      {phase === 'question' && 'Comment est votre blanquette ?'}
      {phase === 'answer' && 'Elle est bonne.'}
    </div>
  )
}

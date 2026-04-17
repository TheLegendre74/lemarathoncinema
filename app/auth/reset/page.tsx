'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPage() {
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    const code = new URLSearchParams(window.location.search).get('code')
    if (code) supabase.auth.exchangeCodeForSession(code)

    return () => subscription.unsubscribe()
  }, [supabase])

  async function handle() {
    if (password.length < 4) { setErr('Mot de passe trop court (min 4 caractères).'); return }
    setLoading(true); setErr('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setErr(error.message); setLoading(false); return }
    setInfo('Mot de passe mis à jour ! Redirection…')
    setTimeout(() => { window.location.href = '/' }, 1500)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', padding: '2.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--gold)', marginBottom: '1.5rem', textAlign: 'center' }}>
          Nouveau mot de passe
        </div>
        {!ready ? (
          <div style={{ color: 'var(--text2)', fontSize: '.85rem', textAlign: 'center' }}>Vérification du lien en cours…</div>
        ) : (
          <>
            <div className="field">
              <label>Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} placeholder="••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                  style={{ width: '100%', paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: '.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '.9rem', padding: 0 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            {err && <div style={{ color: 'var(--red)', fontSize: '.78rem', marginBottom: '.8rem', textAlign: 'center' }}>{err}</div>}
            {info && <div style={{ color: 'var(--green)', fontSize: '.78rem', marginBottom: '.8rem', textAlign: 'center' }}>{info}</div>}
            <button
              style={{ width: '100%', background: 'var(--gold)', color: '#0a0a0f', fontWeight: 600, fontFamily: 'var(--font-body)', fontSize: '.95rem', padding: '.75rem', border: 'none', borderRadius: 'var(--r)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1 }}
              onClick={handle} disabled={loading}
            >
              {loading ? 'Mise à jour…' : 'Valider'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CONFIG } from '@/lib/config'

function CountdownMini() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  if (!now) return null
  const live = now >= CONFIG.MARATHON_START
  if (live) return null
  const diff = CONFIG.MARATHON_START.getTime() - now.getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '.6rem' }}>
        ⏳ Début du marathon dans
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
        {[{ val: d, label: 'Jours' }, { sep: ':' }, { val: h, label: 'H' }, { sep: ':' }, { val: m, label: 'Min' }, { sep: ':' }, { val: s, label: 'Sec' }].map((item, i) =>
          'sep' in item ? (
            <span key={i} style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text3)', marginBottom: 8 }}>{item.sep}</span>
          ) : (
            <div key={i} style={{ textAlign: 'center', minWidth: 52 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gold)', display: 'block', lineHeight: 1 }}>{pad(item.val!)}</span>
              <span style={{ fontSize: '.58rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)' }}>{item.label}</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handle() {
    setErr('')
    setLoading(true)

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setErr(error.message); setLoading(false); return }
      setTimeout(() => { window.location.href = '/' }, 500)
    } else {
      if (pseudo.length < 2) { setErr('Pseudo trop court (min 2 caractères).'); setLoading(false); return }
      if (password.length < 4) { setErr('Mot de passe trop court (min 4 caractères).'); setLoading(false); return }

      // Vérifier pseudo unique
      const { data: existing } = await supabase.from('profiles').select('id').ilike('pseudo', pseudo).single()
      if (existing) { setErr('Ce pseudo est déjà pris.'); setLoading(false); return }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { pseudo } }
      })
      if (error) { setErr(error.message); setLoading(false); return }
      setTimeout(() => { window.location.href = '/' }, 500)
    }
  }

  const live = new Date() >= CONFIG.MARATHON_START

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
      background: 'radial-gradient(ellipse 70% 55% at 50% -5%, rgba(232,196,106,.09) 0%, transparent 65%), var(--bg)',
      padding: '1.5rem',
    }}>
      <CountdownMini />

      <div style={{ width: '100%', maxWidth: 400, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', padding: '2.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--gold)', textAlign: 'center', lineHeight: 1.1, marginBottom: '.3rem' }}>
          Ciné<br />Marathon
        </div>
        <div style={{ textAlign: 'center', fontSize: '.66rem', letterSpacing: '3px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '2rem' }}>
          {CONFIG.SAISON_LABEL}
        </div>

        {tab === 'register' && live && (
          <div style={{ background: 'rgba(240,160,96,.08)', border: '1px solid rgba(240,160,96,.3)', borderRadius: 'var(--r)', padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '.4rem' }}>🎬</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--orange)', marginBottom: '.3rem' }}>
              Le marathon est déjà en cours !
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.6 }}>
              Tu participeras à la <strong style={{ color: 'var(--orange)' }}>Saison {CONFIG.SAISON_NUMERO + 1}</strong>.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setErr('') }}
              style={{
                flex: 1, padding: '.6rem', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '.85rem',
                color: tab === t ? 'var(--gold)' : 'var(--text2)',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
              }}>
              {t === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="toi@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        {tab === 'register' && (
          <div className="field">
            <label>Pseudo</label>
            <input placeholder="CinéPhile42" value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()} />
          </div>
        )}
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" placeholder="••••••" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>

        {err && <div style={{ color: 'var(--red)', fontSize: '.78rem', marginBottom: '.8rem', textAlign: 'center' }}>{err}</div>}

        <button
          style={{ width: '100%', background: 'var(--gold)', color: '#0a0a0f', fontWeight: 600, fontFamily: 'var(--font-body)', fontSize: '.95rem', padding: '.75rem', border: 'none', borderRadius: 'var(--r)', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '.5rem', opacity: loading ? .7 : 1 }}
          onClick={handle}
          disabled={loading}
        >
          {loading ? 'Chargement…' : tab === 'login' ? 'Se connecter' : 'Rejoindre le marathon'}
        </button>
      </div>
    </div>
  )
}
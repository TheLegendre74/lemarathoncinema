import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'

export const revalidate = 60

const LEVEL_INFO = {
  debutant: {
    label: 'Débutant',
    emoji: '🎬',
    color: 'var(--green)',
    desc: 'Les incontournables absolus — films que tout cinéphile doit avoir vu au moins une fois.',
    bgColor: 'rgba(60,180,60,.08)',
    borderColor: 'rgba(60,180,60,.3)',
  },
  intermediaire: {
    label: 'Intermédiaire',
    emoji: '🎭',
    color: 'var(--gold)',
    desc: 'Des œuvres importantes moins connues du grand public — pour aller plus loin.',
    bgColor: 'rgba(232,196,106,.08)',
    borderColor: 'rgba(232,196,106,.3)',
  },
  confirme: {
    label: 'Confirmé',
    emoji: '🏆',
    color: 'var(--purple)',
    desc: 'Films rares, art & essai, cinéma du monde — pour les vrais connaisseurs.',
    bgColor: 'rgba(160,80,240,.08)',
    borderColor: 'rgba(160,80,240,.3)',
  },
}

export default async function RattrapagePage() {
  const supabase = await createClient()

  const { data: films } = await (supabase as any)
    .from('recommendation_films')
    .select('*')
    .order('niveau')
    .order('position')

  const byLevel: Record<string, any[]> = { debutant: [], intermediaire: [], confirme: [] }
  ;(films ?? []).forEach((f: any) => {
    if (byLevel[f.niveau]) byLevel[f.niveau].push(f)
  })

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Rattrapage Cinéma</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>
          Des listes de films essentiels à voir, classées par niveau de culture ciné.
        </div>
      </div>

      {(['debutant', 'intermediaire', 'confirme'] as const).map(niveau => {
        const info = LEVEL_INFO[niveau]
        const list = byLevel[niveau]
        return (
          <div key={niveau} style={{ marginBottom: '2.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem',
              background: info.bgColor, border: `1px solid ${info.borderColor}`,
              borderRadius: 'var(--rl)', padding: '1rem 1.4rem',
            }}>
              <span style={{ fontSize: '2rem' }}>{info.emoji}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: info.color }}>{info.label}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginTop: '.2rem' }}>{info.desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: info.color }}>{list.length}</div>
            </div>

            {list.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: '.83rem', textAlign: 'center', padding: '1.5rem' }}>
                Aucun film dans cette liste pour l'instant.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {list.map((f: any, i: number) => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r)', padding: '.75rem 1rem',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text3)', width: 28, textAlign: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    {f.poster ? (
                      <div style={{ width: 36, height: 54, borderRadius: 5, overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={f.poster} alt={f.titre} width={36} height={54} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                      </div>
                    ) : (
                      <div style={{ width: 36, height: 54, borderRadius: 5, background: 'var(--bg3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎬</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.88rem', fontWeight: 500 }}>{f.titre}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>
                        {f.annee}{f.realisateur ? ` · ${f.realisateur}` : ''}
                      </div>
                      {f.description && (
                        <div style={{ fontSize: '.73rem', color: 'var(--text2)', marginTop: '.2rem', lineHeight: 1.4 }}>{f.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

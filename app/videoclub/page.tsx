import { notFound } from 'next/navigation'
import { getServerConfig } from '@/lib/serverConfig'
import Link from 'next/link'

export default async function VideoclubPage() {
  const cfg = await getServerConfig()
  const mode = (cfg as any).videoclub_mode ?? 'bientot'

  if (mode === 'cache') notFound()

  return (
    <div data-theme="neutre" style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--sp-8) 0', textAlign: 'center' }}>
      <h1 style={{
        fontFamily: 'var(--f-display)',
        fontWeight: 'var(--disp-weight)' as any,
        fontSize: 'var(--fs-8)',
        color: 'var(--ink)',
        letterSpacing: 'var(--disp-track)',
        marginBottom: 'var(--sp-5)',
      }}>
        Le Vidéoclub
      </h1>
      <p style={{
        fontFamily: 'var(--f-body)',
        fontSize: 'var(--fs-5)',
        color: 'var(--ink2)',
        lineHeight: 1.7,
        marginBottom: 'var(--sp-6)',
      }}>
        Chaque film vu sort du rayon et s&apos;use. Ton nom reste sur la boîte que tu as ouverte le premier.
      </p>
      <p style={{
        fontFamily: 'var(--f-data)',
        fontSize: 'var(--fs-2)',
        color: 'var(--ink3)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--ui-track)',
        marginBottom: 'var(--sp-7)',
      }}>
        Ouverture prochaine
      </p>
      <Link
        href="/"
        style={{
          fontFamily: 'var(--f-ui)',
          fontSize: 'var(--fs-2)',
          color: 'var(--accent-fg)',
          textDecoration: 'none',
        }}
      >
        ← Retour à l&apos;accueil
      </Link>
    </div>
  )
}

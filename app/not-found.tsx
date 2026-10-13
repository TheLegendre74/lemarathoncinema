import Link from 'next/link'
import NotFoundTheme from '@/components/theme/NotFoundTheme'

export default function NotFound() {
  return (
    <div data-ecran="404" style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--sp-4)',
      padding: 'var(--sp-6)',
      textAlign: 'center',
    }}>
      <NotFoundTheme />
      <h1 className="not-found-title" style={{
        fontFamily: 'var(--f-display)',
        fontWeight: 'var(--disp-weight)' as any,
        fontSize: 'clamp(2rem, 6vw, 3.5rem)',
        letterSpacing: 'var(--disp-track)',
        color: 'var(--accent-fg)',
        lineHeight: 1,
      }}>
        Page introuvable
      </h1>
      <p style={{ color: 'var(--ink2)', fontFamily: 'var(--f-body)', fontSize: 'var(--fs-5)' }}>
        Cette page n&apos;existe pas.
      </p>
      <Link
        href="/"
        style={{
          fontFamily: 'var(--f-ui)',
          fontSize: 'var(--fs-2)',
          letterSpacing: 'var(--ui-track)',
          textTransform: 'uppercase' as any,
          color: 'var(--accent-fg)',
          textDecoration: 'none',
          borderBottom: '1px solid var(--accent-fg)',
          paddingBottom: 2,
        }}
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}

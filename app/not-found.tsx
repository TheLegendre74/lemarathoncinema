import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--sp-4)',
      padding: 'var(--sp-6)',
      textAlign: 'center',
    }}>
      <h1 style={{
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

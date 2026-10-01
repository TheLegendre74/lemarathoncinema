import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '2rem', color: 'var(--gold, #c9a84c)' }}>Page introuvable</h1>
      <p style={{ color: 'var(--text2, #999)' }}>Cette page n&apos;existe pas.</p>
      <Link href="/" style={{ color: 'var(--gold, #c9a84c)', textDecoration: 'underline' }}>
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}

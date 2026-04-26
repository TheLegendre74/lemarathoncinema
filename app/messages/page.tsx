import MessagesLoader from './MessagesLoader'

export const dynamic = 'force-dynamic'

export default function MessagesPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Messages privés</div>
        <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginTop: '.4rem' }}>
          Tes conversations avec les autres marathoniens
        </div>
      </div>
      <MessagesLoader />
    </div>
  )
}

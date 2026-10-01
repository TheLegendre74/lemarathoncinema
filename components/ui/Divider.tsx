export default function Divider({ className }: { className?: string }) {
  return (
    <hr
      className={className}
      style={{
        border: 'none',
        height: 1,
        background: 'var(--line)',
        margin: 'var(--sp-5) 0',
      }}
    />
  )
}

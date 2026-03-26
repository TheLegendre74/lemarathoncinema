import { levelFromExp } from '@/lib/config'

interface ExpBarProps {
  exp: number
  showLabel?: boolean
  height?: number
}

export default function ExpBar({ exp, showLabel = true, height = 8 }: ExpBarProps) {
  const level = levelFromExp(exp)
  const expInLevel = exp % 100

  return (
    <div>
      {showLabel && (
        <div className="progress-label">
          <span>EXP vers niveau {level + 1}</span>
          <span>{expInLevel}/100</span>
        </div>
      )}
      <div className="expbar" style={{ height }}>
        <div className="expbar-fill" style={{ width: `${expInLevel}%`, height }} />
      </div>
    </div>
  )
}

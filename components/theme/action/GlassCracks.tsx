'use client'

import styles from './action-frame.module.css'

interface GlassCracksProps {
  className?: string
}

export default function GlassCracks({ className }: GlassCracksProps) {
  return (
    <svg
      className={`${styles.cracks} ${className ?? ''}`}
      viewBox="0 0 400 300"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <g stroke="rgba(232,237,242,.18)" strokeWidth="1.2" fill="none" strokeLinecap="round">
        <path d="M180 120 L200 100 L215 108 L225 90 L240 95" />
        <path d="M200 100 L195 80 L205 65" />
        <path d="M200 100 L210 115 L230 120 L245 110" />
        <path d="M200 100 L185 110 L175 130 L165 125" />
        <path d="M200 100 L195 115 L200 135" />
        <path d="M215 108 L220 125 L235 135" />
        <path d="M185 110 L170 105 L155 108" />
      </g>
      <circle cx="200" cy="100" r="2.5" fill="rgba(232,237,242,.12)" />
    </svg>
  )
}

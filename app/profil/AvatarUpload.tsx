'use client'

import { useState, useRef } from 'react'
import { uploadAvatar } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { useRouter } from 'next/navigation'

interface Props {
  currentAvatar: string | null
  pseudo: string
}

export default function AvatarUpload({ currentAvatar, pseudo }: Props) {
  const [preview, setPreview] = useState<string | null>(currentAvatar)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()
  const router = useRouter()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) { addToast('Fichier image uniquement (jpg, png, webp)', 'error'); return }
    if (file.size > 2 * 1024 * 1024) { addToast('Image trop volumineuse (max 2 Mo)', 'error'); return }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    setLoading(true)
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await uploadAvatar(formData)
    setLoading(false)

    if (res.error) { addToast(res.error, 'error'); setPreview(currentAvatar); return }
    addToast('Avatar mis à jour !', 'success')
    router.refresh()
  }

  return (
    <div
      style={{ position: 'relative', width: 80, height: 80, flexShrink: 0, cursor: 'pointer' }}
      onClick={() => !loading && inputRef.current?.click()}
      title="Changer l'avatar"
    >
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: preview ? 'transparent' : 'linear-gradient(135deg, var(--gold2), var(--purple))',
        backgroundImage: preview ? `url(${preview})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#0a0a0f', fontWeight: 700,
        border: '2px solid transparent',
        transition: 'border-color .2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
      >
        {!preview && pseudo.slice(0, 2).toUpperCase()}
      </div>

      {/* Edit overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0, transition: 'opacity .2s', fontSize: '1.2rem',
      }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
      >
        {loading ? '⏳' : '📷'}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  )
}

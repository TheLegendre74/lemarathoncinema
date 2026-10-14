'use client'

import s from './horreur-forum.module.css'

interface Topic {
  id: number
  title: string
  author: string
  lastMessage?: string
  messageCount: number
  lastActivityAt: string
}

interface Props {
  topics: Topic[]
  topicCount: number
  litCount: number
  onCreateTopic?: () => void
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'il y a quelques minutes'
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'hier'
  return `il y a ${d} jours`
}

function isLit(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 3 * 24 * 3600000
}

export default function HorreurForum({ topics, topicCount, litCount, onCreateTopic }: Props) {
  return (
    <div className={s.wrap} data-ecran="forum">
      <div className={s.header}>
        {topicCount} HISTOIRES · {litCount} BOUGIES ENCORE ALLUMÉES
      </div>

      {topics.map((t) => {
        const lit = isLit(t.lastActivityAt)
        return (
          <div key={t.id} className={s.topic}>
            <div className={s.candle}>
              {lit ? (
                <>
                  <div className={s.flame} />
                  <div className={s.wick} />
                </>
              ) : (
                <>
                  <div className={s.smoke} />
                  <div className={s.smokeWick} />
                </>
              )}
            </div>
            <div>
              <div className={s.title}>{t.title}</div>
              <div className={s.meta}>
                RACONTÉE PAR {t.author.toUpperCase()} · {timeAgo(t.lastActivityAt).toUpperCase()}
              </div>
              {t.lastMessage && (
                <div className={s.lastMsg}>
                  {t.lastMessage.slice(0, 90)}
                </div>
              )}
              <div className={s.count}>{t.messageCount} message{t.messageCount > 1 ? 's' : ''}</div>
            </div>
          </div>
        )
      })}

      {onCreateTopic && (
        <button className={s.createBtn} onClick={onCreateTopic}>
          Raconter une histoire
        </button>
      )}

      <div className={s.pied}>
        Une bougie s&apos;éteint quand personne n&apos;a parlé depuis trois jours.
      </div>
    </div>
  )
}

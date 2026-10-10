import { getServerConfig } from '@/lib/serverConfig'
import type { ServerConfig } from '@/lib/serverConfig'
import { DEFAULT_RULES, type RuleCard } from '@/lib/rules'
import { BADGES } from '@/lib/config'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Règles — Ciné Marathon' }
export const revalidate = 120

function interpolate(text: string, cfg: ServerConfig): string {
  return text
    .replace(/\{EXP_FILM\}/g,     String(cfg.EXP_FILM))
    .replace(/\{EXP_FDLS\}/g,     String(cfg.EXP_FDLS))
    .replace(/\{EXP_DUEL_WIN\}/g, String(cfg.EXP_DUEL_WIN))
    .replace(/\{EXP_VOTE\}/g,     String(cfg.EXP_VOTE))
    .replace(/\{SEANCE_JOUR\}/g,  cfg.SEANCE_JOUR)
    .replace(/\{SEANCE_HEURE\}/g, cfg.SEANCE_HEURE)
    .replace(/\{FDLS_JOUR\}/g,    cfg.FDLS_JOUR)
    .replace(/\{FDLS_HEURE\}/g,   cfg.FDLS_HEURE)
}

export default async function ReglesPage() {
  const cfg = await getServerConfig()

  let cards: RuleCard[] = DEFAULT_RULES
  if (cfg.MARATHON_RULES) {
    try {
      const parsed = JSON.parse(cfg.MARATHON_RULES)
      if (Array.isArray(parsed) && parsed.length > 0) cards = parsed
    } catch { /* keep defaults */ }
  }

  const badgesFromConfig = BADGES.map(b => ({
    icon: b.icon,
    label: b.label,
    req: b.req,
    desc: b.desc,
  }))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--sp-7)' }}>
        <h1 style={{
          fontFamily: 'var(--f-display)',
          fontWeight: 'var(--disp-weight)' as any,
          fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
          letterSpacing: 'var(--disp-track)',
          color: 'var(--ink)',
          lineHeight: 1.1,
          marginBottom: 'var(--sp-2)',
        }}>
          Les règles du jeu
        </h1>
        <p style={{
          fontFamily: 'var(--f-data)',
          fontSize: 'var(--fs-1)',
          letterSpacing: 'var(--ui-track)',
          textTransform: 'uppercase' as any,
          color: 'var(--ink3)',
        }}>
          SAISON {cfg.SAISON_NUMERO} — {cfg.SAISON_LABEL}
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        {cards.map((c, i) => (
          <section key={`${c.title}-${i}`}>
            <h2 style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 'var(--disp-weight)' as any,
              fontSize: 'var(--fs-7)',
              letterSpacing: 'var(--disp-track)',
              color: 'var(--ink)',
              lineHeight: 1.2,
              marginBottom: 'var(--sp-3)',
            }}>
              {c.title}
            </h2>

            {c.text && (
              <p style={{
                fontFamily: 'var(--f-body)',
                fontSize: 'var(--fs-4)',
                color: 'var(--ink2)',
                lineHeight: 1.7,
                marginBottom: 'var(--sp-3)',
              }}>
                {interpolate(c.text, cfg)}
              </p>
            )}

            {c.intro && (
              <p style={{
                fontFamily: 'var(--f-body)',
                fontSize: 'var(--fs-4)',
                color: 'var(--ink2)',
                lineHeight: 1.7,
                marginBottom: 'var(--sp-2)',
              }}>
                {interpolate(c.intro, cfg)}
              </p>
            )}

            {c.list && c.list.length > 0 && (
              <ul style={{
                fontFamily: 'var(--f-body)',
                fontSize: 'var(--fs-4)',
                color: 'var(--ink2)',
                lineHeight: 1.8,
                paddingLeft: 'var(--sp-5)',
                marginBottom: 'var(--sp-3)',
              }}>
                {c.list.map((item, j) => (
                  <li key={j}>{interpolate(item, cfg)}</li>
                ))}
              </ul>
            )}

            {c.after && (
              <p style={{
                fontFamily: 'var(--f-body)',
                fontSize: 'var(--fs-4)',
                color: 'var(--ink2)',
                lineHeight: 1.7,
              }}>
                {interpolate(c.after, cfg)}
              </p>
            )}

            {c.table && c.table.length > 0 && (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--f-body)',
                fontSize: 'var(--fs-3)',
                marginTop: 'var(--sp-2)',
              }}>
                <tbody>
                  {c.table.map(([action, val], j) => (
                    <tr key={j} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: 'var(--sp-2) var(--sp-3)', color: 'var(--ink2)' }}>
                        {interpolate(action, cfg)}
                      </td>
                      <td style={{
                        padding: 'var(--sp-2) var(--sp-3)',
                        color: 'var(--accent-fg)',
                        fontFamily: 'var(--f-data)',
                        fontWeight: 700,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}>
                        {interpolate(val, cfg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

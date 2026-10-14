'use client'

import s from './horreur-semaine.module.css'

interface DayEvent {
  text: string
  type: 'lueur' | 'lune' | 'passed' | 'normal'
  exp?: string
}

interface DayColumn {
  name: string
  current: boolean
  events: DayEvent[]
}

interface SeasonWeekItem {
  num: number
  genre: string
  current: boolean
}

interface Props {
  weekLabel: string
  days: DayColumn[]
  seasonWeeks: SeasonWeekItem[]
  montants: { label: string; value: string }[]
  reserve: string[]
}

export default function HorreurSemaine({ weekLabel, days, seasonWeeks, montants, reserve }: Props) {
  return (
    <div className={s.wrap} data-ecran="semaine">
      <div className={s.header}>{weekLabel}</div>

      <div className={s.grid}>
        {days.map((day) => (
          <div key={day.name} className={day.current ? s.colCurrent : s.col}>
            <div className={s.dayName}>{day.name}</div>
            <div>
              {day.events.map((ev, j) => (
                <div key={j} className={
                  ev.type === 'lueur' ? s.eventLueur :
                  ev.type === 'lune' ? s.eventLune :
                  ev.type === 'passed' ? s.eventPassed :
                  s.event
                }>
                  {ev.text}
                  {ev.exp && <span className={s.expTag}> · {ev.exp}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={s.sectionTitle}>
        LES {seasonWeeks.length} SEMAINES DE LA SAISON
      </div>
      <div className={s.seasonBand}>
        {seasonWeeks.map((w) => (
          <div key={w.num} className={w.current ? s.seasonWeekCurrent : s.seasonWeek}>
            {romanize(w.num)} · {w.genre}
          </div>
        ))}
      </div>

      <div className={s.sectionTitle}>CE QU&apos;IL FAUT POUR PASSER LA SEMAINE</div>
      <div className={s.montants}>
        {montants.map((m) => (
          <span key={m.label}>{m.label} <b>{m.value}</b></span>
        ))}
      </div>

      {reserve.length > 0 && (
        <div className={s.reserve}>
          <div className={s.sectionTitle}>EN RÉSERVE CETTE SEMAINE</div>
          <div className={s.reserveGrid}>
            {reserve.map((title, i) => (
              <div key={i} className={s.reserveFilm}>{title}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function romanize(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i] }
  }
  return result
}

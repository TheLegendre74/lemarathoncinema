import type { ThemeKey, ThemeDef } from './types'
import { neutreTheme } from './neutre'
import { actionTheme } from './action'
import { comedieTheme } from './comedie'
import { westernTheme } from './western'
import { horreurTheme } from './horreur'

const THEMES: Record<ThemeKey, ThemeDef> = {
  neutre: neutreTheme,
  action: actionTheme,
  comedie: comedieTheme,
  western: westernTheme,
  horreur: horreurTheme,
}

export function getThemeDef(key: ThemeKey): ThemeDef {
  return THEMES[key] ?? neutreTheme
}

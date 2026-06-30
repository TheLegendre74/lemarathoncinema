import Phaser from 'phaser'
import type { FilmCombatant, MoveEngine, TurnDecision, BattleEvent, GenreType, SideState, FieldState } from './types'
import type { TeamMember } from './TeamSelectUI'
import { buildCombatant, getCard, applyClimaxToTeam } from './cardsData'
import type { Saison1Entry } from './cardsData'
import {
  resolveTurn, chooseAI, newSide, newField, switchIn, STRUGGLE, updateClimaxMult,
} from './battleEngine'
import { TYPE_COLORS, TYPE_LABELS, getTypeMult, getEffectivenessText } from './config/types.config'
import { BALANCE } from './config/balance.config'

const W = 960, H = 540

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

export class BattleScene extends Phaser.Scene {
  private playerTeam!: FilmCombatant[]
  private clippyTeam!: FilmCombatant[]
  private playerIdx = 0
  private clippyIdx = 0
  private playerSide!: SideState
  private clippySide!: SideState
  private field!: FieldState
  private turnCount = 0
  private cbs!: { onVictory: () => void; onDefeat: () => void }

  // UI elements
  private playerCard!: Phaser.GameObjects.Graphics
  private playerNameTxt!: Phaser.GameObjects.Text
  private playerTypeTxt!: Phaser.GameObjects.Text
  private playerHpBar!: Phaser.GameObjects.Graphics
  private playerHpTxt!: Phaser.GameObjects.Text

  private enemyCard!: Phaser.GameObjects.Graphics
  private enemyNameTxt!: Phaser.GameObjects.Text
  private enemyTypeTxt!: Phaser.GameObjects.Text
  private enemyHpBar!: Phaser.GameObjects.Graphics
  private enemyHpTxt!: Phaser.GameObjects.Text

  private textBox!: Phaser.GameObjects.Graphics
  private textBoxTxt!: Phaser.GameObjects.Text
  private mainMenu!: Phaser.GameObjects.Container
  private moveMenu!: Phaser.GameObjects.Container
  private switchMenu!: Phaser.GameObjects.Container

  private moveBtns: { bg: Phaser.GameObjects.Rectangle; name: Phaser.GameObjects.Text; info: Phaser.GameObjects.Text; eff: Phaser.GameObjects.Text }[] = []
  private moveDesc!: Phaser.GameObjects.Text
  private switchSlots: { bg: Phaser.GameObjects.Rectangle; name: Phaser.GameObjects.Text; hp: Phaser.GameObjects.Text }[] = []

  private twStr = ''
  private twIdx = 0
  private twTmr = 0
  private twDone = true
  private msgRes: (() => void) | null = null
  private actRes: ((a: TurnDecision) => void) | null = null
  private dead = false
  private forcedSwitch = false
  private climaxUsed = false

  constructor() { super({ key: 'CinemonBattle' }) }

  get playerMon(): FilmCombatant { return this.playerTeam[this.playerIdx] }
  get clippyMon(): FilmCombatant { return this.clippyTeam[this.clippyIdx] }

  init(data: any) {
    const members: TeamMember[] = data.teamMembers
    this.cbs = { onVictory: data.onVictory ?? (() => {}), onDefeat: data.onDefeat ?? (() => {}) }
    this.dead = false
    this.turnCount = 0
    this.forcedSwitch = false
    this.climaxUsed = false
    this.msgRes = null
    this.actRes = null

    // Build player team from TeamMember data
    this.playerTeam = members.map(m => buildCombatant(m.card, m.equippedNames))

    // Apply Climax data from saison1.json to player team
    const saison1: Map<number, Saison1Entry> | null = data.saison1 ?? null
    if (saison1) applyClimaxToTeam(this.playerTeam, saison1)

    // Clippy's team comes from the boss system
    this.clippyTeam = data.clippyTeam ?? this.playerTeam.map(m => buildCombatant(getCard(m.num)))

    this.playerIdx = 0
    this.clippyIdx = 0
    this.playerSide = newSide()
    this.clippySide = newSide()
    this.field = newField()
  }

  create() {
    // Background — cinema screen
    this.add.rectangle(W / 2, H / 2, W, H, 0x0f1525)

    // Top gradient
    const topGrad = this.add.graphics()
    topGrad.fillGradientStyle(0x1a2535, 0x1a2535, 0x0a1020, 0x0a1020)
    topGrad.fillRect(0, 0, W, 90)

    // Platforms — cinema seats / screen
    const plat = this.add.graphics()
    plat.fillStyle(0x1a1a2e, 0.6)
    plat.fillEllipse(700, 280, 220, 45)   // enemy platform
    plat.fillEllipse(200, 370, 240, 45)   // player platform
    plat.lineStyle(2, 0x334455, 0.5)
    plat.strokeEllipse(700, 280, 220, 45)
    plat.strokeEllipse(200, 370, 240, 45)

    // Enemy info panel (top right)
    this.enemyCard = this.add.graphics()
    this.enemyNameTxt = this.add.text(490, 12, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fff', fontStyle: 'bold' })
    this.enemyTypeTxt = this.add.text(490, 32, '', { fontFamily: 'monospace', fontSize: '12px', color: '#aaa' })
    this.enemyHpBar = this.add.graphics()
    this.enemyHpTxt = this.add.text(920, 50, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ccc' }).setOrigin(1, 0)

    // Player info panel (bottom left)
    this.playerCard = this.add.graphics()
    this.playerNameTxt = this.add.text(30, 300, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fff', fontStyle: 'bold' })
    this.playerTypeTxt = this.add.text(30, 320, '', { fontFamily: 'monospace', fontSize: '12px', color: '#aaa' })
    this.playerHpBar = this.add.graphics()
    this.playerHpTxt = this.add.text(420, 340, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ccc' }).setOrigin(1, 0)

    // Text box — styled as cinema subtitle
    this.textBox = this.add.graphics()
    this.drawTextBox()
    this.textBoxTxt = this.add.text(30, 418, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
      wordWrap: { width: 540, useAdvancedWrap: true }, lineSpacing: 4,
    })

    // Menus
    this.buildMainMenu()
    this.buildMoveMenu()
    this.buildSwitchMenu()
    this.hideAllMenus()

    this.input.on('pointerdown', this.onClick, this)

    // Entry
    switchIn(this.playerMon, this.playerSide, this.clippyMon, this.field, [])
    switchIn(this.clippyMon, this.clippySide, this.playerMon, this.field, [])
    this.refreshAll()
    this.runBattle()
  }

  update(_t: number, dt: number) {
    if (this.dead || this.twDone) return
    this.twTmr += dt
    while (this.twTmr >= 22 && this.twIdx < this.twStr.length) { this.twIdx++; this.twTmr -= 22 }
    this.textBoxTxt.setText(this.twStr.substring(0, this.twIdx))
    if (this.twIdx >= this.twStr.length) this.twDone = true
  }

  shutdown() {
    this.dead = true
    this.input.off('pointerdown', this.onClick, this)
    this.msgRes = null; this.actRes = null
  }

  // ── Drawing ──

  private drawTextBox() {
    this.textBox.clear()
    this.textBox.fillStyle(0x000000, 0.75)
    this.textBox.fillRoundedRect(15, 402, 570, 128, 8)
    this.textBox.lineStyle(1, 0x445566, 0.5)
    this.textBox.strokeRoundedRect(15, 402, 570, 128, 8)
  }

  private drawHpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, cur: number, max: number) {
    g.clear()
    const p = Math.max(0, cur / max)
    const c = p > 0.5 ? 0x4CAF50 : p > 0.2 ? 0xFFC107 : 0xF44336
    g.fillStyle(0x222222); g.fillRoundedRect(x, y, w, h, 3)
    if (p > 0) { g.fillStyle(c); g.fillRoundedRect(x, y, Math.max(3, w * p), h, 3) }
  }

  private drawFilmSprite(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, types: GenreType[], facing: 'left' | 'right') {
    g.clear()
    const c1 = TYPE_COLORS[types[0]] ?? 0x888888
    const c2 = types[1] ? TYPE_COLORS[types[1]] : c1

    // Film reel silhouette
    g.fillStyle(c1, 0.85)
    g.fillRoundedRect(x - size / 2, y - size * 0.7, size, size * 1.2, 8)
    g.lineStyle(3, c2)
    g.strokeRoundedRect(x - size / 2, y - size * 0.7, size, size * 1.2, 8)

    // Film sprocket holes
    g.fillStyle(0x0f1525, 0.6)
    for (let i = 0; i < 4; i++) {
      const hy = y - size * 0.5 + i * size * 0.35
      g.fillRect(x - size / 2 + 4, hy, 8, 6)
      g.fillRect(x + size / 2 - 12, hy, 8, 6)
    }

    // "Screen" in center
    g.fillStyle(0x111828)
    g.fillRoundedRect(x - size * 0.3, y - size * 0.4, size * 0.6, size * 0.6, 4)
    g.fillStyle(c1, 0.3)
    g.fillRoundedRect(x - size * 0.3, y - size * 0.4, size * 0.6, size * 0.6, 4)
  }

  private refreshAll() {
    this.refreshPlayer()
    this.refreshEnemy()
  }

  private refreshPlayer() {
    const m = this.playerMon
    this.drawFilmSprite(this.playerCard, 200, 340, 80, m.types, 'right')
    const nm = m.name.length > 22 ? m.name.substring(0, 20) + '…' : m.name
    this.playerNameTxt.setText(nm)
    const types = m.types.map(t => TYPE_LABELS[t]).join(' / ')
    this.playerTypeTxt.setText(types)
    this.drawHpBar(this.playerHpBar, 30, 340, 390, 10, m.hp, m.maxHp)
    this.playerHpTxt.setText(`${m.hp}/${m.maxHp}`)
  }

  private refreshEnemy() {
    const m = this.clippyMon
    this.drawFilmSprite(this.enemyCard, 700, 250, 70, m.types, 'left')
    const nm = m.name.length > 22 ? m.name.substring(0, 20) + '…' : m.name
    this.enemyNameTxt.setText(`${nm}  [Clippy]`)
    const types = m.types.map(t => TYPE_LABELS[t]).join(' / ')
    this.enemyTypeTxt.setText(types)
    this.drawHpBar(this.enemyHpBar, 490, 54, 390, 10, m.hp, m.maxHp)
    this.enemyHpTxt.setText(`${m.hp}/${m.maxHp}`)
  }

  // ── Menus ──

  private hideAllMenus() {
    this.mainMenu.setVisible(false)
    this.moveMenu.setVisible(false)
    this.switchMenu.setVisible(false)
  }

  private buildMainMenu() {
    this.mainMenu = this.add.container(0, 0)
    const labels = ['ATTAQUE', 'ÉQUIPE', 'CLIMAX', 'ABANDONNER']
    const colors = [0xCC3333, 0x3366CC, 0xCC8800, 0x555555]
    const bw = 163, bh = 52, gap = 6, sx = 605, sy = 410
    labels.forEach((l, i) => {
      const c = i % 2, r = Math.floor(i / 2)
      const bx = sx + c * (bw + gap), by = sy + r * (bh + gap)
      const bg = this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, colors[i])
        .setStrokeStyle(2, 0xffffff, 0.3).setInteractive({ useHandCursor: true })
      const t = this.add.text(bx + bw / 2, by + bh / 2, l, {
        fontFamily: 'monospace', fontSize: '15px', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5)
      bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffffff, 1))
      bg.on('pointerout', () => bg.setStrokeStyle(2, 0xffffff, 0.3))
      bg.on('pointerdown', () => this.mainMenuClick(i))
      this.mainMenu.add([bg, t])
    })
  }

  private buildMoveMenu() {
    this.moveMenu = this.add.container(0, 0)
    this.moveBtns = []
    const bw = 270, bh = 52, gap = 6
    for (let i = 0; i < 4; i++) {
      const c = i % 2, r = Math.floor(i / 2)
      const bx = 15 + c * (bw + gap), by = 410 + r * (bh + gap)
      const bg = this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0x333333)
        .setStrokeStyle(2, 0xffffff, 0.3).setInteractive({ useHandCursor: true })
      const name = this.add.text(bx + 8, by + 6, '', { fontFamily: 'monospace', fontSize: '13px', color: '#fff', fontStyle: 'bold' })
      const info = this.add.text(bx + 8, by + 24, '', { fontFamily: 'monospace', fontSize: '10px', color: '#aaa' })
      const eff = this.add.text(bx + bw - 8, by + 6, '', { fontFamily: 'monospace', fontSize: '10px', color: '#4CAF50' }).setOrigin(1, 0)
      const mi = i
      bg.on('pointerover', () => {
        bg.setStrokeStyle(2, 0xffffff, 1)
        const mon = this.playerMon
        if (mi < mon.movesDisplay.length) {
          const d = mon.movesDisplay[mi]
          this.moveDesc.setText(d.effet || d.full || '')
        }
      })
      bg.on('pointerout', () => { bg.setStrokeStyle(2, 0xffffff, 0.3); this.moveDesc.setText('') })
      bg.on('pointerdown', () => this.moveClick(i))
      this.moveBtns.push({ bg, name, info, eff })
      this.moveMenu.add([bg, name, info, eff])
    }
    // Description tooltip
    this.moveDesc = this.add.text(15, 522, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ccc',
      wordWrap: { width: 540 },
    })
    this.moveMenu.add(this.moveDesc)

    // Back button
    const bb = this.add.rectangle(860, 490, 80, 30, 0x444444)
      .setStrokeStyle(1, 0xffffff, 0.3).setInteractive({ useHandCursor: true })
    const bt = this.add.text(860, 490, 'Retour', { fontFamily: 'monospace', fontSize: '12px', color: '#fff' }).setOrigin(0.5)
    bb.on('pointerdown', () => { this.moveMenu.setVisible(false); this.mainMenu.setVisible(true) })
    this.moveMenu.add([bb, bt])
  }

  private buildSwitchMenu() {
    this.switchMenu = this.add.container(0, 0)
    this.switchMenu.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive())
    const pg = this.add.graphics()
    pg.fillStyle(0x111828, 0.97); pg.fillRoundedRect(150, 30, 660, 480, 12)
    pg.lineStyle(2, 0x445566); pg.strokeRoundedRect(150, 30, 660, 480, 12)
    this.switchMenu.add(pg)
    this.switchMenu.add(this.add.text(480, 48, 'Choisissez un film', {
      fontFamily: 'monospace', fontSize: '18px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5, 0))

    this.switchSlots = []
    for (let i = 0; i < 6; i++) {
      const sy = 80 + i * 60
      const bg = this.add.rectangle(480, sy + 26, 600, 52, 0x1a2535)
        .setStrokeStyle(1, 0x334455).setInteractive({ useHandCursor: true })
      const name = this.add.text(210, sy + 10, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' })
      const hp = this.add.text(740, sy + 16, '', { fontFamily: 'monospace', fontSize: '12px', color: '#aaa' }).setOrigin(1, 0)
      bg.on('pointerover', () => bg.setFillStyle(0x253545))
      bg.on('pointerout', () => bg.setFillStyle(0x1a2535))
      const idx = i
      bg.on('pointerdown', () => this.switchClick(idx))
      this.switchSlots.push({ bg, name, hp })
      this.switchMenu.add([bg, name, hp])
    }

    // Back button (hidden during forced switch)
    const bk = this.add.rectangle(480, 470, 120, 36, 0x555555)
      .setStrokeStyle(1, 0xffffff, 0.3).setInteractive({ useHandCursor: true })
    const bkt = this.add.text(480, 470, 'Retour', { fontFamily: 'monospace', fontSize: '13px', color: '#fff' }).setOrigin(0.5)
    bk.on('pointerdown', () => {
      if (this.forcedSwitch) return
      this.switchMenu.setVisible(false)
      this.mainMenu.setVisible(true)
    })
    this.switchMenu.add([bk, bkt])
  }

  private showMoveMenu() {
    const m = this.playerMon
    for (let i = 0; i < 4; i++) {
      const btn = this.moveBtns[i]
      if (i >= m.moves.length) {
        btn.bg.setVisible(false); btn.name.setVisible(false); btn.info.setVisible(false); btn.eff.setVisible(false)
        continue
      }
      btn.bg.setVisible(true); btn.name.setVisible(true); btn.info.setVisible(true); btn.eff.setVisible(true)

      const mv = m.moves[i]
      const disp = m.movesDisplay[i]
      const pp = m.ppLeft[i]
      const maxPP = mv.pp >= 99 ? 15 : mv.pp
      const catIcon = mv.cat === 'phys' ? '⚔' : mv.cat === 'spe' ? '✦' : '✨'
      const typeColor = mv.type !== '—' ? TYPE_COLORS[mv.type as GenreType] ?? 0x888888 : 0x888888

      btn.bg.setFillStyle(pp > 0 ? typeColor : 0x333333, pp > 0 ? 0.3 : 0.15)
      btn.name.setText(`${catIcon} ${disp.name}`)
      btn.name.setAlpha(pp > 0 ? 1 : 0.4)

      const pow = mv.pow ? `Pui:${mv.pow}` : ''
      const acc = `Pré:${mv.acc ?? 100}`
      btn.info.setText(`${pow} ${acc}  PP:${pp}/${maxPP}`)

      // Effectiveness vs current enemy
      if (mv.cat !== 'status' && mv.type !== '—') {
        const mult = getTypeMult(mv.type, this.clippyMon.types)
        const effTxt = getEffectivenessText(mult)
        btn.eff.setText(effTxt)
        btn.eff.setColor(mult > 1.1 ? '#4CAF50' : mult < 0.9 ? '#ff6644' : mult === 0 ? '#ff0000' : '#888')
      } else {
        btn.eff.setText('')
      }
    }
    this.moveMenu.setVisible(true)
  }

  private showSwitchMenu() {
    for (let i = 0; i < 6; i++) {
      const slot = this.switchSlots[i]
      if (i >= this.playerTeam.length) {
        slot.bg.setVisible(false); slot.name.setVisible(false); slot.hp.setVisible(false)
        continue
      }
      slot.bg.setVisible(true); slot.name.setVisible(true); slot.hp.setVisible(true)
      const mon = this.playerTeam[i]
      const isCurrent = i === this.playerIdx
      const isDead = !mon.isAlive

      slot.name.setText(`${isCurrent ? '▸ ' : '  '}${mon.name}`)
      slot.name.setColor(isDead ? '#666' : isCurrent ? '#FFD700' : '#fff')
      slot.hp.setText(isDead ? 'K.O.' : `${mon.hp}/${mon.maxHp}`)
      slot.hp.setColor(isDead ? '#ff4444' : '#aaa')
      slot.bg.setFillStyle(isDead ? 0x1a1a1a : isCurrent ? 0x2a3a2a : 0x1a2535)
    }
    this.switchMenu.setVisible(true)
  }

  // ── Input handlers ──

  private onClick() {
    if (this.twDone && this.msgRes) {
      const r = this.msgRes; this.msgRes = null; r()
    }
  }

  private mainMenuClick(i: number) {
    if (i === 0) { // ATTAQUE
      this.mainMenu.setVisible(false)
      this.showMoveMenu()
    } else if (i === 1) { // ÉQUIPE
      this.mainMenu.setVisible(false)
      this.forcedSwitch = false
      this.showSwitchMenu()
    } else if (i === 2) { // CLIMAX
      this.handleClimax()
    } else if (i === 3) { // ABANDONNER
      this.showMessage('Vous abandonnez le combat…').then(() => {
        this.cbs.onDefeat()
      })
    }
  }

  private moveClick(i: number) {
    const m = this.playerMon
    if (i >= m.moves.length) return
    if (m.ppLeft[i] <= 0) {
      // Check if ALL moves are out of PP
      if (m.ppLeft.every(pp => pp <= 0)) {
        this.moveMenu.setVisible(false)
        if (this.actRes) { const r = this.actRes; this.actRes = null; r({ type: 'move', move: STRUGGLE, moveIndex: -1 }) }
        return
      }
      return // can't use this specific move
    }
    this.moveMenu.setVisible(false)
    if (this.actRes) {
      const r = this.actRes; this.actRes = null
      r({ type: 'move', move: m.moves[i], moveIndex: i })
    }
  }

  private switchClick(i: number) {
    if (i >= this.playerTeam.length) return
    if (i === this.playerIdx && !this.forcedSwitch) return
    if (!this.playerTeam[i].isAlive) return

    this.switchMenu.setVisible(false)
    if (this.actRes) {
      const r = this.actRes; this.actRes = null
      r({ type: 'switch', targetIndex: i })
    }
  }

  // ── Climax ──

  private async handleClimax() {
    const mon = this.playerMon
    if (this.climaxUsed) {
      await this.showMessage('Le Climax a déjà été utilisé dans ce combat !')
      return
    }
    if (!mon.mega) {
      await this.showMessage(`${mon.name} n'a pas de forme Climax.`)
      return
    }
    if (!mon.isAlive) return

    this.climaxUsed = true
    mon.megaActive = true

    // Deploy weather from affinity
    if (mon.mega.affinity) {
      this.field.weather = mon.mega.affinity
      this.field.weatherTurns = BALANCE.WEATHER_DURATION
      this.field.weatherSetter = this.playerSide
      const weatherNames: Record<string, string> = {
        sun: 'Plein Soleil', rain: 'Pluie Battante',
        sand: 'Tempête de Sable', snow: 'Chute de Neige',
      }
      await this.showMessage(`${mon.name} s'éveille en Climax !`)
      await this.showMessage(`La météo tourne : ${weatherNames[mon.mega.affinity] ?? mon.mega.affinity} !`)
    } else {
      await this.showMessage(`${mon.name} s'éveille en Climax !`)
    }

    updateClimaxMult(mon, this.field)
    this.refreshAll()
  }

  // ── Message system ──

  private showMessage(text: string): Promise<void> {
    return new Promise(resolve => {
      this.twStr = text; this.twIdx = 0; this.twTmr = 0; this.twDone = false
      this.textBoxTxt.setText('')
      this.msgRes = resolve
    })
  }

  private waitForAction(): Promise<TurnDecision> {
    return new Promise(resolve => {
      this.actRes = resolve
      this.mainMenu.setVisible(true)
    })
  }

  private waitForSwitch(): Promise<TurnDecision> {
    return new Promise(resolve => {
      this.actRes = resolve
      this.forcedSwitch = true
      this.showSwitchMenu()
    })
  }

  // ── Main battle loop ──

  private async runBattle() {
    await this.showMessage(`Le combat commence !`)
    await this.showMessage(`Clippy envoie ${this.clippyMon.name} !`)
    await this.showMessage(`${this.playerMon.name}, en avant !`)

    while (!this.dead) {
      this.turnCount++

      // Player chooses action
      this.hideAllMenus()
      this.refreshAll()
      const playerDec = await this.waitForAction()
      this.hideAllMenus()

      // Clippy AI decides
      const clippyDec = chooseAI(
        this.clippyMon, this.playerMon,
        this.clippySide, this.playerSide, this.field,
        this.clippyTeam, this.clippyIdx,
      )

      // Resolve turn
      const result = resolveTurn(
        this.playerTeam, this.playerIdx,
        this.clippyTeam, this.clippyIdx,
        playerDec, clippyDec,
        this.playerSide, this.clippySide,
        this.field,
      )

      this.playerIdx = result.newPlayerIdx
      this.clippyIdx = result.newClippyIdx

      // Animate events
      for (const evt of result.events) {
        this.refreshAll()
        await this.showMessage(evt.text)
      }

      this.refreshAll()

      if (result.done) {
        if (result.winner === 'player') {
          await this.showMessage('Victoire ! Clippy est vaincu !')
          this.cbs.onVictory()
        } else if (result.winner === 'clippy') {
          await this.showMessage('Défaite… Votre équipe est à terre.')
          this.cbs.onDefeat()
        } else {
          await this.showMessage('Match nul !')
          this.cbs.onDefeat()
        }
        return
      }

      // Handle KOs — forced switches
      if (!this.playerMon.isAlive) {
        const hasAlive = this.playerTeam.some(m => m.isAlive)
        if (!hasAlive) {
          await this.showMessage('Tous vos films sont K.O…')
          this.cbs.onDefeat()
          return
        }
        await this.showMessage(`${this.playerMon.name} est K.O. ! Choisissez un remplaçant.`)
        const switchDec = await this.waitForSwitch()
        if (switchDec.type === 'switch') {
          this.playerIdx = switchDec.targetIndex
          const events: BattleEvent[] = []
          switchIn(this.playerTeam[this.playerIdx], this.playerSide, this.clippyMon, this.field, events)
          for (const evt of events) {
            this.refreshAll()
            await this.showMessage(evt.text)
          }
        }
        this.refreshAll()
      }

      if (!this.clippyMon.isAlive) {
        const hasAlive = this.clippyTeam.some(m => m.isAlive)
        if (!hasAlive) {
          await this.showMessage('Victoire ! Tous les films de Clippy sont K.O. !')
          this.cbs.onVictory()
          return
        }
        // Clippy auto-switches to best available
        const bestIdx = this.clippyTeam.findIndex((m, i) => i !== this.clippyIdx && m.isAlive)
        if (bestIdx >= 0) {
          this.clippyIdx = bestIdx
          await this.showMessage(`Clippy envoie ${this.clippyMon.name} !`)
          const events: BattleEvent[] = []
          switchIn(this.clippyMon, this.clippySide, this.playerMon, this.field, events)
          for (const evt of events) {
            this.refreshAll()
            await this.showMessage(evt.text)
          }
        }
        this.refreshAll()
      }

      // Safety: max turns
      if (this.turnCount >= BALANCE.MAX_TURNS) {
        await this.showMessage('Le combat a atteint sa limite de tours !')
        const pHp = this.playerTeam.reduce((s, m) => s + m.hp, 0)
        const cHp = this.clippyTeam.reduce((s, m) => s + m.hp, 0)
        if (pHp > cHp) { this.cbs.onVictory() } else { this.cbs.onDefeat() }
        return
      }
    }
  }
}

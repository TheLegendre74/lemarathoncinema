import Phaser from 'phaser'
import type { FilmCombatant, ClippyCombatant, Move, TurnAction, FilmType } from './types'
import { EMPTY_STAGES } from './types'
import { TYPE_COLORS, TYPE_NAMES, getEffectiveness, ALL_TYPES } from './config/types.config'
import { CLIPPY_SIGNATURE_MOVES, CLIPPY_DIALOGUES } from './config/clippy.config'
import { CLIPPY_FORM_STYLES, pickCounterForm } from './config/clippyForms.config'
import { ITEMS } from './config/items.config'
import { IMPACT_BY_TYPE, IMPACT_SUPER_EFFECTIVE, IMPACT_CRIT } from './config/effects.config'
import type { ImpactParams } from './config/effects.config'
import { MOVES_BY_TYPE } from './config/moves.config'
import { BALANCE } from './config/balance.config'
import { calculateDamage, checkAccuracy, getEffectiveStat } from './battleEngine'

const W = 960, H = 540
const POSTER_BASE = 'https://image.tmdb.org/t/p/w300'

const STRUGGLE: Move = {
  id: 'lutte', nom: 'Lutte', type: 'action', categorie: 'physique',
  puissance: 50, precision: 100, pp: 999,
  texte: '{film} n\'a plus de PP et se débat désespérément !',
}

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

export class BattleScene extends Phaser.Scene {
  private team!: FilmCombatant[]
  private activeIdx = 0
  private clippy!: ClippyCombatant
  private cbs!: { onVictory: () => void; onDefeat: () => void }
  private isDemo = false

  private turnCount = 0
  private healsUsed = 0
  private pokeballUnlocked = false
  private pokeballAvailable = false
  private inventory: Record<string, number> = {}
  private pendingItemId: string | null = null

  private clippyGfx!: Phaser.GameObjects.Graphics
  private clippyNameTxt!: Phaser.GameObjects.Text
  private clippyTypeTxt!: Phaser.GameObjects.Text
  private clippyHpGfx!: Phaser.GameObjects.Graphics
  private clippyHpTxt!: Phaser.GameObjects.Text

  private filmImg: Phaser.GameObjects.Image | null = null
  private filmPhGfx!: Phaser.GameObjects.Graphics
  private filmPhTxt!: Phaser.GameObjects.Text
  private filmCardGfx!: Phaser.GameObjects.Graphics
  private filmNameTxt!: Phaser.GameObjects.Text
  private filmTypeTxt!: Phaser.GameObjects.Text
  private filmHpGfx!: Phaser.GameObjects.Graphics
  private filmHpTxt!: Phaser.GameObjects.Text

  private tbGfx!: Phaser.GameObjects.Graphics
  private tbTxt!: Phaser.GameObjects.Text

  private mainMenu!: Phaser.GameObjects.Container
  private moveMenu!: Phaser.GameObjects.Container
  private filmSelect!: Phaser.GameObjects.Container
  private itemMenu!: Phaser.GameObjects.Container

  private moveBtns: { bg: Phaser.GameObjects.Rectangle; t: Phaser.GameObjects.Text; pp: Phaser.GameObjects.Text }[] = []
  private fSlots: { bg: Phaser.GameObjects.Rectangle; n: Phaser.GameObjects.Text; tp: Phaser.GameObjects.Text; hg: Phaser.GameObjects.Graphics; ht: Phaser.GameObjects.Text }[] = []
  private itemSlots: { bg: Phaser.GameObjects.Rectangle; n: Phaser.GameObjects.Text; d: Phaser.GameObjects.Text; q: Phaser.GameObjects.Text }[] = []
  private fuirBtn!: Phaser.GameObjects.Rectangle
  private fuirTxt!: Phaser.GameObjects.Text

  private twStr = ''
  private twIdx = 0
  private twTmr = 0
  private twDone = true
  private msgRes: (() => void) | null = null
  private actRes: ((a: TurnAction) => void) | null = null
  private dead = false
  private badPosters = new Set<number>()

  constructor() { super({ key: 'PokemonBattle' }) }

  get film(): FilmCombatant { return this.team[this.activeIdx] }
  get clippyDefType(): FilmType { return this.clippy.formType }

  // ─── Lifecycle ─────────────────────────────────────

  init(data: any) {
    this.team = data.team
    this.isDemo = data.isDemo ?? false
    this.cbs = { onVictory: data.onVictory ?? (() => {}), onDefeat: data.onDefeat ?? (() => {}) }
    this.activeIdx = 0
    this.dead = false
    this.badPosters = new Set()
    this.msgRes = null
    this.actRes = null
    this.turnCount = 0
    this.healsUsed = 0
    this.pokeballUnlocked = false
    this.pokeballAvailable = false
    this.pendingItemId = null

    this.inventory = {}
    for (const item of ITEMS) this.inventory[item.id] = item.quantiteInitiale

    const d = BALANCE.DIFFICULTE
    const initialForm = rnd(ALL_TYPES)
    const pool = MOVES_BY_TYPE[initialForm] ?? MOVES_BY_TYPE.drame
    const shuffled = [...pool].sort(() => Math.random() - 0.5)

    this.clippy = {
      nom: 'CLIPPY',
      stats: {
        pvMax: Math.floor(BALANCE.CLIPPY_PV_BASE * d),
        atk: Math.floor(BALANCE.CLIPPY_ATK * d),
        def: Math.floor(BALANCE.CLIPPY_DEF * d),
        spe: Math.floor(BALANCE.CLIPPY_SPE * d),
        vit: Math.floor(BALANCE.CLIPPY_VIT * d),
      },
      pv: Math.floor(BALANCE.CLIPPY_PV_BASE * d),
      moves: [...CLIPPY_SIGNATURE_MOVES, ...shuffled.slice(0, 2)],
      formType: initialForm,
      status: null, statusTurns: 0,
      statStages: { ...EMPTY_STAGES },
    }
  }

  preload() {
    this.load.crossOrigin = 'anonymous'
    for (const f of this.team) {
      if (f.poster) {
        const url = f.poster.startsWith('http') ? f.poster
          : `${POSTER_BASE}${f.poster.startsWith('/') ? '' : '/'}${f.poster}`
        this.load.image(`poster_${f.filmId}`, url)
      }
    }
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      const m = file.key.match(/poster_(-?\d+)/)
      if (m) this.badPosters.add(parseInt(m[1]))
    })
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0f1525)
    const top = this.add.graphics()
    top.fillGradientStyle(0x1a2535, 0x1a2535, 0x0a1020, 0x0a1020)
    top.fillRect(0, 0, W, 100)
    const plat = this.add.graphics()
    plat.lineStyle(2, 0x223344, 0.5)
    plat.strokeEllipse(710, 290, 200, 40)
    plat.strokeEllipse(180, 380, 220, 40)

    this.clippyGfx = this.add.graphics()
    this.clippyNameTxt = this.add.text(500, 10, 'CLIPPY  Nv.50', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' })
    this.clippyTypeTxt = this.add.text(500, 30, '', { fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa' })
    this.clippyHpGfx = this.add.graphics()
    this.clippyHpTxt = this.add.text(920, 48, '', { fontFamily: 'monospace', fontSize: '14px', color: '#cccccc' }).setOrigin(1, 0)

    this.filmCardGfx = this.add.graphics()
    this.filmPhGfx = this.add.graphics()
    this.filmPhTxt = this.add.text(115, 270, '', { fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa', wordWrap: { width: 110 }, align: 'center' }).setOrigin(0.5)
    this.filmNameTxt = this.add.text(30, 340, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' })
    this.filmTypeTxt = this.add.text(30, 362, '', { fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa' })
    this.filmHpGfx = this.add.graphics()
    this.filmHpTxt = this.add.text(460, 378, '', { fontFamily: 'monospace', fontSize: '14px', color: '#cccccc' }).setOrigin(1, 0)

    this.tbGfx = this.add.graphics()
    this.drawTextBox()
    this.tbTxt = this.add.text(30, 422, '', { fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', wordWrap: { width: 540, useAdvancedWrap: true }, lineSpacing: 4 })

    this.buildMainMenu()
    this.buildMoveMenu()
    this.buildFilmSelect()
    this.buildItemMenu()
    this.hideAllMenus()

    this.input.on('pointerdown', this.onClick, this)
    this.runBattle()
  }

  update(_t: number, dt: number) {
    if (this.dead || this.twDone) return
    this.twTmr += dt
    while (this.twTmr >= 25 && this.twIdx < this.twStr.length) { this.twIdx++; this.twTmr -= 25 }
    this.tbTxt.setText(this.twStr.substring(0, this.twIdx))
    if (this.twIdx >= this.twStr.length) this.twDone = true
  }

  shutdown() {
    this.dead = true
    this.input.off('pointerdown', this.onClick, this)
    this.msgRes = null
    this.actRes = null
  }

  // ─── Drawing helpers ───────────────────────────────

  private drawTextBox() {
    this.tbGfx.clear()
    this.tbGfx.fillStyle(0x111828, 0.95)
    this.tbGfx.fillRoundedRect(15, 405, W - 30, 125, 8)
    this.tbGfx.lineStyle(2, 0x334455)
    this.tbGfx.strokeRoundedRect(15, 405, W - 30, 125, 8)
  }

  private hpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, cur: number, max: number) {
    g.clear()
    const p = Math.max(0, cur / max)
    const c = p > 0.5 ? 0x4CAF50 : p > 0.2 ? 0xFFC107 : 0xF44336
    g.fillStyle(0x222222); g.fillRoundedRect(x, y, w, h, 4)
    if (p > 0) { g.fillStyle(c); g.fillRoundedRect(x, y, Math.max(4, w * p), h, 4) }
    g.lineStyle(1, 0x556677); g.strokeRoundedRect(x, y, w, h, 4)
  }

  private drawClippy() {
    const g = this.clippyGfx, cx = 710, cy = 185
    const st = CLIPPY_FORM_STYLES[this.clippy.formType]
    g.clear()

    g.fillStyle(st.bodyColor)
    g.fillRoundedRect(cx - 65, cy - 95, 130, 190, 10)
    g.lineStyle(3, st.strokeColor)
    g.strokeRoundedRect(cx - 65, cy - 95, 130, 190, 10)
    g.fillStyle(st.strokeColor, 0.12)
    g.fillRoundedRect(cx - 55, cy - 85, 110, 45, 6)

    g.fillStyle(0xffffff)
    g.fillCircle(cx - 20, cy - 15, 18); g.fillCircle(cx + 20, cy - 15, 18)
    g.lineStyle(2, 0x333333)
    g.strokeCircle(cx - 20, cy - 15, 18); g.strokeCircle(cx + 20, cy - 15, 18)
    g.fillStyle(st.eyeColor)
    g.fillCircle(cx - 16, cy - 13, 8); g.fillCircle(cx + 24, cy - 13, 8)

    const ba = st.browAngle * Math.PI / 180
    g.lineStyle(4, st.strokeColor)
    g.lineBetween(cx - 38, cy - 38 - Math.sin(ba) * 16, cx - 6, cy - 40 + Math.sin(ba) * 16)
    g.lineBetween(cx + 6, cy - 40 + Math.sin(ba) * 16, cx + 38, cy - 38 - Math.sin(ba) * 16)

    g.lineStyle(3, st.strokeColor)
    switch (st.mouthStyle) {
      case 'smile': g.beginPath(); g.arc(cx, cy + 15, 15, 0.3, Math.PI - 0.3, false); g.strokePath(); break
      case 'frown': g.beginPath(); g.arc(cx, cy + 30, 15, Math.PI + 0.3, -0.3, false); g.strokePath(); break
      case 'grin':
        g.lineBetween(cx - 18, cy + 18, cx - 6, cy + 25)
        g.lineBetween(cx - 6, cy + 25, cx + 6, cy + 25)
        g.lineBetween(cx + 6, cy + 25, cx + 18, cy + 18); break
      case 'flat': g.lineBetween(cx - 15, cy + 20, cx + 15, cy + 20); break
    }

    g.lineStyle(2, st.strokeColor, 0.6)
    const px = cx + 42, py = cy + 65
    g.lineBetween(px - 6, py - 12, px - 6, py + 5)
    g.lineBetween(px - 6, py + 5, px + 6, py + 5)
    g.lineBetween(px + 6, py + 5, px + 6, py - 5)
    g.lineBetween(px + 6, py - 5, px - 3, py - 5)
    g.lineBetween(px - 3, py - 5, px - 3, py - 12)
  }

  private refreshClippyHp() {
    this.hpBar(this.clippyHpGfx, 500, 52, 380, 14, this.clippy.pv, this.clippy.stats.pvMax)
    this.clippyHpTxt.setText(`PV ${this.clippy.pv}/${this.clippy.stats.pvMax}`)
    const st = CLIPPY_FORM_STYLES[this.clippy.formType]
    this.clippyTypeTxt.setText(`${st.badge} ${TYPE_NAMES[this.clippy.formType]}`)
  }

  private refreshPlayer() {
    const f = this.film
    if (this.filmImg) { this.filmImg.destroy(); this.filmImg = null }

    this.filmCardGfx.clear()
    const tc = TYPE_COLORS[f.type1]
    this.filmCardGfx.lineStyle(3, tc)
    this.filmCardGfx.strokeRoundedRect(50, 180, 130, 190, 8)
    this.filmCardGfx.fillStyle(0x111828)
    this.filmCardGfx.fillRoundedRect(52, 182, 126, 186, 6)

    const pk = `poster_${f.filmId}`
    if (f.poster && this.textures.exists(pk) && !this.badPosters.has(f.filmId)) {
      this.filmImg = this.add.image(115, 275, pk).setDisplaySize(120, 178)
      this.filmPhGfx.setVisible(false); this.filmPhTxt.setVisible(false)
    } else {
      this.filmPhGfx.clear(); this.filmPhGfx.fillStyle(tc, 0.15); this.filmPhGfx.fillRoundedRect(55, 185, 120, 180, 6)
      this.filmPhTxt.setText(f.titre); this.filmPhGfx.setVisible(true); this.filmPhTxt.setVisible(true)
    }

    const nm = f.titre.length > 28 ? f.titre.substring(0, 26) + '…' : f.titre
    this.filmNameTxt.setText(nm)
    const t2 = f.type2 ? ` / ${TYPE_NAMES[f.type2]}` : ''
    this.filmTypeTxt.setText(`${TYPE_NAMES[f.type1]}${t2}`)
    this.refreshPlayerHp()
  }

  private refreshPlayerHp() {
    const f = this.film
    this.hpBar(this.filmHpGfx, 200, 380, 250, 14, f.pv, f.stats.pvMax)
    this.filmHpTxt.setText(`PV ${f.pv}/${f.stats.pvMax}`)
  }

  // ─── Menu builders ─────────────────────────────────

  private hideAllMenus() {
    this.mainMenu.setVisible(false)
    this.moveMenu.setVisible(false)
    this.filmSelect.setVisible(false)
    this.itemMenu.setVisible(false)
  }

  private buildMainMenu() {
    this.mainMenu = this.add.container(0, 0)
    const labels = ['ATTAQUE', 'FILM', 'OBJET', 'FUIR']
    const colors = [0xCC3333, 0x3366CC, 0x33AA33, 0x666666]
    const bw = 163, bh = 52, gap = 6, sx = 605, sy = 412
    labels.forEach((l, i) => {
      const c = i % 2, r = Math.floor(i / 2)
      const bx = sx + c * (bw + gap), by = sy + r * (bh + gap)
      const bg = this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, colors[i]).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true })
      const t = this.add.text(bx + bw / 2, by + bh / 2, l, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5)
      bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffffff, 1))
      bg.on('pointerout', () => bg.setStrokeStyle(2, 0xffffff, 0.4))
      bg.on('pointerdown', () => this.menuClick(i))
      if (i === 3) { this.fuirBtn = bg; this.fuirTxt = t }
      this.mainMenu.add([bg, t])
    })
  }

  private buildMoveMenu() {
    this.moveMenu = this.add.container(0, 0)
    this.moveBtns = []
    const bw = 220, bh = 52, gap = 6
    for (let i = 0; i < 4; i++) {
      const c = i % 2, r = Math.floor(i / 2)
      const bx = 25 + c * (bw + gap), by = 412 + r * (bh + gap)
      const bg = this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0x333333).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true })
      const t = this.add.text(bx + 10, by + 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold' })
      const pp = this.add.text(bx + bw - 10, by + bh - 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#cccccc' }).setOrigin(1, 1)
      bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffffff, 1))
      bg.on('pointerout', () => bg.setStrokeStyle(2, 0xffffff, 0.4))
      bg.on('pointerdown', () => this.moveClick(i))
      this.moveBtns.push({ bg, t, pp })
      this.moveMenu.add([bg, t, pp])
    }
    const bb = this.add.rectangle(830, 460, 100, 40, 0x555555).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true })
    const bt = this.add.text(830, 460, 'Retour', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5)
    bb.on('pointerdown', () => { this.moveMenu.setVisible(false); this.mainMenu.setVisible(true) })
    this.moveMenu.add([bb, bt])
  }

  private buildFilmSelect() {
    this.filmSelect = this.add.container(0, 0)
    this.filmSelect.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive())
    const pg = this.add.graphics()
    pg.fillStyle(0x111828, 0.97); pg.fillRoundedRect(140, 20, 680, 500, 12)
    pg.lineStyle(2, 0x445566); pg.strokeRoundedRect(140, 20, 680, 500, 12)
    this.filmSelect.add(pg)
    this.filmSelect.add(this.add.text(480, 38, 'Choisissez un film :', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0))

    this.fSlots = []
    for (let i = 0; i < 6; i++) {
      const sy = 78 + i * 62
      const bg = this.add.rectangle(480, sy + 26, 620, 55, 0x1a2535).setStrokeStyle(1, 0x334455).setInteractive({ useHandCursor: true })
      const n = this.add.text(200, sy + 8, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff' })
      const tp = this.add.text(200, sy + 30, '', { fontFamily: 'monospace', fontSize: '12px', color: '#999999' })
      const hg = this.add.graphics()
      const ht = this.add.text(740, sy + 16, '', { fontFamily: 'monospace', fontSize: '12px', color: '#cccccc' }).setOrigin(1, 0)
      bg.on('pointerover', () => bg.setFillStyle(0x253545))
      bg.on('pointerout', () => bg.setFillStyle(0x1a2535))
      const idx = i
      bg.on('pointerdown', () => this.filmSlotClick(idx))
      this.fSlots.push({ bg, n, tp, hg, ht })
      this.filmSelect.add([bg, n, tp, hg, ht])
    }
    const bk = this.add.rectangle(480, 480, 140, 40, 0x555555).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true })
    this.filmSelect.add([bk, this.add.text(480, 480, 'Retour', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5)])
    bk.on('pointerdown', () => { this.pendingItemId = null; this.filmSelect.setVisible(false); this.mainMenu.setVisible(true) })
  }

  private buildItemMenu() {
    this.itemMenu = this.add.container(0, 0)
    this.itemMenu.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive())
    const pg = this.add.graphics()
    pg.fillStyle(0x111828, 0.97); pg.fillRoundedRect(200, 50, 560, 440, 12)
    pg.lineStyle(2, 0x445566); pg.strokeRoundedRect(200, 50, 560, 440, 12)
    this.itemMenu.add(pg)
    this.itemMenu.add(this.add.text(480, 68, 'Objets', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0))

    this.itemSlots = []
    for (let i = 0; i < ITEMS.length; i++) {
      const sy = 105 + i * 50
      const bg = this.add.rectangle(480, sy + 20, 500, 42, 0x1a2535).setStrokeStyle(1, 0x334455).setInteractive({ useHandCursor: true })
      const n = this.add.text(250, sy + 6, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold' })
      const d = this.add.text(250, sy + 24, '', { fontFamily: 'monospace', fontSize: '11px', color: '#888888' })
      const q = this.add.text(700, sy + 14, '', { fontFamily: 'monospace', fontSize: '13px', color: '#cccccc' }).setOrigin(1, 0.5)
      bg.on('pointerover', () => bg.setFillStyle(0x253545))
      bg.on('pointerout', () => bg.setFillStyle(0x1a2535))
      const idx = i
      bg.on('pointerdown', () => this.itemClick(idx))
      this.itemSlots.push({ bg, n, d, q })
      this.itemMenu.add([bg, n, d, q])
    }
    const bk = this.add.rectangle(480, 450, 140, 40, 0x555555).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true })
    this.itemMenu.add([bk, this.add.text(480, 450, 'Retour', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5)])
    bk.on('pointerdown', () => { this.itemMenu.setVisible(false); this.mainMenu.setVisible(true) })
  }

  // ─── Menu handlers ─────────────────────────────────

  private menuClick(i: number) {
    if (!this.actRes) return
    if (i === 0) { this.mainMenu.setVisible(false); this.refreshMoves(); this.moveMenu.setVisible(true) }
    else if (i === 1) { this.mainMenu.setVisible(false); this.refreshSlots(); this.filmSelect.setVisible(true) }
    else if (i === 2) { this.mainMenu.setVisible(false); this.refreshItems(); this.itemMenu.setVisible(true) }
    else if (i === 3) {
      if (this.pokeballUnlocked) {
        this.mainMenu.setVisible(false)
        this.actRes({ source: 'player', type: 'pokeball', priority: 7, speed: 0 })
        this.actRes = null
      } else {
        this.flash(rnd(CLIPPY_DIALOGUES.fuir))
      }
    }
  }

  private moveClick(i: number) {
    if (!this.actRes) return
    const f = this.film
    const allEmpty = f.currentPP.every(p => p <= 0)
    if (allEmpty) {
      this.moveMenu.setVisible(false)
      this.actRes({ source: 'player', type: 'attack', moveIndex: -1, priority: 0, speed: getEffectiveStat(f.stats.vit, f.statStages.vit) })
      this.actRes = null; return
    }
    if (i >= f.moves.length || f.currentPP[i] <= 0) return
    this.moveMenu.setVisible(false)
    const mv = f.moves[i]
    this.actRes({ source: 'player', type: 'attack', moveIndex: i, priority: mv.priorite ?? 0, speed: getEffectiveStat(f.stats.vit, f.statStages.vit) })
    this.actRes = null
  }

  private filmSlotClick(i: number) {
    if (!this.actRes) return
    if (i >= this.team.length) return

    if (this.pendingItemId) {
      if (!this.team[i].isKO) return
      this.filmSelect.setVisible(false)
      const itemId = this.pendingItemId
      this.pendingItemId = null
      this.actRes({ source: 'player', type: 'item', itemId, itemTarget: i, priority: 7, speed: 0 })
      this.actRes = null; return
    }

    if (this.team[i].isKO || i === this.activeIdx) return
    this.filmSelect.setVisible(false)
    this.actRes({ source: 'player', type: 'switch', switchTo: i, priority: 6, speed: 0 })
    this.actRes = null
  }

  private itemClick(i: number) {
    if (!this.actRes || i >= ITEMS.length) return
    const item = ITEMS[i]
    const qty = this.inventory[item.id] ?? 0
    if (qty <= 0) return

    if (item.target === 'ko') {
      if (!this.team.some(f => f.isKO)) { this.flash('Aucun film K.O. !'); return }
      this.pendingItemId = item.id
      this.itemMenu.setVisible(false)
      this.refreshSlots()
      this.filmSelect.setVisible(true); return
    }

    this.itemMenu.setVisible(false)
    this.actRes({ source: 'player', type: 'item', itemId: item.id, itemTarget: this.activeIdx, priority: 7, speed: 0 })
    this.actRes = null
  }

  private refreshMoves() {
    const f = this.film
    const allEmpty = f.currentPP.every(p => p <= 0)
    for (let i = 0; i < 4; i++) {
      const b = this.moveBtns[i]
      if (allEmpty && i === 0) {
        b.bg.setVisible(true).setFillStyle(0x888888).setAlpha(1)
        b.t.setText('Lutte').setVisible(true); b.pp.setText('--').setVisible(true)
      } else if (i < f.moves.length && !allEmpty) {
        const mv = f.moves[i]
        b.bg.setVisible(true).setFillStyle(TYPE_COLORS[mv.type]).setAlpha(f.currentPP[i] > 0 ? 1 : 0.35)
        b.t.setText(mv.nom).setVisible(true); b.pp.setText(`PP ${f.currentPP[i]}/${mv.pp}`).setVisible(true)
      } else { b.bg.setVisible(false); b.t.setVisible(false); b.pp.setVisible(false) }
    }
  }

  private refreshSlots() {
    const revive = this.pendingItemId !== null
    for (let i = 0; i < 6; i++) {
      const s = this.fSlots[i]
      if (i < this.team.length) {
        const f = this.team[i], act = i === this.activeIdx
        const pre = f.isKO ? '✕ ' : act ? '► ' : '  '
        s.n.setText(`${pre}${f.titre}`).setColor(f.isKO ? (revive ? '#ffaa44' : '#666666') : act ? '#ffcc00' : '#ffffff').setVisible(true)
        const t2 = f.type2 ? ` / ${TYPE_NAMES[f.type2]}` : ''
        s.tp.setText(`${TYPE_NAMES[f.type1]}${t2}`).setVisible(true)
        if (f.isKO) { s.ht.setText('K.O.').setVisible(true); s.hg.clear() }
        else { s.ht.setText(`PV ${f.pv}/${f.stats.pvMax}`).setVisible(true); this.hpBar(s.hg, 560, 78 + i * 62 + 14, 140, 10, f.pv, f.stats.pvMax) }
        s.bg.setVisible(true).setAlpha(revive ? (f.isKO ? 1 : 0.2) : (f.isKO || act ? 0.35 : 1))
      } else { s.bg.setVisible(false); s.n.setVisible(false); s.tp.setVisible(false); s.hg.clear(); s.ht.setVisible(false) }
    }
  }

  private refreshItems() {
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i], s = this.itemSlots[i]
      const qty = this.inventory[item.id] ?? 0
      s.n.setText(item.nom)
      s.d.setText(item.description)
      s.q.setText(`x${qty}`)
      s.bg.setAlpha(qty > 0 ? 1 : 0.3)
    }
  }

  private updatePokeballButton() {
    const ratio = this.clippy.pv / this.clippy.stats.pvMax
    this.pokeballAvailable = this.pokeballUnlocked && ratio <= BALANCE.CLIPPY_POKEBALL_THRESHOLD

    if (this.pokeballAvailable) {
      this.fuirBtn.setFillStyle(0xcc0000)
      this.fuirTxt.setText('POKEBALL')
    } else if (this.pokeballUnlocked) {
      this.fuirBtn.setFillStyle(0x884400)
      this.fuirTxt.setText('POKEBALL')
    } else {
      this.fuirBtn.setFillStyle(0x666666)
      this.fuirTxt.setText('FUIR')
    }
  }

  // ─── Message system ────────────────────────────────

  private msg(t: string): Promise<void> {
    if (this.dead) return Promise.resolve()
    return new Promise(r => {
      this.twStr = t; this.twIdx = 0; this.twTmr = 0; this.twDone = false
      this.tbTxt.setText(''); this.msgRes = r
    })
  }

  private flash(t: string) {
    this.twStr = t; this.twIdx = 0; this.twTmr = 0; this.twDone = false; this.tbTxt.setText('')
  }

  private onClick(_p: Phaser.Input.Pointer) {
    if (this.dead) return
    if (!this.twDone) { this.twIdx = this.twStr.length; this.tbTxt.setText(this.twStr); this.twDone = true; return }
    if (this.msgRes) { const r = this.msgRes; this.msgRes = null; r() }
  }

  // ─── Battle flow ───────────────────────────────────

  private async runBattle() {
    this.drawClippy()
    this.refreshClippyHp()
    if (this.isDemo) await this.msg('Aucun film vu ! Équipe de démonstration chargée.')
    await this.msg(`CLIPPY : « ${rnd(CLIPPY_DIALOGUES.intro)} »`)
    this.refreshPlayer()
    await this.msg(`${this.film.titre}, go !`)

    while (!this.dead) {
      this.turnCount++

      if (this.turnCount >= BALANCE.CLIPPY_ADAPT_INTERVAL &&
          this.turnCount % BALANCE.CLIPPY_ADAPT_INTERVAL === 0) {
        await this.adaptClippy()
        if (this.dead) return
      }

      this.updatePokeballButton()

      const pa = await this.getPlayerAction()
      if (this.dead) return
      const ca = this.pickClippyAction()
      await this.resolve(pa, ca)
      if (this.dead) return

      await this.checkClippyHeal()
      if (this.dead) return

      const wasAvail = this.pokeballAvailable
      this.updatePokeballButton()
      if (this.pokeballAvailable && !wasAvail) {
        await this.msg('Clippy vacille… La Pokéball est disponible !')
      }

      if ((this.turnCount + 1) % BALANCE.CLIPPY_ADAPT_INTERVAL === 0 &&
          this.turnCount >= BALANCE.CLIPPY_ADAPT_INTERVAL - 1) {
        await this.msg(`CLIPPY : « ${rnd(CLIPPY_DIALOGUES.telegraph)} »`)
      }
    }
  }

  private getPlayerAction(): Promise<TurnAction> {
    return new Promise(r => {
      this.actRes = r
      this.tbTxt.setText('Que faire ?'); this.twDone = true; this.msgRes = null
      this.mainMenu.setVisible(true)
      this.moveMenu.setVisible(false)
      this.filmSelect.setVisible(false)
      this.itemMenu.setVisible(false)
    })
  }

  private pickClippyAction(): TurnAction {
    const f = this.film, mvs = this.clippy.moves
    const se = mvs.map((m, i) => ({ m, i })).filter(x => x.m.puissance > 0 && getEffectiveness(x.m.type, f.type1, f.type2) > 1)
    let mi: number
    if (se.length > 0 && Math.random() < 0.6) {
      mi = rnd(se).i
    } else {
      const w = mvs.map(m => m.puissance > 0 ? m.puissance : 50)
      const tot = w.reduce((a, b) => a + b, 0)
      let roll = Math.random() * tot; mi = 0
      for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) { mi = i; break } }
    }
    return {
      source: 'clippy', type: 'attack', moveIndex: mi,
      priority: mvs[mi].priorite ?? 0,
      speed: getEffectiveStat(this.clippy.stats.vit, this.clippy.statStages.vit),
    }
  }

  private async resolve(pa: TurnAction, ca: TurnAction) {
    const acts = [pa, ca].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority
      if (a.speed !== b.speed) return b.speed - a.speed
      return Math.random() - 0.5
    })
    this.hideAllMenus()

    for (const act of acts) {
      if (this.dead) return
      if (act.source === 'player' && this.film.isKO) continue
      if (act.source === 'clippy' && this.clippy.pv <= 0) continue

      if (act.type === 'attack') {
        const actor = act.source === 'player' ? this.film : this.clippy
        if (actor.status === 'flinch') {
          const nm = act.source === 'player' ? this.film.titre : 'CLIPPY'
          await this.msg(`${nm} a tressailli !`)
          actor.status = null; continue
        }
        await this.execAttack(act.source, act.moveIndex!)
      }
      else if (act.type === 'switch') await this.execSwitch(act.switchTo!)
      else if (act.type === 'item') await this.execItem(act.itemId!, act.itemTarget)
      else if (act.type === 'pokeball') {
        const captured = await this.pokeballAttempt()
        if (captured) return
      }

      if (await this.checkEnd()) return
    }

    await this.endOfTurn()
    await this.checkEnd()
  }

  // ─── Clippy Adaptation ─────────────────────────────

  private async adaptClippy() {
    const newType = pickCounterForm(this.film.type1, BALANCE.CLIPPY_RANDOM_CHANCE)
    this.clippy.formType = newType

    const pool = MOVES_BY_TYPE[newType] ?? MOVES_BY_TYPE.drame
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    this.clippy.moves = [...CLIPPY_SIGNATURE_MOVES, ...shuffled.slice(0, 2)]
    this.clippy.statStages = { ...EMPTY_STAGES }

    this.drawClippy()
    this.refreshClippyHp()

    this.cameras.main.flash(300, 255, 255, 255, false)
    await this.msg(`CLIPPY : « ${rnd(CLIPPY_DIALOGUES.adaptation)} »`)
    await this.msg(`CLIPPY prend la forme ${TYPE_NAMES[newType]} !`)
  }

  private async checkClippyHeal() {
    if (this.healsUsed >= BALANCE.CLIPPY_HEALS) return
    const ratio = this.clippy.pv / this.clippy.stats.pvMax
    const threshold = BALANCE.CLIPPY_HEAL_THRESHOLDS[this.healsUsed]
    if (ratio > threshold) return

    const healAmt = Math.floor(this.clippy.stats.pvMax * BALANCE.CLIPPY_HEAL_AMOUNT)
    const oldHp = this.clippy.pv
    this.clippy.pv = Math.min(this.clippy.stats.pvMax, this.clippy.pv + healAmt)

    await this.msg(`CLIPPY : « ${rnd(CLIPPY_DIALOGUES.heal)} »`)
    await this.hpTween('clippy', oldHp, this.clippy.pv)
    this.healsUsed++

    if (this.healsUsed >= BALANCE.CLIPPY_HEALS) {
      this.pokeballUnlocked = true
    }
  }

  // ─── Attack execution ──────────────────────────────

  private async execAttack(src: 'player' | 'clippy', mi: number) {
    const isP = src === 'player'
    const atk = isP ? this.film : this.clippy
    const def = isP ? this.clippy : this.film
    const aN = isP ? this.film.titre : 'CLIPPY'

    if (atk.status === 'paralysie' && Math.random() < 0.25) {
      await this.msg(`${aN} est paralysé et ne peut pas attaquer !`); return
    }
    if (atk.status === 'sommeil') {
      if (atk.statusTurns > 0) { atk.statusTurns--; await this.msg(`${aN} dort profondément…`); return }
      atk.status = null; await this.msg(`${aN} se réveille !`)
    }
    if (atk.status === 'confusion') {
      await this.msg(`${aN} est confus…`)
      if (Math.random() < 0.33) {
        const sd = Math.floor(atk.stats.pvMax * 0.08)
        atk.pv = Math.max(0, atk.pv - sd)
        await this.msg(`${aN} se blesse dans sa confusion !`)
        if (isP) this.refreshPlayerHp(); else this.refreshClippyHp()
        atk.statusTurns--
        if (atk.statusTurns <= 0) atk.status = null; return
      }
      atk.statusTurns--
      if (atk.statusTurns <= 0) atk.status = null
    }

    const isStruggle = mi === -1
    const mv: Move = isStruggle ? STRUGGLE : (isP ? this.film.moves[mi] : this.clippy.moves[mi])
    await this.msg(mv.texte.replace('{film}', aN))

    if (isP && !isStruggle) this.film.currentPP[mi] = Math.max(0, this.film.currentPP[mi] - 1)

    if (mv.categorie === 'statut') { await this.applyEffects(mv, src); return }

    if (!checkAccuracy(mv, atk.statStages, def.statStages)) {
      await this.msg(`${aN} rate son attaque !`); return
    }

    const dT1 = isP ? this.clippyDefType : this.film.type1
    const dT2 = isP ? undefined : this.film.type2
    const res = calculateDamage(mv, atk.stats, atk.statStages, def.stats, def.statStages, dT1, dT2)

    if (!isP) {
      const cap = Math.floor(this.film.stats.pvMax * BALANCE.DAMAGE_CAP_PCT)
      if (res.damage > cap) res.damage = cap
    }

    const impact = this.getImpactParams(mv.type, res.effectiveness, res.isCrit)
    const oldHp = def.pv
    def.pv = Math.max(0, def.pv - res.damage)
    const tgt = isP ? 'clippy' : 'player'

    await this.juiceHit(tgt, impact)
    await this.hpTween(tgt, oldHp, def.pv)

    if (res.hits > 1) await this.msg(`Touché ${res.hits} fois !`)
    if (res.effectiveness > 1) {
      await this.showBanner('SUPER EFFICACE !', TYPE_COLORS[mv.type])
    } else if (res.effectiveness > 0 && res.effectiveness < 1) {
      await this.msg("Ce n'est pas très efficace…")
    }
    if (res.isCrit) await this.msg('Coup critique !')

    if (mv.effet) await this.applyEffects(mv, src)

    if (mv.effet?.drain && res.damage > 0) {
      const h = Math.floor(res.damage * mv.effet.drain)
      const oldAtkHp = atk.pv
      atk.pv = Math.min(atk.stats.pvMax, atk.pv + h)
      await this.hpTween(isP ? 'player' : 'clippy', oldAtkHp, atk.pv)
      await this.msg(`${aN} absorbe de l'énergie !`)
    }

    if (isStruggle) {
      const rc = Math.floor(res.damage * 0.25)
      const oh = atk.pv; atk.pv = Math.max(0, atk.pv - rc)
      await this.hpTween(isP ? 'player' : 'clippy', oh, atk.pv)
      await this.msg(`${aN} est blessé par le contrecoup !`)
    } else if (mv.effet?.recoil && res.damage > 0) {
      const rc = Math.floor(res.damage * mv.effet.recoil)
      const oh = atk.pv; atk.pv = Math.max(0, atk.pv - rc)
      await this.hpTween(isP ? 'player' : 'clippy', oh, atk.pv)
      await this.msg(`${aN} est blessé par le contrecoup !`)
    }

    if (mv.effet?.selfKO) {
      const oh = atk.pv; atk.pv = 0
      await this.hpTween(isP ? 'player' : 'clippy', oh, 0)
      await this.msg(`${aN} se sacrifie !`)
      if ('isKO' in atk) (atk as FilmCombatant).isKO = true
    }

    if (def.pv <= 0 && 'isKO' in def) (def as FilmCombatant).isKO = true
  }

  private async execSwitch(to: number) {
    await this.msg(`${this.film.titre}, reviens !`)
    this.activeIdx = to
    this.refreshPlayer()
    await this.msg(`${this.film.titre}, go !`)
  }

  private async execItem(itemId: string, targetIdx?: number) {
    const item = ITEMS.find(it => it.id === itemId)
    if (!item) return
    this.inventory[itemId]--
    const tIdx = targetIdx ?? this.activeIdx
    const target = this.team[tIdx]

    switch (item.effet) {
      case 'heal':
      case 'superHeal': {
        const heal = Math.floor(target.stats.pvMax * item.value)
        const old = target.pv
        target.pv = Math.min(target.stats.pvMax, target.pv + heal)
        await this.msg(`Utilisation de ${item.nom} sur ${target.titre} !`)
        if (tIdx === this.activeIdx) await this.hpTween('player', old, target.pv)
        break
      }
      case 'fullRestore': {
        const old = target.pv
        target.pv = target.stats.pvMax
        target.status = null; target.statusTurns = 0
        await this.msg(`Utilisation de ${item.nom} sur ${target.titre} !`)
        if (tIdx === this.activeIdx) await this.hpTween('player', old, target.pv)
        await this.msg(`${target.titre} est en pleine forme !`)
        break
      }
      case 'revive': {
        target.isKO = false
        target.pv = Math.floor(target.stats.pvMax * item.value)
        target.status = null; target.statusTurns = 0
        target.statStages = { ...EMPTY_STAGES }
        await this.msg(`Utilisation de ${item.nom} ! ${target.titre} revient au combat !`)
        break
      }
      case 'atkBoost': {
        const f = this.film
        f.statStages.atk = Math.min(6, f.statStages.atk + item.value)
        await this.msg(`Utilisation de ${item.nom} ! Attaque de ${f.titre} monte !`)
        break
      }
      case 'defBoost': {
        const f = this.film
        f.statStages.def = Math.min(6, f.statStages.def + item.value)
        await this.msg(`Utilisation de ${item.nom} ! Défense de ${f.titre} monte !`)
        break
      }
    }
  }

  // ─── Effects ───────────────────────────────────────

  private async applyEffects(mv: Move, src: 'player' | 'clippy') {
    const isP = src === 'player'
    const atk = isP ? this.film : this.clippy
    const def = isP ? this.clippy : this.film
    const aN = isP ? this.film.titre : 'CLIPPY'
    const dN = isP ? 'CLIPPY' : this.film.titre
    const eff = mv.effet
    if (!eff) return

    if (eff.heal) {
      const h = Math.floor(atk.stats.pvMax * eff.heal)
      const old = atk.pv
      atk.pv = Math.min(atk.stats.pvMax, atk.pv + h)
      await this.hpTween(isP ? 'player' : 'clippy', old, atk.pv)
      await this.msg(`${aN} récupère des PV !`)
    }

    if (eff.statMods) {
      for (const sm of eff.statMods) {
        const target = sm.target === 'self' ? atk : def
        const tName = sm.target === 'self' ? aN : dN
        const stat = sm.stat, old = target.statStages[stat]
        target.statStages[stat] = Math.max(-6, Math.min(6, old + sm.stages))
        const diff = target.statStages[stat] - old
        if (diff === 0) { await this.msg(`${tName} : pas d'effet sur ${stat}…`); continue }
        const dir = diff > 0 ? 'monte' : 'baisse'
        const intens = Math.abs(diff) >= 2 ? ' beaucoup' : ''
        const sn: Record<string, string> = { atk: 'Attaque', def: 'Défense', spe: 'Spécial', vit: 'Vitesse', precision: 'Précision', esquive: 'Esquive' }
        await this.msg(`${sn[stat] ?? stat} de ${tName} ${dir}${intens} !`)
      }
    }

    if (eff.status && eff.statusChance) {
      if (Math.random() * 100 < eff.statusChance && !def.status) {
        def.status = eff.status
        def.statusTurns = eff.status === 'sommeil' ? 1 + Math.floor(Math.random() * 3)
          : eff.status === 'confusion' ? 2 + Math.floor(Math.random() * 3) : 0
        const sn: Record<string, string> = { paralysie: 'est paralysé !', sommeil: 's\'endort !', confusion: 'est confus !', poison: 'est empoisonné !' }
        await this.msg(`${dN} ${sn[eff.status] ?? 'subit un statut !'}`)
      }
    }

    if (eff.flinchChance && Math.random() * 100 < eff.flinchChance) {
      def.status = 'flinch'; def.statusTurns = 0
    }

    if (eff.clearStages) {
      const target = eff.clearStages === 'opponent' ? def : atk
      const tName = eff.clearStages === 'opponent' ? dN : aN
      target.statStages = { ...EMPTY_STAGES }
      await this.msg(`Les stats de ${tName} sont réinitialisées !`)
    }
  }

  private async endOfTurn() {
    for (const side of ['player', 'clippy'] as const) {
      const c = side === 'player' ? this.film : this.clippy
      if (c.pv <= 0) continue
      if (c.status === 'poison') {
        const dmg = Math.floor(c.stats.pvMax * 0.08)
        const old = c.pv; c.pv = Math.max(0, c.pv - dmg)
        const nm = side === 'player' ? this.film.titre : 'CLIPPY'
        await this.msg(`${nm} souffre du poison !`)
        await this.hpTween(side, old, c.pv)
        if (c.pv <= 0 && 'isKO' in c) (c as FilmCombatant).isKO = true
      }
      if (c.status === 'flinch') c.status = null
    }
  }

  // ─── KO / Win / Lose ───────────────────────────────

  private async checkEnd(): Promise<boolean> {
    if (this.clippy.pv <= 0) {
      await this.koAnim('clippy')
      await this.msg('CLIPPY est K.O. !')
      await this.msg(`CLIPPY : « ${rnd(CLIPPY_DIALOGUES.defaite)} »`)
      await this.msg('Victoire !')
      this.dead = true; this.cbs.onVictory(); return true
    }

    if (this.film.pv <= 0) {
      this.film.isKO = true
      await this.koAnim('player')
      await this.msg(`${this.film.titre} est K.O. !`)

      const alive = this.team.filter(f => !f.isKO)
      if (alive.length === 0) {
        await this.msg(`CLIPPY : « ${rnd(CLIPPY_DIALOGUES.victoire)} »`)
        await this.msg('Défaite…')
        this.dead = true; this.cbs.onDefeat(); return true
      }

      await this.msg('Quel film envoyer ?')
      const switchIdx = await this.forcedSwitch()
      if (this.dead) return true
      this.activeIdx = switchIdx
      this.refreshPlayer()
      await this.msg(`${this.film.titre}, go !`)
    }
    return false
  }

  private forcedSwitch(): Promise<number> {
    return new Promise(r => {
      this.actRes = (a: TurnAction) => { r(a.switchTo!) }
      this.refreshSlots()
      this.filmSelect.setVisible(true)
    })
  }

  // ─── Pokéball ──────────────────────────────────────

  private async pokeballAttempt(): Promise<boolean> {
    const ratio = this.clippy.pv / this.clippy.stats.pvMax

    if (ratio > BALANCE.CLIPPY_POKEBALL_THRESHOLD) {
      await this.msg('Tu lances une Pokéball !')
      await this.pokeballAnim(false)
      await this.msg(`CLIPPY : « ${rnd(CLIPPY_DIALOGUES.pokeball_resist)} »`)
      return false
    }

    await this.msg('Tu lances une Pokéball !')
    await this.pokeballAnim(true)
    await this.msg(`CLIPPY : « ${rnd(CLIPPY_DIALOGUES.capture)} »`)
    await this.msg('CLIPPY a été capturé !')
    await this.msg('CLIPPY est envoyé en enfer !')
    this.dead = true; this.cbs.onVictory()
    return true
  }

  private drawPokeballGfx(g: Phaser.GameObjects.Graphics, r: number) {
    g.clear()
    g.fillStyle(0xcc0000)
    g.beginPath(); g.arc(0, 0, r, Math.PI, 0, false); g.closePath(); g.fillPath()
    g.fillStyle(0xffffff)
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI, false); g.closePath(); g.fillPath()
    g.lineStyle(3, 0x000000)
    g.lineBetween(-r, 0, r, 0)
    g.fillStyle(0x000000); g.fillCircle(0, 0, r * 0.25)
    g.fillStyle(0xffffff); g.fillCircle(0, 0, r * 0.15)
    g.lineStyle(2, 0x000000); g.strokeCircle(0, 0, r)
  }

  private async pokeballAnim(success: boolean) {
    const ball = this.add.graphics().setPosition(W / 2, H - 20).setDepth(70)
    this.drawPokeballGfx(ball, 18)

    await new Promise<void>(r => {
      this.tweens.add({ targets: ball, x: 710, y: 185, duration: 500, ease: 'Power2', onComplete: () => r() })
    })

    this.cameras.main.flash(200, 255, 255, 255, false)
    this.tweens.add({ targets: this.clippyGfx, alpha: 0, duration: 200 })
    await this.wait(300)

    ball.setPosition(W / 2, H / 2 + 20)
    this.drawPokeballGfx(ball, 26)

    const wobbleCount = success ? 3 : 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < wobbleCount; i++) {
      await this.wait(600)
      await new Promise<void>(r => {
        this.tweens.add({ targets: ball, angle: 20, duration: 80, yoyo: true, repeat: 1, onComplete: () => { ball.angle = 0; r() } })
      })
      this.cameras.main.shake(100, 0.003)
    }

    if (success) {
      await this.wait(500)
      this.cameras.main.flash(500, 255, 200, 0, false)
      this.spawnParticles(W / 2, H / 2 + 20, 20, 0xffcc00)
    } else {
      await this.wait(300)
      this.cameras.main.flash(200, 255, 0, 0, false)
      ball.destroy()
      this.clippyGfx.setAlpha(1)
      this.drawClippy()
      await this.wait(300)
    }
  }

  // ─── Juice animations ─────────────────────────────

  private getImpactParams(moveType: FilmType, effectiveness: number, isCrit: boolean): ImpactParams {
    const base = { ...IMPACT_BY_TYPE[moveType] }

    if (effectiveness > 1) {
      const se = IMPACT_SUPER_EFFECTIVE
      if (se.screenShake !== undefined) base.screenShake = se.screenShake
      if (se.hitStopMs !== undefined) base.hitStopMs = se.hitStopMs
      if (se.flashAlpha !== undefined) base.flashAlpha = se.flashAlpha
      if (se.knockbackDist !== undefined) base.knockbackDist = se.knockbackDist
      if (se.scalePunchMult !== undefined) base.scalePunchMult = se.scalePunchMult
      if (se.particleCount !== undefined) base.particleCount = se.particleCount
      if (se.zoomPunch !== undefined) base.zoomPunch = se.zoomPunch
    } else if (effectiveness < 1 && effectiveness > 0) {
      base.screenShake = Math.floor(base.screenShake * 0.3)
      base.hitStopMs = Math.floor(base.hitStopMs * 0.3)
      base.knockbackDist = Math.floor(base.knockbackDist * 0.3)
      base.particleCount = Math.max(1, Math.floor(base.particleCount * 0.3))
      base.flashAlpha *= 0.3
    }

    if (isCrit) {
      const cr = IMPACT_CRIT
      if (cr.screenShake !== undefined) base.screenShake = Math.max(base.screenShake, cr.screenShake)
      if (cr.hitStopMs !== undefined) base.hitStopMs = Math.max(base.hitStopMs, cr.hitStopMs)
      if (cr.knockbackDist !== undefined) base.knockbackDist = Math.max(base.knockbackDist, cr.knockbackDist)
      if (cr.particleCount !== undefined) base.particleCount = Math.max(base.particleCount, cr.particleCount)
      if (cr.zoomPunch !== undefined) base.zoomPunch = Math.max(base.zoomPunch, cr.zoomPunch)
    }

    return base
  }

  private async juiceHit(tgt: 'player' | 'clippy', impact: ImpactParams) {
    const fx = tgt === 'clippy' ? 710 : 115
    const fy = tgt === 'clippy' ? 185 : 270
    const obj = tgt === 'clippy' ? this.clippyGfx : (this.filmImg ?? this.filmPhGfx)

    if (impact.hitStopMs > 0) await this.wait(impact.hitStopMs)

    if (impact.screenShake > 0) this.cameras.main.shake(200, impact.screenShake / 500)

    const fl = this.add.rectangle(fx, fy, 160, 220, impact.flashColor, impact.flashAlpha).setDepth(40)
    this.tweens.add({ targets: fl, alpha: 0, duration: 200, onComplete: () => fl.destroy() })

    const ox = obj.x, dir = tgt === 'clippy' ? 1 : -1
    this.tweens.add({
      targets: obj, x: ox + impact.knockbackDist * dir,
      duration: 60, ease: 'Power2', yoyo: true, hold: 50,
      onComplete: () => { obj.x = ox },
    })

    this.spawnParticles(fx, fy, impact.particleCount, impact.particleColor)

    if (impact.zoomPunch > 1.0) {
      this.cameras.main.zoomTo(impact.zoomPunch, 100)
      this.time.delayedCall(250, () => this.cameras.main.zoomTo(1.0, 300))
    }

    await this.wait(250)
  }

  private spawnParticles(x: number, y: number, count: number, color: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 50 + Math.random() * 150
      const sz = 2 + Math.random() * 4
      const p = this.add.circle(x, y, sz, color).setDepth(50)
      this.tweens.add({
        targets: p, x: x + Math.cos(angle) * speed, y: y + Math.sin(angle) * speed,
        alpha: 0, scale: 0, duration: 300 + Math.random() * 200, ease: 'Power2',
        onComplete: () => p.destroy(),
      })
    }
  }

  private showBanner(text: string, color: number): Promise<void> {
    return new Promise(r => {
      const bg = this.add.rectangle(W / 2, H / 2 - 40, W + 40, 50, color, 0.85).setDepth(60).setScale(0, 1)
      const txt = this.add.text(W / 2, H / 2 - 40, text, {
        fontFamily: 'monospace', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(61).setAlpha(0)

      this.tweens.add({ targets: bg, scaleX: 1, duration: 120, ease: 'Back.easeOut' })
      this.tweens.add({ targets: txt, alpha: 1, duration: 150 })

      this.time.delayedCall(700, () => {
        this.tweens.add({
          targets: [bg, txt], alpha: 0, duration: 250,
          onComplete: () => { bg.destroy(); txt.destroy(); r() },
        })
      })
    })
  }

  private hpTween(tgt: 'player' | 'clippy', from: number, to: number): Promise<void> {
    return new Promise(r => {
      const proxy = { hp: from }
      this.tweens.add({
        targets: proxy, hp: to, duration: 400, ease: 'Linear',
        onUpdate: () => {
          if (tgt === 'player') {
            this.hpBar(this.filmHpGfx, 200, 380, 250, 14, proxy.hp, this.film.stats.pvMax)
            this.filmHpTxt.setText(`PV ${Math.floor(proxy.hp)}/${this.film.stats.pvMax}`)
          } else {
            this.hpBar(this.clippyHpGfx, 500, 52, 380, 14, proxy.hp, this.clippy.stats.pvMax)
            this.clippyHpTxt.setText(`PV ${Math.floor(proxy.hp)}/${this.clippy.stats.pvMax}`)
          }
        },
        onComplete: () => r(),
      })
    })
  }

  private koAnim(tgt: 'player' | 'clippy'): Promise<void> {
    return new Promise(r => {
      const obj = tgt === 'clippy' ? this.clippyGfx : (this.filmImg ?? this.filmPhGfx)
      this.tweens.add({
        targets: obj, alpha: 0, y: (obj.y ?? 0) + 40, duration: 500, ease: 'Power2',
        onComplete: () => r(),
      })
    })
  }

  private wait(ms: number): Promise<void> {
    return new Promise(r => this.time.delayedCall(ms, r))
  }
}

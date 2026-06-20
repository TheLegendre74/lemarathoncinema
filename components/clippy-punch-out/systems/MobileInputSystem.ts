import type { DodgeDirection } from '../types'
import { CFG } from '../config'

export type MobileMode = 'gyro' | 'pointer'

export type MobileAction =
  | { type: 'dodge'; dir: DodgeDirection }
  | { type: 'jab' }
  | { type: 'heavy' }
  | { type: 'guard_start' }
  | { type: 'guard_end' }
  | null

interface GyroState {
  enabled: boolean
  gamma: number
  beta: number
  baseGamma: number
  baseBeta: number
  calibrated: boolean
}

interface PtrButton {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  color: number
}

export class MobileInputSystem {
  isMobile = false
  private mode: MobileMode = 'pointer'

  // Gyro state
  private gyro: GyroState = {
    enabled: false, gamma: 0, beta: 0,
    baseGamma: 0, baseBeta: 0, calibrated: false,
  }
  private gyroLeanDir: DodgeDirection | null = null
  private gyroTiltThreshold = 18
  private gyroDuckThreshold = 28
  private gyroDeadzone = 12
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null

  // Pointer mode state
  private leanPointerId: number | null = null
  private pointerLeanDir: DodgeDirection | null = null
  private ptrButtons: PtrButton[] = []
  private buttonZoneY = 0

  // Common
  private pendingActions: MobileAction[] = []
  private guardActive = false
  private guardPointerId: number | null = null
  private activeTouches = new Set<number>()
  private W = 0
  private H = 0

  init(W: number, H: number, gyroAlreadyGranted = false, mobileMode: MobileMode = 'pointer') {
    this.W = W
    this.H = H
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!this.isMobile) return

    this.mode = mobileMode

    if (mobileMode === 'gyro') {
      if (gyroAlreadyGranted) {
        this.startGyro()
      } else {
        this.initGyroscope()
      }
    } else {
      this.setupPointerButtons()
    }
  }

  get mobileMode(): MobileMode { return this.mode }
  get gyroEnabled(): boolean { return this.gyro.enabled }

  // ── Gyro setup ─────────────────────────────────────────────────────

  private initGyroscope() {
    if (typeof DeviceOrientationEvent !== 'undefined'
      && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      ;(DeviceOrientationEvent as any).requestPermission()
        .then((perm: string) => {
          if (perm === 'granted') this.startGyro()
        })
        .catch(() => {})
    } else if ('DeviceOrientationEvent' in window) {
      this.startGyro()
    }
  }

  private startGyro() {
    this.gyro.enabled = true
    this.orientationHandler = (e: DeviceOrientationEvent) => {
      this.gyro.gamma = e.gamma ?? 0
      this.gyro.beta = e.beta ?? 0

      if (!this.gyro.calibrated) {
        this.gyro.baseGamma = this.gyro.gamma
        this.gyro.baseBeta = this.gyro.beta
        this.gyro.calibrated = true
      }
    }
    window.addEventListener('deviceorientation', this.orientationHandler)
  }

  calibrate() {
    this.gyro.baseGamma = this.gyro.gamma
    this.gyro.baseBeta = this.gyro.beta
  }

  // ── Pointer mode setup ─────────────────────────────────────────────

  private setupPointerButtons() {
    const btnH = Math.round(this.H * 0.11)
    const btnY = this.H - btnH - 6
    const gap = 6
    const totalW = this.W - gap * 4
    const btnW = Math.round(totalW / 3)

    this.buttonZoneY = btnY - 10
    this.ptrButtons = [
      { id: 'jab', x: gap, y: btnY, w: btnW, h: btnH, label: 'JAB', color: 0x2288cc },
      { id: 'guard', x: gap * 2 + btnW, y: btnY, w: btnW, h: btnH, label: 'GARDE', color: 0x44aa44 },
      { id: 'heavy', x: gap * 3 + btnW * 2, y: btnY, w: btnW, h: btnH, label: 'LOURD', color: 0xcc4422 },
    ]
  }

  // ── Unified lean direction ─────────────────────────────────────────

  getLeanDir(): DodgeDirection | null {
    if (this.mode === 'gyro') return this.gyroLeanDir
    return this.pointerLeanDir
  }

  // ── Touch handling ─────────────────────────────────────────────────

  handlePointerDown(x: number, y: number, pointerId: number) {
    if (!this.isMobile) return

    this.activeTouches.add(pointerId)

    if (this.mode === 'gyro') {
      if (this.activeTouches.size >= 2) {
        if (!this.guardActive) {
          this.guardActive = true
          this.pendingActions.push({ type: 'guard_start' })
        }
        return
      }
      if (x < this.W / 2) {
        this.pendingActions.push({ type: 'jab' })
      } else {
        this.pendingActions.push({ type: 'heavy' })
      }
    } else {
      const btn = this.hitTestButton(x, y)
      if (btn) {
        if (btn.id === 'jab') this.pendingActions.push({ type: 'jab' })
        else if (btn.id === 'heavy') this.pendingActions.push({ type: 'heavy' })
        else if (btn.id === 'guard') {
          this.guardPointerId = pointerId
          if (!this.guardActive) {
            this.guardActive = true
            this.pendingActions.push({ type: 'guard_start' })
          }
        }
        return
      }
      this.leanPointerId = pointerId
      this.updatePointerLean(x, y)
    }
  }

  handlePointerMove(x: number, y: number, pointerId: number) {
    if (!this.isMobile) return
    if (this.mode === 'pointer' && pointerId === this.leanPointerId) {
      this.updatePointerLean(x, y)
    }
  }

  handlePointerUp(_x: number, _y: number, pointerId: number) {
    if (!this.isMobile) return

    this.activeTouches.delete(pointerId)

    if (this.mode === 'gyro') {
      if (this.guardActive && this.activeTouches.size < 2) {
        this.guardActive = false
        this.pendingActions.push({ type: 'guard_end' })
      }
    } else {
      if (pointerId === this.leanPointerId) {
        this.leanPointerId = null
        this.pointerLeanDir = null
      }
      if (pointerId === this.guardPointerId) {
        this.guardPointerId = null
        this.guardActive = false
        this.pendingActions.push({ type: 'guard_end' })
      }
    }
  }

  private hitTestButton(x: number, y: number): PtrButton | null {
    for (const btn of this.ptrButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        return btn
      }
    }
    return null
  }

  private updatePointerLean(x: number, y: number) {
    const th = CFG.player.lean.zoneThreshold
    const relX = (x - this.W / 2) / (this.W / 2)
    const relY = (y - this.H / 2) / (this.H / 2)

    if (Math.abs(relX) > Math.abs(relY) && Math.abs(relX) > th) {
      this.pointerLeanDir = relX < 0 ? 'left' : 'right'
    } else if (relY > th) {
      this.pointerLeanDir = 'down'
    } else {
      this.pointerLeanDir = null
    }
  }

  // ── Update ─────────────────────────────────────────────────────────

  update(_dt: number) {
    if (!this.isMobile) return

    if (this.mode === 'gyro' && this.gyro.enabled) {
      const relGamma = this.gyro.gamma - this.gyro.baseGamma
      const relBeta = this.gyro.beta - this.gyro.baseBeta

      if (relBeta > this.gyroDuckThreshold) {
        this.gyroLeanDir = 'down'
      } else if (relGamma < -this.gyroTiltThreshold) {
        this.gyroLeanDir = 'left'
      } else if (relGamma > this.gyroTiltThreshold) {
        this.gyroLeanDir = 'right'
      } else if (Math.abs(relGamma) < this.gyroDeadzone && relBeta < this.gyroDeadzone) {
        this.gyroLeanDir = null
      }
    }
  }

  // ── Actions ────────────────────────────────────────────────────────

  consumeActions(): MobileAction[] {
    const actions = [...this.pendingActions]
    this.pendingActions = []
    return actions
  }

  isGuardHeld(): boolean {
    return this.guardActive
  }

  // ── Drawing ────────────────────────────────────────────────────────

  drawMobileHUD(g: Phaser.GameObjects.Graphics, W: number, H: number) {
    if (!this.isMobile) return

    if (this.mode === 'gyro') {
      this.drawGyroHUD(g, W, H)
    } else {
      this.drawPointerButtons(g)
    }
  }

  private drawGyroHUD(g: Phaser.GameObjects.Graphics, W: number, H: number) {
    if (!this.gyro.enabled) return

    const relG = this.gyro.gamma - this.gyro.baseGamma

    const indicatorY = Math.round(H * 0.88)
    const indicatorR = 18
    const rangeW = Math.round(W * 0.35)
    const cx = W / 2

    g.fillStyle(0x0d0d1e, 0.5)
    g.fillRoundedRect(cx - rangeW / 2, indicatorY - indicatorR - 4, rangeW, indicatorR * 2 + 8, 8)

    const normG = Math.max(-1, Math.min(1, relG / 30))
    const dotX = cx + normG * (rangeW / 2 - indicatorR)

    const col = this.gyroLeanDir
      ? this.gyroLeanDir === 'down' ? 0x44aaff : 0xffcc00
      : 0x888888
    g.fillStyle(col, 0.8)
    g.fillCircle(dotX, indicatorY, indicatorR)

    g.lineStyle(1.5, 0xffffff, 0.3)
    g.strokeCircle(cx, indicatorY, 4)

    if (this.gyroLeanDir === 'down') {
      const arrowY = indicatorY - indicatorR - 12
      g.fillStyle(0x44aaff, 0.8)
      g.beginPath()
      g.moveTo(cx, arrowY + 10)
      g.lineTo(cx - 8, arrowY)
      g.lineTo(cx + 8, arrowY)
      g.closePath()
      g.fillPath()
    }

    g.fillStyle(0xffffff, 0.25)
    const tapH = Math.round(H * 0.08)
    const tapY = Math.round(H - tapH - 6)
    const halfW = Math.round(W * 0.44)
    g.fillRoundedRect(cx - halfW - 8, tapY, halfW, tapH, 8)
    g.fillRoundedRect(cx + 8, tapY, halfW, tapH, 8)
  }

  private drawPointerButtons(g: Phaser.GameObjects.Graphics) {
    for (const btn of this.ptrButtons) {
      const isGuardHeld = btn.id === 'guard' && this.guardActive
      g.fillStyle(btn.color, isGuardHeld ? 0.55 : 0.35)
      g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 10)
      g.lineStyle(isGuardHeld ? 3 : 2, btn.color, isGuardHeld ? 1 : 0.7)
      g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 10)
    }
  }

  getPointerButtons(): readonly PtrButton[] {
    return this.ptrButtons
  }

  // ── Debug ──────────────────────────────────────────────────────────

  getGyroDebug(): { gamma: number; beta: number; relGamma: number; relBeta: number } {
    return {
      gamma: this.gyro.gamma,
      beta: this.gyro.beta,
      relGamma: this.gyro.gamma - this.gyro.baseGamma,
      relBeta: this.gyro.beta - this.gyro.baseBeta,
    }
  }

  destroy() {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler)
      this.orientationHandler = null
    }
    this.activeTouches.clear()
  }
}

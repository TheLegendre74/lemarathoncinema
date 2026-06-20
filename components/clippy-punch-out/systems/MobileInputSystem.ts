import type { DodgeDirection } from '../types'

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

interface TouchButton {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  color: number
  pressed: boolean
  pointerId: number | null
}

export class MobileInputSystem {
  isMobile = false

  private gyro: GyroState = {
    enabled: false, gamma: 0, beta: 0,
    baseGamma: 0, baseBeta: 0, calibrated: false,
  }
  private buttons: TouchButton[] = []
  private pendingActions: MobileAction[] = []
  private guardActive = false
  private activeTouches = new Set<number>()
  private W = 0
  private H = 0

  private gyroLeanDir: DodgeDirection | null = null

  // Gyro thresholds (degrees relative to calibrated center)
  private gyroTiltThreshold = 15
  private gyroDuckThreshold = 25
  private gyroDeadzone = 6

  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null

  init(W: number, H: number) {
    this.W = W
    this.H = H
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!this.isMobile) return

    this.buttons = []
    this.initGyroscope()
  }

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

  requestGyroPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined'
      && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      return (DeviceOrientationEvent as any).requestPermission()
        .then((perm: string) => {
          if (perm === 'granted') {
            this.startGyro()
            return true
          }
          return false
        })
        .catch(() => false)
    }
    this.startGyro()
    return Promise.resolve(true)
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

  handlePointerDown(x: number, y: number, pointerId: number) {
    if (!this.isMobile) return

    this.activeTouches.add(pointerId)

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
  }

  handlePointerMove(_x: number, _y: number, _pointerId: number) {
    if (!this.isMobile) return
  }

  handlePointerUp(_x: number, _y: number, pointerId: number) {
    if (!this.isMobile) return

    this.activeTouches.delete(pointerId)

    if (this.guardActive && this.activeTouches.size < 2) {
      this.guardActive = false
      this.pendingActions.push({ type: 'guard_end' })
    }
  }

  update(_dt: number) {
    if (!this.isMobile) return

    if (this.gyro.enabled) {
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

  getGyroLeanDir(): DodgeDirection | null {
    return this.gyroLeanDir
  }

  get gyroEnabled(): boolean {
    return this.gyro.enabled
  }

  getGyroDebug(): { gamma: number; beta: number; relGamma: number; relBeta: number } {
    return {
      gamma: this.gyro.gamma,
      beta: this.gyro.beta,
      relGamma: this.gyro.gamma - this.gyro.baseGamma,
      relBeta: this.gyro.beta - this.gyro.baseBeta,
    }
  }

  consumeActions(): MobileAction[] {
    const actions = [...this.pendingActions]
    this.pendingActions = []
    return actions
  }

  isGuardHeld(): boolean {
    return this.guardActive
  }

  getButtons(): readonly TouchButton[] {
    return this.buttons
  }

  drawButtons(_g: Phaser.GameObjects.Graphics) {
    // No buttons in gyro mode
  }

  drawGyroHUD(g: Phaser.GameObjects.Graphics, W: number, H: number) {
    if (!this.isMobile || !this.gyro.enabled) return

    const relG = this.gyro.gamma - this.gyro.baseGamma
    const relB = this.gyro.beta - this.gyro.baseBeta

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

  destroy() {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler)
      this.orientationHandler = null
    }
    this.activeTouches.clear()
  }
}

import type { DodgeDirection } from '../types'

export type MobileAction =
  | { type: 'dodge'; dir: DodgeDirection }
  | { type: 'jab' }
  | { type: 'heavy' }
  | { type: 'guard_start' }
  | { type: 'guard_end' }
  | null

interface SwipeState {
  startX: number
  startY: number
  startTime: number
  active: boolean
}

interface GyroState {
  enabled: boolean
  gamma: number
  beta: number
  triggered: boolean
  cooldown: number
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
  useGyro = true
  useSwipe = true

  private swipe: SwipeState = { startX: 0, startY: 0, startTime: 0, active: false }
  private gyro: GyroState = { enabled: false, gamma: 0, beta: 0, triggered: false, cooldown: 0 }
  private buttons: TouchButton[] = []
  private pendingActions: MobileAction[] = []
  private swipeThreshold = 40
  private swipeMaxTime = 400
  private gyroTiltThreshold = 18
  private gyroDuckThreshold = 35
  private gyroCooldownMs = 600
  private guardActive = false

  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null

  init(W: number, H: number) {
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!this.isMobile) return

    const btnH = Math.round(H * 0.12)
    const btnW = Math.round(W * 0.25)
    const btnY = Math.round(H - btnH - 10)
    const gap = Math.round(W * 0.04)

    this.buttons = [
      {
        id: 'jab', label: 'JAB',
        x: gap, y: btnY, w: btnW, h: btnH,
        color: 0x2266cc, pressed: false, pointerId: null,
      },
      {
        id: 'guard', label: 'GARDE',
        x: Math.round(W / 2 - btnW / 2), y: btnY, w: btnW, h: btnH,
        color: 0x226644, pressed: false, pointerId: null,
      },
      {
        id: 'heavy', label: 'LOURD',
        x: Math.round(W - btnW - gap), y: btnY, w: btnW, h: btnH,
        color: 0xcc4422, pressed: false, pointerId: null,
      },
    ]

    this.initGyroscope()
  }

  private initGyroscope() {
    if (!this.useGyro) return

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
    }
    window.addEventListener('deviceorientation', this.orientationHandler)
  }

  handlePointerDown(x: number, y: number, pointerId: number) {
    if (!this.isMobile) return

    // Check buttons
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        btn.pressed = true
        btn.pointerId = pointerId

        if (btn.id === 'jab') this.pendingActions.push({ type: 'jab' })
        if (btn.id === 'heavy') this.pendingActions.push({ type: 'heavy' })
        if (btn.id === 'guard') {
          this.guardActive = true
          this.pendingActions.push({ type: 'guard_start' })
        }
        return
      }
    }

    // Swipe start (upper area only, not buttons)
    if (this.useSwipe) {
      this.swipe = { startX: x, startY: y, startTime: Date.now(), active: true }
    }
  }

  handlePointerMove(x: number, _y: number, pointerId: number) {
    if (!this.isMobile) return
    // Track guard button release if finger moves off
    const guardBtn = this.buttons.find(b => b.id === 'guard')
    if (guardBtn && guardBtn.pointerId === pointerId && guardBtn.pressed) {
      if (x < guardBtn.x || x > guardBtn.x + guardBtn.w) {
        guardBtn.pressed = false
        guardBtn.pointerId = null
        this.guardActive = false
        this.pendingActions.push({ type: 'guard_end' })
      }
    }
  }

  handlePointerUp(x: number, y: number, pointerId: number) {
    if (!this.isMobile) return

    // Release buttons
    for (const btn of this.buttons) {
      if (btn.pointerId === pointerId) {
        btn.pressed = false
        btn.pointerId = null
        if (btn.id === 'guard' && this.guardActive) {
          this.guardActive = false
          this.pendingActions.push({ type: 'guard_end' })
        }
      }
    }

    // Swipe detection
    if (this.useSwipe && this.swipe.active) {
      this.swipe.active = false
      const elapsed = Date.now() - this.swipe.startTime
      if (elapsed > this.swipeMaxTime) return

      const dx = x - this.swipe.startX
      const dy = y - this.swipe.startY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist >= this.swipeThreshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.pendingActions.push({ type: 'dodge', dir: dx < 0 ? 'left' : 'right' })
        } else if (dy > 0) {
          this.pendingActions.push({ type: 'dodge', dir: 'down' })
        }
      }
    }
  }

  update(dt: number) {
    if (!this.isMobile) return

    // Gyroscope dodge detection
    if (this.gyro.enabled && this.useGyro) {
      if (this.gyro.cooldown > 0) {
        this.gyro.cooldown -= dt * 1000
        this.gyro.triggered = false
      } else if (!this.gyro.triggered) {
        const g = this.gyro.gamma
        const b = this.gyro.beta

        if (g < -this.gyroTiltThreshold) {
          this.pendingActions.push({ type: 'dodge', dir: 'left' })
          this.gyro.triggered = true
          this.gyro.cooldown = this.gyroCooldownMs
        } else if (g > this.gyroTiltThreshold) {
          this.pendingActions.push({ type: 'dodge', dir: 'right' })
          this.gyro.triggered = true
          this.gyro.cooldown = this.gyroCooldownMs
        } else if (b > this.gyroDuckThreshold) {
          this.pendingActions.push({ type: 'dodge', dir: 'down' })
          this.gyro.triggered = true
          this.gyro.cooldown = this.gyroCooldownMs
        }

        if (Math.abs(g) < 8 && b < 20) {
          this.gyro.triggered = false
        }
      }
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

  drawButtons(g: Phaser.GameObjects.Graphics) {
    if (!this.isMobile) return

    for (const btn of this.buttons) {
      const alpha = btn.pressed ? 0.7 : 0.4
      g.fillStyle(btn.color, alpha)
      g.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 12)
      g.lineStyle(2, 0xffffff, btn.pressed ? 0.8 : 0.3)
      g.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 12)
    }
  }

  destroy() {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler)
      this.orientationHandler = null
    }
  }
}

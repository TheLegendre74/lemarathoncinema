export const CFG = {
  player: {
    maxHP: 100,
    maxStamina: 120,

    stamina: {
      regenPerSec: 10,
      costDodge: 5,
      costDodgePerfect: 0,
      costHitStun: 4,
      costHitGuard: 10,
      hitStunReward: 20,
      exhaustedDurationMs: 1500,
    },

    jab: {
      damage: 6,
      startup: 120,
      active: 90,
      recovery: 220,
      cooldown: 500,
    },

    heavy: {
      damage: 16,
      startup: 280,
      active: 140,
      recovery: 600,
      cooldown: 500,
    },

    guard: {
      damageReduction: 0.70,
      activation: 80,
      exit: 120,
    },

    mouse: {
      swipeThreshold: 35,
      dodgeCooldownMs: 500,
    },

    dodge: {
      invulnMs: 180,
      totalMs: 450,
      cooldown: 700,
    },

    lean: {
      zoneThreshold: 0.15,
      graceMs: 150,
      baseDrainPerSec: 6,
      maxDrainMultiplier: 2.5,
    },

    starPunch: {
      starsRequired: 3,
      damage: 35,
    },
  },

  clippy: {
    maxHP: 140,

    jab: { damage: 5, recovery: 300 },
    hook: { damage: 12, recovery: 300 },
    charge: { damage: 22, recovery: 300 },

    counterPunchDamage: 8,

    stun: {
      hitsAllDodged: 2,
      hitsPartial: 1,
      hitsChargePerfect: 5,
      durationMinMs: 1000,
      durationMaxMs: 2500,
    },

    taunt: {
      chance: 0.08,
      duration: 1500,
      minInterval: 8000,
    },
  },

  feint: {
    baseChance: 0.12,
    highConfidenceChance: 0.30,
    confidenceThreshold: 70,
    cancelDuration: 200,
  },

  ai: {
    confidence: {
      onPlayerHit: 6,
      onPlayerHeavyMiss: 12,
      onPlayerGuardPerSec: 1,
      speedThreshold: 50,
      aggressiveThreshold: 80,
    },
    panic: {
      onPerfectCounter: 14,
      onPlayerCombo: 8,
      onMultipleMisses: 5,
      slowRecoveryThreshold: 50,
      bigOpeningsThreshold: 80,
    },
    fatigue: {
      onMissedAttack: 18,
      onComboTaken: 10,
      slowAttacksThreshold: 60,
      bigPausesThreshold: 85,
    },
  },

  yellowBlink: {
    startBeforeMs: 1000,
    durationMs: 1000,
  },

  tells: {
    amplitudeHighConf: 0.65,
    amplitudeMedConf: 0.85,
    amplitudeLowConf: 1.0,
    confidenceHighThreshold: 80,
    confidenceMedThreshold: 50,
    blinkDurationMs: 80,
    blinkAlpha: 0.15,
  },

  windUp: {
    jabP1: 2000,
    hookP1: 2200,
    jabP2: 1600,
    hookP2: 1800,
    jabP3: 1200,
    hookP3: 1400,
  },

  charge: {
    recoilPx: 30,
    freezeMs: 1400,
    blinkIntervalMs: 200,
  },

  series: {
    comboMinP1: 2,
    comboMaxP1: 5,
    comboMinP2: 3,
    comboMaxP2: 7,
    comboMinP3: 4,
    comboMaxP3: 8,
    delayBetweenAttacksP1: 700,
    delayBetweenAttacksP2: 500,
    delayBetweenAttacksP3: 350,
    idleDelayMinP1: 1400,
    idleDelayMaxP1: 2200,
    idleDelayMinP2: 900,
    idleDelayMaxP2: 1600,
    idleDelayMinP3: 600,
    idleDelayMaxP3: 1100,
  },

  rageCombo: {
    maxAttacks: 4,
    delayBetweenMs: 1000,
    chance: 0.35,
    windUpMultiplier: 0.6,
  },

  distribution: {
    p1: { jab: 0.55, hook: 0.30, charge: 0.15 },
    p2: { jab: 0.30, hook: 0.35, charge: 0.35 },
    p3: { jab: 0.25, hook: 0.40, charge: 0.35 },
  },

  crowd: {
    errorThresholdProjectile: 3,
    successStreakRose: 5,
    earlyDodgeToleranceMs: 500,
    dodgeWindowMs: 400,
  },

  projectiles: {
    types: {
      can:      { damage: 6, weight: 3 },
      keyboard: { damage: 8, weight: 2 },
      popcorn:  { damage: 4, weight: 3 },
    },
    warningMs: 800,
    travelMs: 1600,
    roseClickMs: 2000,
    dodgeRewardStamina: 30,
    dodgeRewardHP: 20,
    dodgeRewardHPThreshold: 0.8,
  },

  phases: {
    transitionThreshold: 0.50,
    rageThreshold: 0.30,
  },

  combat: {
    playerStunDuration: 400,
  },

  tutorial: {
    clippyAttackSpeed: 0.35,
    noDamage: true,
  },
} as const

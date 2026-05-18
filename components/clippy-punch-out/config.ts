export const CFG = {
  player: {
    maxHP: 100,
    maxStamina: 100,
    lowStaminaThreshold: 20,
    exhaustedExitThreshold: 15,

    staminaRegen: {
      idle: 12,
      moving: 6,
      guarding: 0,
      exhausted: 6,
    },

    jab: {
      damage: 6,
      staminaCost: 8,
      startup: 120,
      active: 90,
      recovery: 220,
      cooldown: 430,
    },

    heavy: {
      damage: 16,
      staminaCost: 22,
      startup: 280,
      active: 140,
      recovery: 600,
      cooldown: 1020,
    },

    guard: {
      damageReduction: 0.70,
      staminaCostPerSec: 7,
      activation: 80,
      exit: 120,
      maxComfortMs: 3000,
      penaltyDrainMult: 3,
    },

    mouse: {
      swipeThreshold: 35,
      dodgeCooldownMs: 500,
    },

    dodge: {
      staminaCost: 18,
      invulnMs: 180,
      totalMs: 450,
      cooldown: 700,
      staminaBonus: 25,
    },

    perfectDodge: {
      windowMs: 70,
    },

    counterPunch: {
      windowMs: 80,
      damageMultiplier: 1.8,
      staminaGain: 20,
    },

    starPunch: {
      starsRequired: 3,
      damage: 35,
    },
  },

  clippy: {
    maxHP: 140,

    jab: { damage: 5, startup: 180, recovery: 250 },
    hook: { damage: 12, startup: 420, recovery: 500 },
    charge: { damage: 22, startup: 850, recovery: 900 },

    guard: {
      playerStaminaMult: 2.0,
      hypePenalty: 5,
      starLoss: 1,
    },

    stun: {
      duration: 700,
      maxHits: 3,
      chargePhase3MaxHits: 5,
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
    idleBase: 800,
    idleRandom: 1200,
    comboRecoveryMult: 0.5,
  },

  tells: {
    blinkPreDelayMs: 500,
    blinkDurationMs: 80,
    blinkAlpha: 0.15,
    amplitudeHighThreshold: 80,
    amplitudeMediumThreshold: 50,
    amplitudeHigh: 0.65,
    amplitudeMedium: 0.82,
    amplitudeLow: 1.2,
  },

  hype: {
    initial: 55,
    min: 0,
    max: 100,
    gains: {
      jabHit: 2,
      heavyHit: 6,
      perfectDodge: 8,
      counterPunch: 15,
      combo: 10,
      tauntHit: 1,
    },
    losses: {
      jabMiss: 3,
      heavyMiss: 10,
      playerHit: 6,
      guardPerSec: 2,
      guardBlock: 5,
    },
    thresholds: { delirious: 70, hostile: 35 },
    deliriousRegenMult: 1.30,
  },

  projectiles: {
    intervals: [
      { hypeMin: 30, hypeMax: 35, ms: 12000 },
      { hypeMin: 20, hypeMax: 29, ms: 8000 },
      { hypeMin: 10, hypeMax: 19, ms: 5000 },
      { hypeMin: 0,  hypeMax: 9,  ms: 3000 },
    ] as const,
    types: {
      can:      { damage: 6,  weight: 3 },
      mug:      { damage: 4,  weight: 2, blur: true },
      keyboard: { damage: 12, weight: 1 },
      mouse:    { damage: 3,  weight: 4 },
    },
    warningMs: 800,
    travelMs: 600,
    dodgeWindowMs: 300,
  },

  frenzy: {
    activationThreshold: 90,
    activationDuration: 5000,
    staminaRegenMult: 1.60,
    staminaCostMult: 0.80,
    panicPerSec: 2,
  },

  phases: { phase1: 0.66, phase2: 0.33 },

  combat: {
    comboWindowMs: 2000,
    comboHypeGain: 10,
    playerStunDuration: 400,
  },

  tutorial: {
    clippyAttackSpeed: 0.35,
    noDamage: true,
    noStaminaDrain: false,
  },
} as const

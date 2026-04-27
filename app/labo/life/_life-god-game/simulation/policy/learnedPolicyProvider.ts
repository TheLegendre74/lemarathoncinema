import type * as Ort from 'onnxruntime-web'
import {
  type AmPolicyInput,
  type AmPolicyOutput,
  type AmPolicyProvider,
  type AmPolicyProviderStatus,
  RuleBasedPolicyProvider,
  clampPolicyScore,
  emptyActionScores,
} from './amPolicy'
import {
  AM_POLICY_INPUT_SIZE,
  AM_POLICY_MODEL_PATH,
  AM_POLICY_OUTPUT_ACTIONS,
  AM_POLICY_OUTPUT_SIZE,
  POLICY_BEHAVIOR_FEATURES,
  POLICY_INFERENCE_INTERVAL_TICKS,
  POLICY_MISSION_FEATURES,
  POLICY_ROLE_FEATURES,
} from './amPolicyModelContract'

type OrtModule = typeof Ort
type OrtSession = Ort.InferenceSession

function normalize(value: number, max: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value / max))
}

function normalizeNullableDistance(value: number | null, max: number) {
  return value === null ? 1 : normalize(value, max)
}

function normalizeSigned(value: number, range: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(-1, Math.min(1, value / range))
}

function oneHot<T extends readonly string[]>(items: T, key: string) {
  return items.map((item) => (item.endsWith(`:${key}`) ? 1 : 0))
}

export function encodeAmPolicyInput(input: AmPolicyInput): Float32Array {
  const values = [
    ...oneHot(POLICY_MISSION_FEATURES, input.mission),
    ...oneHot(POLICY_BEHAVIOR_FEATURES, input.behaviorState),
    ...oneHot(POLICY_ROLE_FEATURES, input.role),
    normalize(input.energy, 100),
    normalize(input.stuckTicks, 30),
    normalize(input.wallDistances.left, 40),
    normalize(input.wallDistances.right, 40),
    normalize(input.wallDistances.top, 40),
    normalize(input.wallDistances.bottom, 40),
    normalizeNullableDistance(input.distanceToTargetCell, 80),
    normalizeNullableDistance(input.distanceToBuildSite, 80),
    normalize(input.distanceToNearestAm, 40),
    normalize(input.densityAroundAm, 80),
    Math.max(0, Math.min(1, input.stableCellDensity)),
    Math.max(0, Math.min(1, input.frozenMatterDensity)),
    Math.max(0, Math.min(1, input.terrainInfoLocal[0] ?? 0)),
    Math.max(0, Math.min(1, input.terrainInfoLocal[1] ?? 0)),
    Math.max(0, Math.min(1, input.terrainInfoLocal[2] ?? 0)),
    Math.max(0, Math.min(1, input.terrainInfoLocal[3] ?? 0)),
    Math.max(0, Math.min(1, input.terrainInfoLocal[4] ?? 0)),
    normalizeSigned(input.recentReward, 10),
    input.hasCarriedCell ? 1 : 0,
    input.isNearWall ? 1 : 0,
    input.isOvercrowded ? 1 : 0,
  ]
  return new Float32Array(values.slice(0, AM_POLICY_INPUT_SIZE))
}

export function decodePolicyOutput(outputTensor: { data: ArrayLike<number> } | null | undefined): AmPolicyOutput | null {
  if (!outputTensor || outputTensor.data.length < AM_POLICY_OUTPUT_SIZE) return null

  const actionScores = emptyActionScores()
  for (let index = 0; index < AM_POLICY_OUTPUT_SIZE; index += 1) {
    const value = Number(outputTensor.data[index])
    if (!Number.isFinite(value)) return null
    actionScores[AM_POLICY_OUTPUT_ACTIONS[index]] = clampPolicyScore(value)
  }

  const confidenceRaw = Number(outputTensor.data[AM_POLICY_OUTPUT_SIZE] ?? 0.65)
  if (!Number.isFinite(confidenceRaw)) return null

  return {
    providerName: 'learned',
    actionScores,
    confidence: Math.max(0, Math.min(0.85, confidenceRaw)),
    status: 'ready',
  }
}

export class LearnedPolicyProvider implements AmPolicyProvider {
  readonly name = 'learned'

  private status: AmPolicyProviderStatus = 'idle'
  private lastError: string | null = null
  private ort: OrtModule | null = null
  private session: OrtSession | null = null
  private inputName: string | null = null
  private outputName: string | null = null
  private decisionCounter = 0
  private cachedOutput: AmPolicyOutput | null = null
  private readonly fallbackProvider = new RuleBasedPolicyProvider()

  constructor(
    private readonly modelPath = AM_POLICY_MODEL_PATH,
    private readonly debug = false
  ) {}

  async load() {
    if (this.status === 'loading' || this.status === 'ready') return this
    if (typeof window === 'undefined') {
      this.status = 'disabled'
      return this
    }

    this.status = 'loading'
    try {
      const ort = await import('onnxruntime-web')
      const session = await ort.InferenceSession.create(this.modelPath, { executionProviders: ['wasm'] })
      this.ort = ort
      this.session = session
      this.inputName = session.inputNames[0] ?? null
      this.outputName = session.outputNames[0] ?? null
      if (!this.inputName || !this.outputName) throw new Error('ONNX model has no usable input/output names')
      this.status = 'ready'
      this.lastError = null
      return this
    } catch (error) {
      this.status = 'failed'
      this.lastError = error instanceof Error ? error.message : 'Failed to load ONNX AM policy'
      if (this.debug) console.debug('[LifeGodGame] Learned AM policy unavailable:', this.lastError)
      return this
    }
  }

  scoreActions(input: AmPolicyInput): AmPolicyOutput {
    if (this.status !== 'ready' || !this.ort || !this.session || !this.inputName || !this.outputName) {
      return this.fallback(input, this.status === 'idle' ? 'disabled' : this.status)
    }

    this.decisionCounter += 1
    if (this.cachedOutput && this.decisionCounter % POLICY_INFERENCE_INTERVAL_TICKS !== 0) {
      return this.cachedOutput
    }

    void this.runInference(input)
    return this.cachedOutput ?? this.fallback(input, 'fallback')
  }

  getStatus() {
    return this.status
  }

  getLastError() {
    return this.lastError
  }

  private fallback(input: AmPolicyInput, status: AmPolicyProviderStatus): AmPolicyOutput {
    const fallbackOutput = this.fallbackProvider.scoreActions(input)
    return {
      ...fallbackOutput,
      providerName: status === 'disabled' ? 'rule-based' : 'fallback',
      status,
      error: this.lastError,
    }
  }

  private async runInference(input: AmPolicyInput) {
    if (!this.ort || !this.session || !this.inputName || !this.outputName) return
    try {
      const encoded = encodeAmPolicyInput(input)
      if (encoded.length !== AM_POLICY_INPUT_SIZE) throw new Error(`Invalid policy input size: ${encoded.length}`)
      const tensor = new this.ort.Tensor('float32', encoded, [1, AM_POLICY_INPUT_SIZE])
      const result = await this.session.run({ [this.inputName]: tensor })
      const decoded = decodePolicyOutput(result[this.outputName] as { data: ArrayLike<number> })
      if (!decoded) throw new Error('Invalid ONNX policy output')
      this.cachedOutput = decoded
      this.lastError = null
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'ONNX policy inference failed'
      if (this.debug) console.debug('[LifeGodGame] Learned AM policy inference ignored:', this.lastError)
      this.cachedOutput = null
    }
  }
}

export async function loadLearnedPolicyProvider(
  modelPath = AM_POLICY_MODEL_PATH,
  debug = false
) {
  const provider = new LearnedPolicyProvider(modelPath, debug)
  return provider.load()
}

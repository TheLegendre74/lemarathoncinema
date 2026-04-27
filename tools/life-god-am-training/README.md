# Life God Game AM Policy Training

Local-only tooling for training a small AM action-scoring model compatible with Life God Game.

This folder is not imported by the Next.js app. It exists only to generate a future ONNX model for:

```text
public/models/life-god-game/am-policy.onnx
```

The game still uses `RuleBasedPolicyProvider` by default. Do not enable `useLearnedAmPolicy` until the exported model has been tested in-game.

## Contract

The model follows the TypeScript contract in:

```text
app/labo/life/_life-god-game/simulation/policy/amPolicyModelContract.ts
```

The mirrored local contract is:

```text
tools/life-god-am-training/policy_contract.json
```

Current shape:

- input name: `input`
- input size: `46`
- output name: `output`
- output size: `15`
- output values: raw action scores, not softmax probabilities

The output action order is:

```text
moveNorth
moveSouth
moveEast
moveWest
moveNorthEast
moveNorthWest
moveSouthEast
moveSouthWest
keepTarget
selectNewTarget
harvest
deposit
terraform
rest
escapeStuckArea
```

## Setup

From the repo root:

```bash
cd tools/life-god-am-training
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

## Train

This first version uses imitation learning from local expert heuristics, not a heavy RL framework.

```bash
python train_am_policy.py
```

Useful options:

```bash
python train_am_policy.py --samples 100000 --epochs 20 --batch-size 256
```

The checkpoint is written to:

```text
tools/life-god-am-training/checkpoints/am_policy.pt
```

## Export ONNX

```bash
python export_to_onnx.py
```

This writes:

```text
public/models/life-god-game/am-policy.onnx
```

The exported ONNX model uses:

- input: `input`
- output: `output`
- dynamic batch axis

## Validate Contract

```bash
python test_policy_contract.py
```

The test checks:

- encoded input size;
- Torch output size;
- optional ONNX output size if the file exists;
- no NaN or Infinity;
- action count matches the contract;
- ONNX input/output names.

## Later In-Game Activation

After the ONNX file exists and the contract test passes, the game can later be tested by changing:

```ts
useLearnedAmPolicy = true
```

in:

```text
app/labo/life/_life-god-game/simulation/createLifeGodSimulation.ts
```

Do not commit that activation unless we explicitly decide the learned policy is stable enough. The model is only allowed to propose action scores; the game engine rules remain authoritative.

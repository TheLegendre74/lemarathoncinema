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
- input size: `52` (8 missions + 20 behaviors + 3 roles + 21 numeric)
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

### Feature breakdown

**Missions (8):** expandingPopulation, terraforming, ceremonyChattering, ceremonyCircleForming, ceremonyPraying, requestingPlayerPatterns, applyingPlayerPatterns, stable

**Behaviors (20):** idle, wandering, selectingBuildSite, seekingFixedCell, movingToFixedCell, harvestingCell, carryingCellToSite, depositingCell, assemblingAm, seekingFrozenMatter, shapingSoil, shapingVegetation, shapingWater, shapingRock, escapingStuckArea, requestingPattern, resting, ceremonyWandering, ceremonyApproaching, ceremonyPraying

**Roles (3):** builder, gatherer, explorer

**Numeric (21):** energy, stuckTicks, 4 wall distances, targetCell distance, buildSite distance, nearestAm distance, density, stableCellDensity, frozenMatterDensity, 5 terrain densities, recentReward, hasCarriedCell, isNearWall, isOvercrowded

## Training Scenarios

17 scenario types cover all game phases:

| Kind | Phase | Description |
|------|-------|-------------|
| target | expansion | Move toward a distant target cell |
| target_near | expansion | Target within 1 cell, harvest |
| wall | expansion | Stuck near wall, escape |
| blocked | expansion | Stuck in blocked zone |
| build_site | expansion | Carrying cell to build site |
| build_site_near | expansion | Near build site, deposit |
| keep_target | expansion | Assembling AM, keep target |
| avoid_am | expansion | Nearby AM, avoid crowding |
| frozen | terraform | Seeking frozen matter, far target |
| frozen_near | terraform | Seeking frozen matter, close target |
| rest | any | Low energy, rest |
| terraform_shaping | terraform | Active terrain shaping (soil/veg/water/rock) |
| terraform_stuck_wall | terraform | Terraforming AM stuck at wall |
| terraform_teleport | terraform | Extreme corner stuck, triggers escape |
| ceremony_wander | ceremony | Chattering phase, wandering |
| ceremony_approach | ceremony | Moving toward circle position |
| ceremony_pray | ceremony | Praying in place |

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

Uses imitation learning from local expert heuristics with CUDA Graph acceleration (~500x faster than the original CPU pipeline).

```bash
python train_am_policy.py
```

Default: 4k samples, 100 epochs, CUDA Graph multi-step replay. Runs in ~50ms on GPU (warm) vs ~26s on the old CPU path.

Useful options:

```bash
python train_am_policy.py --samples 8000 --epochs 200 --learning-rate 0.025
python train_am_policy.py --no-graph  # fallback without CUDA Graph
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

## Interactive Training Mode

The training system supports an interactive continuous mode with save-on-demand, resume, and data visualization.

### Speed Optimization

The original CPU pipeline took ~26s per training run. After optimization:

- Vectorized numpy dataset generation (`make_dataset_fast`) replaces the Python scalar loop (~25x faster)
- CUDA Graph multi-step replay removes kernel-launch overhead on GPU
- Full-batch gradient descent on GPU (no DataLoader, no mini-batches)
- PyTorch AMP (Automatic Mixed Precision) with GradScaler

Benchmarks on RTX 4050 Laptop:

| Config | Time | Accuracy | Speedup |
|--------|------|----------|---------|
| 4k/50ep/step10/lr0.05 | 26.5ms | 70.8% | ~976x |
| 4k/100ep/step10/lr0.04 | 48ms | 75.2% | ~543x |
| 4k/100ep/step10/lr0.04 (default) | ~50ms | 75%+ | ~500x |

### Interactive Mode

Continuous training loop that accumulates data over time:

```bash
python train_am_policy.py --interactive --resume
```

- Generates 2000 new samples per round (configurable: `--samples-per-round`)
- Trains 30 epochs per round on ALL accumulated data (configurable: `--epochs-per-round`)
- Press **[Enter]** to save model + dataset to disk at any time
- Press **[Ctrl+C]** to quit (auto-saves before exit)
- `--resume` reloads the previous session (model weights + accumulated dataset + epoch counter)

Saved files:

```text
checkpoints/am_policy.pt        (model + metadata)
checkpoints/am_policy.data.npz  (accumulated dataset: x inputs, y labels)
```

### Data Viewer

View collected training data statistics:

```bash
python show_data.py
```

Displays:

- Total samples collected and epochs trained
- Action label distribution (bar chart + percentages)
- Mission distribution
- Role distribution
- Behavior distribution
- Numeric feature statistics (mean, min, max)

### Desktop Launchers

Two .bat files are on the desktop for quick access:

| File | Action |
|------|--------|
| `Train_God_Game_IA.bat` | Lance l'entrainement interactif (GPU, resume auto) |
| `Voir_Data_God_Game.bat` | Affiche les statistiques des donnees collectees |

### Environment

- Python 3.14
- torch 2.12.0+cu126 (installed from `https://download.pytorch.org/whl/cu126`)
- RTX 4050 Laptop GPU (compute capability 8.9)
- CUDA Graph compatible (Adam with `capturable=True`, `foreach=False`)

## Extending the Training System

To add new game features to the training pipeline:

1. **Add to `policy_contract.json`** — new missions go in `mission_features`, new behaviors in `behavior_features`. Update `input_size` accordingly.
2. **Mirror in `amPolicyModelContract.ts`** — keep the TypeScript contract in sync.
3. **Add scenarios in `am_training_env.py`** — append to `SCENARIO_KINDS`, add scalar logic in `make_scenario()`, add vectorized logic in `make_dataset_fast()`, update `expert_action()`.
4. **Delete old checkpoints** — dimension changes invalidate saved weights. Remove `checkpoints/*.pt` and `checkpoints/*.npz`.
5. **`model.py` auto-adapts** — reads `INPUT_SIZE`/`OUTPUT_SIZE` from the contract, no manual change needed.
6. **Run `python test_policy_contract.py`** to validate everything matches.

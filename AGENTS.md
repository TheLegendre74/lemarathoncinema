# AGENTS.md

## Project Rules

- Do not modify Marathon Cinema core site features unless it is strictly necessary for the easter egg integration.
- Build the `Life God Game` easter egg in isolation from the main Marathon Cinema flows.
- Prefer TypeScript for all new code related to this feature.
- Separate simulation, rendering, player input, and UI into distinct modules.
- Keep rendering readable, performant, and free of any yellow filter.
- Avoid muddy or noisy pixel output.
- Do not implement multiple phases of the game in a single pass.
- Run `lint` and `build` checks when possible before closing work on the feature.

## Scope Guardrails

- Do not create the game until the feature plan and scaffolding are explicitly requested.
- Do not modify the public Marathon Cinema interface until integration is explicitly requested.
- Do not touch Supabase, authentication, film database, or marathon business logic for this feature.
- If integrating into Next.js, treat the game as a client-only experience.

## Life God Game — Core Rules

### Entity separation

Life God Game is built around three separate systems:

- ConwaySystem:
  Handles normal Conway cells only while Conway is active.

- FrozenMatterSystem:
  Handles frozen normal cells after Conway stops.
  Frozen matter is inert terrain/resource material.

- LivingEntitySystem:
  Handles living autonomous entities such as AMs now, and animals later.
  LivingEntitySystem must always update, even when ConwaySystem is stopped.

Never stop the whole simulation just because Conway is stopped.
Conway can stop.
Matter can freeze.
Living entities continue.

### AM rules

An AM is not a Conway cell.
An AM is a living autonomous agent represented visually by a cell pattern.

The cells drawn for an AM are only its visible body.
They are not normal Conway cells.

AM body cells must never:
- be processed by Conway rules;
- be copied into FrozenMatterSystem;
- be harvested by another AM;
- be transformed into terrain;
- be treated as inert matter;
- be deleted because of normal cell rules.

AMs must never freeze.

Once an AM is alive, it stays managed by LivingEntitySystem and keeps updating independently of Conway.

### AM behavior

AMs must behave like autonomous agents with goals, memory and behavior states.

The first major AM mission is:
- create AMs until the target population is reached.

During this mission, AMs should:
- select a build site;
- seek fixed or available cells;
- move toward a selected target cell;
- keep their target while it remains valid;
- harvest or carry cells;
- bring cells to the build site;
- deposit cells in a compact connected pile;
- assemble the pile into a new AM pattern;
- repeat until the AM population goal is reached.

AMs should not randomly change targets every tick.
Avoid back-and-forth oscillation.
If an AM is stuck, it should try a fallback movement or choose a new valid target.

### Terraforming rules

After the AM population goal is reached:
- Conway stops.
- Normal cells become frozen matter.
- AMs remain alive and active.
- AMs switch to terraforming.

Terraforming must use frozen matter as resource material.
AMs should convert frozen matter into terrain such as:
- soil;
- vegetation;
- water;
- rock.

AMs must remain above terrain and must not become terrain.

### Living entities

Future animals or other living organisms must follow the same rule:
once an entity is alive, it leaves normal cell logic forever.

Living entities must never:
- be processed by Conway rules;
- be frozen as matter;
- be transformed into terrain;
- disappear as normal cells.

Animals may die later through explicit gameplay rules, but not because of Conway or frozen matter logic.

### AM learning rules

AM learning is RL-lite, not deep reinforcement learning.

Do not add:
- neural networks;
- TensorFlow;
- ONNX;
- external machine learning dependencies;
- heavy training loops.

AM learning should be lightweight and debuggable:
- predefined goals;
- behavior states;
- short memory;
- reward events;
- bounded decision weights;
- gradual updates.

The AM brain only adjusts existing rule-based behavior.
It must never replace the mission system.

Weights must stay bounded.
Learning rate must stay low.
Recent history must stay limited.
Behavior must remain stable and understandable.

### Visual rules

The simulation must stay readable.
Avoid pixel soup.

AMs must be visually distinct from:
- Conway cells;
- frozen matter;
- terrain;
- construction sites;
- future animals.

No yellow filter.

### Safety for future changes

When modifying Life God Game:
- keep code inside components/life-god-game unless explicitly required;
- do not modify public Marathon Cinéma pages unless necessary;
- do not touch Supabase, auth or film data;
- run npm run build when possible;
- summarize changed files and behavior after each task.

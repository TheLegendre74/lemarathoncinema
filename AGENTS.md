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

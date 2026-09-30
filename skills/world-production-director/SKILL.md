---
name: world-production-director
description: Plan and audit a reusable world build across world facts, simulation, assets, stage interaction, and evidence; use it when a new world is created or an existing visual/runtime direction is replaced.
---

# World Production Director

Use this skill as the production entrypoint. It turns a broad request such as “make a world like this” into a versioned work plan with capability dependencies, real artifact paths, a selected visual profile, and evidence gates. It coordinates other Skills; it does not pretend that a plan, a concept image, or a static viewer proves a running game.

## First decision: choose the target

Record these fields before changing code or generating art:

- `worldId`, workspace path, base commit, seed, language, content limits;
- `visualProfile`: `cinematic-2.5d` or `pixel-sim`;
- target platforms and viewports;
- required capabilities: world build, simulation, dialogue, memory, timelines, console, assets, stage, export, audio, multiplayer, or other extensions;
- proof level for each capability: `guided`, `tool-backed`, `runtime-proven`, or `release-proven`.

Read [`references/capabilities.json`](references/capabilities.json) to see what this repository can actually prove. Read [`../world-stage/references/visual-profiles.v0.5.md`](../world-stage/references/visual-profiles.v0.5.md) and the selected profile in `assets/profiles/` before visual work. Do not use a generic “polished UI” target.

## Capability truthfulness

Every planned capability has one owner, explicit inputs, outputs, dependencies, and a proof status. Keep these distinctions:

- **guided**: the Skill describes a reliable Codex workflow, but no executable service proves it;
- **tool-backed**: a local script validates or produces a bounded artifact;
- **runtime-proven**: a fresh run consumes the artifact, changes state, and can be replayed;
- **release-proven**: the target platform/import path and required visual/interaction evidence pass.

Never call a static demo, a pre-recorded log, a provider plan, a generated concept image, or a copied file “implemented” for a higher proof level.

## Production stages

### P0 — intake and capability map

Freeze the workspace, base commit, world facts, current tests, visual reference, required capabilities, and open decisions. Produce `reports/production-intake.json`. Mark every capability as present, partial, planned, or explicitly out of scope.

### P1 — world kernel

Use `world-conceiver`, `contract-keeper`, `atlas-builder`, and `cast-forger` to produce validated world, space, actor, relationship, inventory, resource, time, and rule contracts. Run `world-audit`. No image or viewer work can repair an invalid kernel.

### P2 — simulation loop

Use `agent-cognition`, `life-director`, `dialogue-director`, and `memory-weaver` to run a fresh deterministic slice. Require `observe → propose → validate → apply → record`, source-linked dialogue/memory, snapshot recovery, and a replay hash. A viewer replaying existing NDJSON does not satisfy this gate.

### P3 — content and operations

Use `timeline-keeper`, `story-chronicler`, `world-console`, and `world-runner` for branches, summaries, sandbox interaction, user interventions, jobs, cancellation, and restart recovery. Separate canonical facts, derived content, and sandbox output.

### P4 — visual production

Select one visual profile, then use `scene-painter`, `sprite-forger`, and `asset-pipeline-director`. Produce map layers, navigation data, gameplay sprites, portraits, HUD layout, fallbacks, hashes, budgets, provenance, and a reviewable export. A portrait-only map actor is art debt, not a finished asset.

### P5 — stage and interaction

Use `stage-ui-director` and `world-stage` to project fresh replay frames. Verify selection, follow, route preview, movement, dialogue source, resource feedback, play/pause/step, context drawer, keyboard focus, reduced motion, and missing asset behavior. The stage cannot edit world facts directly.

### P6 — evidence and release

Use `stage-visual-qa` and `world-audit` against the exact build. Capture overview, movement, dialogue, exchange/decision, actor focus, collapsed, narrow, missing asset, and reduced-motion states. Technical checks and visual approval are separate fields. Publish only when the requested proof level passes.

## Reusable commands

Use the local helper to create or check a production plan:

```bash
node tools/world-production.mjs init \
  --profile cinematic-2.5d \
  --world /path/to/world \
  --mode visual-rebuild \
  --brief 'Describe the visual and interaction slice in concrete terms.' \
  --out reports/production-v05
```

Use the checker after the stage and evidence files exist:

```bash
node tools/world-production.mjs check \
  --world /path/to/world \
  --plan reports/production-v05/plan.json \
  --target plan
```

Use `--target release` only after the stage and evidence files exist. The helper checks paths, profile identity, required state names, capability dependencies, and evidence metadata. It does not award visual quality from file existence; `stage-visual-qa` and human review remain required.

## Shared result envelope

Return the project envelope for every stage:

```json
{
  "status": "ok|needs_input|failed",
  "artifacts": [],
  "diagnostics": [],
  "next": []
}
```

Each artifact records a relative path, kind, version, hash when available, producer, proof level, and review status. Each diagnostic has `code`, `severity`, `path`, `message`, and `fix`.

## Extension rules

- Add a capability to the registry before adding prompts or code. State its owner, dependencies, contract, artifact, runner, and proof.
- Add new fields through `contract-keeper` and a migration. Do not hide them in a Skill prompt or CSS rule.
- Add a new visual direction as a new profile and baseline. Do not blend camera, scale, tile, or HUD assumptions between profiles.
- Add external models only through `model-bridge`. Codex is the default planner and reviewer; DeepSeek/Gemini/image providers are optional adapters and are never required by the offline path.
- Preserve the old world facts when replacing presentation. Rebuild the scene and viewer from the same replay fixtures, then compare hashes.
- Keep generated worlds, reports, screenshots, and viewer builds in the caller workspace; the Skill repository stores reusable definitions and tools.

## Hard boundaries

Do not write `runtime/state.json`, `runtime/records.ndjson`, or snapshots directly. Do not claim a feature is complete because a concept image looks good. Do not publish placeholder sprites as finished gameplay assets. Do not silently downgrade a requested proof level; return `needs_input` with the missing artifact or test.

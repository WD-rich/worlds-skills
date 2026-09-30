---
name: world-stage
description: Render a world workspace as an interactive map with actor sprites, dialogue bubbles, side panels, controls, and live or replay playback.
---

# World Stage

Use this skill when a user needs to observe or interact with a running world visually.

## Profile gate

`world-production-director` selects one visual profile before this stage is built. The stage must expose that profile in `world.json.visuals.visualProfile`, load its versioned layout and asset manifests, and report the profile in every visual QA run. A stage that only renders a replay log in a generic dashboard is a compatibility prototype, not a finished visual stage.

## Produce

- a map layer driven by `SpaceGraph` and optional scene assets;
- actor placement and movement driven by replay frames or live events;
- dialogue bubbles and event feed with record provenance;
- character, resource, timeline, and intervention panels;
- keyboard/mouse camera controls and accessible text fallbacks;
- a read-only static mode for a workspace without a server.

The stage never invents state and never writes `state.json` or `records.ndjson` directly. It must show whether it is in live, replay, or sandbox mode and surface provider or asset failures without hiding the world state.

## Offline visual projection (v0.2)

When a world includes `visuals/scene.json`, the builder also reads the referenced style, asset, and animation manifests and exposes them under `world.json.visuals`. The stage projects those manifests with a Canvas layer while keeping DOM hit targets, labels, panels, and text fallbacks available for accessibility.

The v0.2 path is intentionally keyless: it reuses checked-in map/portrait assets, interpolates actor movement along declared routes, and applies deterministic idle, walk, talk, interaction, occlusion, and signal effects. It does not call an image model or a remote provider. A visual layer may include `map.image`, stable actor asset references, `layers`, `occlusion`, `interactables`, and normalized percent-space anchors; these are presentation inputs and cannot override replay facts.

Before handing off a generated stage, run the world audit and replay check, then inspect at least T0, a movement tick, a dialogue tick, and the final tick in a browser. The stage status must identify the offline replay/procedural mode so a viewer can distinguish recorded facts from presentation motion.

## Map-first stage (v0.3)

When the workspace scene declares `schemaVersion: "0.3"` and a `layout` manifest, use the map-first contract:

- keep the map as the dominant surface and reserve one contextual drawer for `world`, `actor`, or `event` focus;
- expose the three focus modes as visible tabs and keyboard shortcuts `1`, `2`, and `3`;
- show the current replay record as an event cue, mark current participants on the map, and show resource deltas at the tick where they occur;
- keep dialogue bubbles and the bottom dialogue dock scoped to the current tick so old conversation does not cover the scene;
- allow selecting a space, actor, event, or source record to focus the map without mutating replay data;
- keep the stage usable when the drawer is collapsed and retain readable DOM labels for Canvas content.

The v0.3 layout contract is carried by `visuals/layout.v0.3.json` and the style contract by `visuals/style.v0.3.json`. The builder copies the optional `stage-v03.css` layer into the viewer. This is still a keyless, offline presentation path: the viewer consumes checked-in assets and recorded facts and never asks an image or language model to render a frame.

For a v0.3 handoff, run the checks in [`stage-visual-qa`](../stage-visual-qa/SKILL.md) at T0, a movement tick, a dialogue tick, an exchange or decision tick, and a narrow viewport. Record the visible tick, focus mode, selected context, source record, resource values, and any overlap or text-fit finding.

## Reusable visual production contract (v0.5)

Use [`references/visual-production-contract.v0.5.md`](references/visual-production-contract.v0.5.md) when a stage needs a visual rebuild or when a new world joins the production pipeline. Keep the contract in the world workspace as versioned profile, style, layout, and animation manifests; presentation changes must not rewrite replay facts.

The v0.5 stage has four explicit visual roles:

- the map is the largest continuous surface and uses one orthographic/top-down 2.5D camera;
- gameplay actors use a common feet/center anchor, a bounded scene height, a ground shadow, and a deterministic silhouette fallback;
- portraits and expressive front art are drawer/list/detail assets only;
- routes, event cues, bubbles, resource deltas, and focus panels are derived from replay records and stay readable when the drawer collapses.

The builder may use a deterministic fallback when art is unavailable, but `renderMode: "silhouette"` is a diagnostic fallback and cannot satisfy the release visual gate. A world can run without an image provider, while a release build still needs profile-appropriate scene and gameplay assets. Provider-backed art is an asset pipeline input with a hash and role, never a renderer dependency.

### Cinematic 2.5D roam slice

When `visualProfile` is `cinematic-2.5d`, the stage can expose a presentation-only roam mode in addition to replay. The mode is deliberately separate from the fact timeline: it lets the selected actor walk across a checked-in navigation mask, inspect camera scale/occlusion, and test sprite direction frames without appending a record or changing `snapshot-000`/`records.ndjson`.

The reusable runtime contract is in [`assets/stage/motion.mjs`](assets/stage/motion.mjs). It provides polygon walkability, obstacle-aware line tests, endpoint snapping, A* pathfinding, path sampling, four-direction selection, and camera coordinate conversion. A scene that opts in declares `scene.navigation` (a versioned navigation JSON with `size`, `cellSize`, `ground`, and `obstacles`) and gameplay actors with `renderMode: "spritesheet"`. The animation manifest declares the common direction order, frame grid, draw size, and feet/center anchor. The viewer loads the navigation file read-only, animates the selected actor, keeps the map and foreground props in their declared layer order, and labels the mode `临时漫游 · 不写入事实`.

The builder copies `stage-v05.css`, `motion.mjs`, navigation files, foreground props, and actor portraits into the generated viewer. This keeps a future world reproducible from its manifests instead of relying on hand-copied viewer files. A roam click on an obstacle is snapped to the nearest safe point; an actor whose authored space anchor falls on a building is also snapped when pathfinding begins. If no safe endpoint exists, the stage preserves the replay position and reports the failed move.

For this slice, capture both states: replay at T0/T3/T5 and roam with a selected actor moving, arriving, and passing behind a foreground prop. A roam screenshot is evidence of the presentation contract only; it must never be presented as a new world fact.

Before promoting a v0.5 stage, follow the plan generated by `world-production-director` (for example `reports/production-v05/plan.json`) and copy its profile/review files into the world workspace. Capture T0/world, movement, dialogue, exchange/decision, collapsed panel, narrow drawer, missing asset, and reduced-motion states with `stage-visual-qa`; require zero hard failures for build, replay, overflow, missing fallback, and source-text fit, plus a separate visual review of composition, camera, actor grounding, material/lighting, and HUD hierarchy.

## Reusable implementation

The pure projection and validation code lives in [`assets/stage/engine.mjs`](assets/stage/engine.mjs). Build a stage from a world workspace with [`../../tools/build-stage.mjs`](../../tools/build-stage.mjs):

```bash
node tools/build-stage.mjs --world /path/to/world --out /path/to/world-viewer
```

The builder reads the world content, replay records, optional `runtime/dialogues.json` and `runtime/memories.json`, and an optional `visuals/scene.json`; it writes a self-contained `world.json` plus the stage runtime and referenced assets. Scene metadata is presentation data, while dialogue and memory entries must point back to replay record IDs. The generated stage uses recorded/local-rule data and keeps any model-backed generation outside the renderer. If a referenced visual file is absent, the stage must retain its accessible labels and show a visible fallback/diagnostic instead of silently inventing an asset.

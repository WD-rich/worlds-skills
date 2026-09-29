---
name: world-stage
description: Render a world workspace as an interactive map with actor sprites, dialogue bubbles, side panels, controls, and live or replay playback.
---

# World Stage

Use this skill when a user needs to observe or interact with a running world visually.

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

## Reusable implementation

The pure projection and validation code lives in [`assets/stage/engine.mjs`](assets/stage/engine.mjs). Build a stage from a world workspace with [`../../tools/build-stage.mjs`](../../tools/build-stage.mjs):

```bash
node tools/build-stage.mjs --world /path/to/world --out /path/to/world-viewer
```

The builder reads the world content, replay records, optional `runtime/dialogues.json` and `runtime/memories.json`, and an optional `visuals/scene.json`; it writes a self-contained `world.json` plus the stage runtime and referenced assets. Scene metadata is presentation data, while dialogue and memory entries must point back to replay record IDs. The generated stage uses recorded/local-rule data and keeps any model-backed generation outside the renderer. If a referenced visual file is absent, the stage must retain its accessible labels and show a visible fallback/diagnostic instead of silently inventing an asset.

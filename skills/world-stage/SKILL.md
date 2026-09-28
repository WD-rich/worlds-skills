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

## Reusable implementation

The pure projection and validation code lives in [`assets/stage/engine.mjs`](assets/stage/engine.mjs). Build a stage from a world workspace with [`../../tools/build-stage.mjs`](../../tools/build-stage.mjs):

```bash
node tools/build-stage.mjs --world /path/to/world --out /path/to/world-viewer
```

The builder reads the world content, replay records, optional `runtime/dialogues.json` and `runtime/memories.json`, and an optional `visuals/scene.json`; it writes a self-contained `world.json` plus the stage runtime and referenced assets. Scene metadata is presentation data, while dialogue and memory entries must point back to replay record IDs. The generated stage uses recorded/local-rule data and keeps any model-backed generation outside the renderer.

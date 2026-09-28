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


---
name: scene-painter
description: Turn a logical space graph into optional visual map assets, overlays, walkable grids, and a reviewable asset manifest.
---

# Scene Painter

Use this skill after `atlas-builder` when the world needs a visual map or game-ready navigation assets.

## Pipeline

1. create a top-down scene brief from the approved space graph;
2. generate or import a base image through `model-bridge`;
3. locate designed regions and interactive anchors;
4. produce a walkable mask and grid with stable tile coordinates;
5. export the image, overlays, grid, and `AssetRef` records;
6. run visual and structural review, preserving failed attempts as diagnostics.

The final map must keep coordinates and region IDs stable, expose a fallback procedural map, and remain usable without an image provider. Never infer runtime adjacency only from pixels.

## Offline stage path

For a keyless visual slice, skip `model-bridge`: reuse the approved map in `visuals/asset-manifest.v0.2.json` or draw the deterministic fallback grid, then write `visuals/scene.json` with normalized space anchors, declared routes, layer order, occlusion zones, and interactable markers. The scene file may reference style and animation manifests, but it cannot change the logical space graph or replay facts. `world-stage` copies the referenced asset into the generated viewer and keeps the map, labels, and route controls usable when the bitmap is missing.

For the v0.3 map-first stage, also write `visuals/layout.v0.3.json` with the map ratio, focus drawer, safe area, target viewports, and the `world`/`actor`/`event` focus modes. Keep space anchors, routes, and interactables in normalized percent coordinates so the stage can reframe the same scene at desktop and narrow viewports. The layout file describes presentation only; it cannot add spaces, actors, routes, or events.

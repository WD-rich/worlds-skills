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


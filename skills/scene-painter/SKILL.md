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

## v0.4 reusable visual contract

For new work, use [`../world-stage/references/visual-production-contract.v0.4.md`](../world-stage/references/visual-production-contract.v0.4.md) as the scene brief and acceptance baseline. The contract is deliberately provider-neutral, so the same scene can be produced by a checked-in map, Codex/local tooling, or a provider adapter without changing replay facts.

Before painting, freeze these fields in the scene brief:

- camera: `orthographic` or `top-down-2.5d`, one camera for map, routes, labels, shadows, and gameplay actors;
- composition: map-first workspace, readable lanes/roads, building mass, focal region, and a minimum 25% visibly traversable area;
- anchors: normalized region IDs, route endpoints, interactables, and an optional camera focus point;
- layers: ground, structures, route, occlusion, interactable, actor, label, and effects, in that order;
- budgets: source resolution, map aspect ratio, mobile crop behavior, and fallback map behavior.

The v0.4 map is a gameplay surface, not a poster. Keep its paths and landmarks legible at the default viewport before adding atmosphere, particles, or decorative signage. Place doors, kiosks, crossings, and event sites on explicit normalized anchors; never infer topology from a painted pixel or move an anchor merely to improve a screenshot.

### v0.4 production checks

1. **Scale test:** render the map with the intended gameplay sprite box and a 25%/50% zoom thumbnail. Roads, doorways, actor feet, and space labels must remain distinguishable.
2. **Lane test:** inspect the walkable mask and route overlay independently of the bitmap. A missing bitmap must still leave a usable deterministic grid and route graph.
3. **Camera test:** no region, route, or actor depends on a perspective change or a portrait crop. The map and gameplay sprites share one camera convention.
4. **Responsive test:** preserve normalized anchors when reframing to desktop and narrow viewports. The drawer may overlay the map on narrow screens, but the map must not gain horizontal overflow.
5. **Review test:** send the built stage through `stage-visual-qa` for `T0/world`, movement, dialogue, collapsed panel, narrow viewport, missing asset, and reduced-motion captures.

If a source image only satisfies concept art, keep it in a `concept` slot and produce a gameplay map layer or deterministic fallback separately. Record `artDebt` in the manifest instead of accepting a visually attractive image that cannot support navigation or actor scale.

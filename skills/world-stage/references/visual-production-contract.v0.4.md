# World Stage visual production contract v0.4

This contract is the reusable visual baseline for a replayable world stage. It is presentation-only: it may reorganize pixels and controls, but it cannot add, remove, or reinterpret spaces, actors, routes, resources, or events in the replay.

## Contract identity

Every visual slice declares:

```json
{
  "visualContract": "world-stage.v0.4",
  "style": "visuals/style.v0.4.json",
  "layout": "visuals/layout.v0.4.json",
  "animation": "visuals/animation-manifest.v0.4.json"
}
```

A contract version is immutable after review. A change to camera, actor scale, anchor conventions, panel geometry, or color semantics creates the next contract version. Asset revisions that preserve the contract can use a new asset-manifest version without changing replay data.

## Scene composition

- **Map first.** The map is the largest continuous surface. On a desktop target, the map receives at least 68% of the workspace width and remains useful when the context drawer is collapsed.
- **One context.** The default state shows one world, actor, or event context. A drawer explains the selected context; it does not turn every record into a card wall.
- **Stable camera.** Use a single orthographic or top-down 2.5D camera for the map, routes, space labels, shadows, and gameplay sprites. Do not mix a front-facing portrait camera into the map.
- **Readable lanes.** Declare the walkable lane/road region and keep it visually distinct from building mass. The review target is at least 25% visually readable traversable area in the initial scene.
- **Grounding.** Every gameplay actor has a feet or center anchor and a small ground shadow/ring. Labels and bubbles attach to the anchor, not to a variable image crop.
- **Quiet chrome.** HUD, timeline, and drawer use a restrained token palette. Highlight current event, active route, and changed resources with semantic colors; do not use glow as a substitute for hierarchy.

## Layout contract

`visuals/layout.v0.4.json` must declare the following presentation data:

- desktop target viewports and a map-to-drawer ratio;
- a drawer max width of 374 CSS px (or 30% of the workspace, whichever is smaller);
- a timeline safe area of at least 64 CSS px on desktop;
- narrow viewport behavior: the map remains the base layer, the drawer becomes an in-viewport overlay no wider than 92vw, and `document.documentElement.scrollWidth <= innerWidth`;
- safe-area padding for notches and browser UI;
- focus modes `world`, `actor`, and `event`, with exactly one default mode;
- a reduced-motion rule that removes animation only, never state or source text.

All map anchors, routes, and interactables remain normalized (`0..100` percent) so the same scene can be reframed without rewriting world facts.

## Asset roles

A single actor may have several presentation roles, each with an explicit slot:

| Role | Camera/use | Required treatment |
| --- | --- | --- |
| `gameplay` | map canvas | orthographic/3/4 silhouette, common scale, transparent bounds, feet/center anchor, ground shadow |
| `portrait` | drawer, list, dialogue detail | expressive front or bust portrait; never used as the map sprite |
| `avatar` | compact lists | cropped portrait or icon with an accessible name |
| `fallback` | offline/missing asset | deterministic silhouette at the same gameplay anchor and approximate scale |

Gameplay height is measured in scene pixels, not source image pixels. A v0.4 slice should target a consistent human gameplay height of roughly 52–76 scene px at the default zoom; drones and props declare their own category budget. A source portrait may be retained for the drawer while a separate gameplay asset is pending. If no gameplay asset exists, mark the actor with `artDebt: "gameplay-sprite"` and use the fallback silhouette; do not stretch a large portrait over the map.

## Semantic tokens

Style manifests should define tokens for at least:

- `surface`, `surfaceElevated`, `ink`, `mutedInk`, `line`;
- `accent`, `success`, `warning`, `danger`, `resourceDelta`;
- actor state colors for idle, walking, talking, selected, and unavailable;
- `motion.duration` and `motion.reduced`.

Token names stay stable across revisions. Values may change in a new style manifest, but a token cannot silently change meaning.

## Review matrix

A visual production run is accepted only after `stage-visual-qa` captures the same replay states at named viewports:

| State | Minimum visual proof |
| --- | --- |
| `T0/world` | map composition, resource summary, selected world context |
| `movement` | route cue, actor movement/arrival, readable feet anchor |
| `dialogue` | bubbles and dialogue dock do not cover actor or primary controls |
| `exchange/decision` | participants, event focus, semantic resource delta |
| `collapsed` | map, labels, and replay controls remain usable |
| `narrow` | drawer overlay, safe areas, no horizontal overflow, text fit |
| `missing-asset` | fallback actor/map plus visible diagnostic |
| `reduced-motion` | no motion, same state and source text |

The machine-readable report records `visualContract`, `commit`, `viewer`, `viewports`, `states`, `screenshots`, `checks`, `errors`, and `remainingRisks`. A screenshot can prove composition but cannot prove replay correctness; pair it with DOM/replay assertions.

## Extension procedure

To extend the visual system for a new world:

1. Keep the world kernel and replay fixtures unchanged.
2. Copy the v0.4 style, layout, and animation manifests to the next world-local version.
3. Fill the scene brief, camera, palette, lane ratio, anchors, actor roles, and budgets before generating art.
4. Produce map, gameplay sprites, portraits, and fallbacks through the asset pipeline; record provenance and hashes.
5. Build the stage and run the review matrix at desktop and narrow targets.
6. Promote the contract only when the visual report has no hard failures; retain failed captures as diagnostics.

Provider choice is outside this contract. A Codex/local/offline run and a provider-backed run must emit the same slots, anchors, tokens, and review report shape.

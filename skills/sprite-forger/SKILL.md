---
name: sprite-forger
description: Produce validated character visual assets, transparent spritesheets, animation metadata, and deterministic fallbacks.
---

# Sprite Forger

Use this skill when an actor needs a visual identity for a stage or viewer.

## Produce

- a stable actor-to-asset mapping;
- a transparent spritesheet or procedural fallback;
- frame dimensions, directions, animation names, anchor point, and scale metadata;
- review diagnostics for identity, background removal, frame alignment, and readability.

Keep visual assets separate from actor state. A failed image call must leave a usable fallback and must not remove the actor from the world. Do not encode hidden runtime facts in an image prompt.

## Offline stage path

When the stage is running in offline mode, do not call `model-bridge` or an image provider. Reuse the approved file in `visuals/asset-manifest.v0.2.json`, verify its hash and transparent bounds, then emit the actor mapping and `animation-manifest.v0.2.json`. If a bitmap is unavailable, keep the same actor ID and use a deterministic procedural silhouette with the declared feet/center anchor. Idle, walk, talk, and interact may be transform based; the runtime must expose the fallback in its diagnostics.

The output is presentation data only. Location, activity, inventory, needs, relationships, and event history continue to come from the replay frame consumed by `world-stage`.

For the v0.3 stage, include a stable anchor (`feet` for people, `center` for drones or floating objects), a readable fallback silhouette, and an action mapping for `idle`, `walk`, `talk`, and `interact`. The viewer may dim inactive actors and highlight current event participants, but it must keep the actor's accessible name and replay-derived location when an image is missing.

## v0.4 gameplay/portrait contract

Use [`../world-stage/references/visual-production-contract.v0.4.md`](../world-stage/references/visual-production-contract.v0.4.md) for the shared role and review rules. A v0.4 actor never has one ambiguous "character image" slot. Declare the role for every asset:

- `gameplay`: orthographic or 3/4 map sprite with a common camera, transparent bounds, feet/center anchor, and a small ground shadow or ring;
- `portrait`: expressive front/bust art for the context drawer, actor list, and detail dialogue;
- `avatar`: compact list crop with the actor's accessible name;
- `fallback`: deterministic silhouette used for offline and missing-art paths.

Keep `portrait` and `gameplay` separate even when they depict the same actor. The stage must not stretch a large front-facing portrait into the map: that creates a camera and scale mismatch that makes buildings, roads, and people read as different worlds. A v0.4 human gameplay sprite targets roughly 52–76 scene px from feet to head at the default zoom; drones and props declare a category-specific height. Store the target in the animation manifest rather than relying on source bitmap dimensions.

Every gameplay asset declares:

```json
{
  "role": "gameplay",
  "anchor": "feet",
  "frameSize": [68, 104],
  "contentBounds": [8, 4, 52, 94],
  "shadow": { "kind": "ellipse", "offset": [0, 2], "size": [26, 8] },
  "actions": ["idle", "walk", "talk", "interact"]
}
```

`frameSize` is a layout budget, not a forced source resize. The transparent content and anchor must be reviewed against a checkerboard and a map landmark. If an actor has only a portrait, emit `artDebt: "gameplay-sprite"`, keep the portrait in its panel slot, and use the fallback silhouette on the map until a gameplay asset is approved.

### v0.4 consistency checks

1. Compare at least three gameplay actors side by side at the same zoom. Their feet must sit on the same ground plane and their labels must use the same offset rule.
2. Flip or re-export directional frames consistently; do not mirror a portrait with asymmetric props unless the manifest permits it.
3. Check idle, walk, talk, and interact at normal speed and `prefers-reduced-motion`. Reduced motion may freeze frames but cannot hide the actor or its accessible name.
4. Verify transparent bounds, hashes, role, anchor, and fallback in the animation/asset manifest. A failed provider call leaves the actor ID and fallback in place.
5. Capture map and drawer states through `stage-visual-qa`; review gameplay sprites on the map and portraits only in the drawer/list/detail surfaces.

Never encode needs, inventory, relationships, location, or event outcomes in a sprite. Those values remain replay-derived data consumed by `world-stage`.

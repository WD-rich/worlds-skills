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


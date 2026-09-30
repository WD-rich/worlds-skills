# World Stage visual production contract v0.5

This is the reusable production contract for a screenshot-quality world stage. It replaces ambiguous directions such as “make it more polished” with an explicit visual profile, asset roles, scene composition, and evidence matrix.

## Required identity

```json
{
  "contract": "world-stage.v0.5",
  "visualProfile": "cinematic-2.5d",
  "style": "visuals/style.v0.5.cinematic.json",
  "layout": "visuals/layout.v0.5.cinematic.json",
  "animation": "visuals/animation-manifest.v0.5.cinematic.json"
}
```

Allowed profiles are `cinematic-2.5d` and `pixel-sim`. A world chooses one at the scene boundary. It is invalid to use a cinematic map with pixel-sim actor scale or a pixel-sim tile contract with painterly, perspective-dependent landmarks.

## Cinematic profile acceptance

The reference target is a complete scene, not a dashboard screenshot:

- the settlement or landscape fills the frame and keeps a clear traversable focal area;
- the camera is one stable orthographic 3/4 view;
- people are small, grounded, and visibly part of the same scene lighting;
- one selected person or event can open a compact context card without hiding the map;
- a short speech bubble, resource change, and bottom timeline establish the current moment;
- interface text is crisp runtime DOM text; generated art contains no fake UI.

The default desktop target is 1440×900: map 70–80% of the workspace, context card 280–340px, timeline 56–84px, gameplay human height 64–112 native scene px. The narrow target is 390×844: map remains the base layer, the card becomes an in-viewport drawer, and horizontal overflow is zero.

## Pixel-sim profile acceptance

The stage declares its internal pixel resolution, tile size, palette, sprite directions, and integer scale. Roads, doors, collision, interaction points, and actor feet align to the grid. The UI uses compact pixel frames and a short dialogue box; no large translucent dashboard layer is allowed by default.

## Role and fallback rules

Every actor asset declares `gameplay`, `portrait`, `avatar`, or `fallback`. A gameplay role has a frame size, anchor, action set, transparent bounds, and shadow. A portrait role can be expressive and front-facing, but it never renders into the map canvas. Missing gameplay art uses a deterministic fallback and records `artDebt` in the manifest.

## Evidence required

`stage-visual-qa` must capture the same fixed states at target viewports and write a report with `visualProfile`, `contract`, `commit`, `screenshots`, `replayChecks`, `layoutChecks`, `assetChecks`, `errors`, and `remainingRisks`. A profile cannot be promoted from a single hero screenshot.

## Extension rule

New worlds copy the selected profile contracts and replace only world facts, anchors, assets, and palette values. Changing camera, map ratio, actor height, tile size, drawer geometry, or profile increments the contract version and creates a new baseline. Provider keys remain outside the Skill and are never required for the offline path.

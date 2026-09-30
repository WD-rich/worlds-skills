# World Stage visual profiles v0.5

v0.5 removes the vague goal of “make the UI better”. Every world must select one visual profile before scene or sprite production. The profile controls camera, asset roles, layout, palette, interaction density, and the screenshot checks. World facts and replay records remain shared by both profiles.

## Profile A: cinematic-2.5d

This is the recommended profile for `ashfall-circuit` and for worlds that need the reference result: a readable settlement, small grounded characters, a restrained HUD, a focused context card, and a timeline that feels like a living scene.

### Composition

- Use one orthographic 3/4 camera for the map, structures, roads, actors, shadows, and labels.
- Keep the map between 70% and 80% of the desktop workspace. A right context card may use 280–340 CSS px; it cannot become a dashboard wall.
- Leave a clear plaza, road, or courtyard as the visual focus. At least 30% of the initial frame must read as traversable ground.
- Use three depth bands: foreground ground and props, midground actors and interaction points, background structures and skyline. Do not paste a flat front portrait into a deeper layer.
- Use a slim utility rail only when it carries map, inventory, journal, or event actions. The bottom timeline stays visible and quiet.

### Material and lighting

- Use warm dust, oxidized metal, cloth, and practical lamps as the base material language. Teal/cyan is reserved for water, signal, or selected state; amber marks time and resources; coral marks danger.
- Lighting comes from one declared direction. Actors need a contact shadow or foot ellipse. Glow is an event cue, never the primary hierarchy.
- Generated scene art contains no interface text, speech bubbles, logos, or fake buttons. The runtime owns all readable text.

### Actor and interaction scale

- Gameplay actors are small 3/4 figures with a shared ground plane, 48–88 native scene px from feet to head at default zoom. A drone or prop declares its own smaller budget.
- A portrait, bust, or full-body front illustration is a `portrait` role. It appears in the context card, actor list, or dialogue detail only.
- Selecting an actor gives one clear card: identity, location, current activity, one primary action, and at most three supporting values. The map remains visible behind it.
- A route preview, arrival marker, dialogue bubble, and resource delta each use a different semantic cue. Do not stack several competing glows on one actor.

### Required assets

```text
scene-bg              # wide map image or layered scene
walkable-mask         # independent collision/navigation data
props-and-occlusion   # doors, stalls, roofs, lamps, depth masks
gameplay-sprite-set   # common camera, feet/center anchor, actions
portrait-set          # drawer/list/detail only
hud-icons             # map, inventory, journal, event, follow
fallbacks             # deterministic scene and actor fallback
```

## Profile B: pixel-sim

Use this profile when the world is meant to feel like a small life simulation. It uses a deliberately low-resolution pixel surface and tile rules rather than painterly materials. The profile is inspired by the readable rhythm of farming and town simulation games without copying a specific game’s art, characters, or UI.

### Composition

- Define a logical tile size (16, 24, or 32 px) and an internal canvas resolution before drawing the map. Scale by integer factors where possible.
- Store walkability, doors, collision, interaction points, and region IDs in a tile/grid manifest. A background bitmap cannot define topology.
- Use a compact scene HUD: day/clock, weather or condition, resource/tool row, dialogue box, and a small map or journal panel. Avoid a glass dashboard over every tile.
- Keep the map readable at 1× and at the smallest target viewport. If a tile label needs a tooltip to be understood, the tile design is too dense.

### Sprite and UI rules

- Actors use 4-direction or 8-direction pixel frames with an explicit idle, walk, talk, and interact state. Feet align to the same tile baseline.
- Dialogue uses a pixel frame with a nameplate and a short, wrapped message. Portraits may sit beside the dialogue box, but they do not replace the gameplay sprite.
- Use hard pixel edges, a fixed palette, and integer scaling. Do not mix painterly gradients or large translucent cards into the default scene.

## Shared gates

Both profiles must pass these gates before a profile is promoted:

1. `visualProfile` is declared in the style and layout manifests; there is one profile per world slice.
2. Map, gameplay sprite, portrait, avatar, and fallback roles are separate in the asset manifest.
3. The first frame, movement frame, dialogue frame, exchange/decision frame, collapsed frame, narrow frame, missing-asset frame, and reduced-motion frame are captured.
4. Replay values, actor locations, routes, and event IDs match the world kernel. Visual polish cannot rewrite facts.
5. Offline mode works without a model key or network call; a provider is an optional asset source.
6. A hard failure is reported when a profile rule is violated. The stage may ship with declared `artDebt`, but it may not quietly substitute a portrait for a gameplay sprite.

## Profile declaration

Every v0.5 scene begins with a small declaration like this:

```json
{
  "visualProfile": "cinematic-2.5d",
  "contract": "world-stage.v0.5",
  "style": "style.v0.5.cinematic.json",
  "layout": "layout.v0.5.cinematic.json",
  "animationManifest": "animation-manifest.v0.5.cinematic.json"
}
```

To switch to `pixel-sim`, copy the contracts and assets into the pixel profile; do not change the replay facts or reuse the cinematic camera assumptions. A profile switch is a visual contract change and requires a new screenshot baseline.

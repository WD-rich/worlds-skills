---
name: stage-ui-director
description: Design a map-first, state-driven UI for replayable world stages, including focus modes, contextual panels, dialogue, responsive layout, keyboard focus, and visual hierarchy.
---

# Stage UI Director

Use this skill when a world viewer feels like a dashboard, when map content is hidden by panels, or when a new stage needs a consistent interaction hierarchy. It applies to DOM/Canvas stages and does not require a game engine or an external model.

## Outcome

The viewer should answer, without a manual:

1. What is happening now?
2. Which actor, space, or event deserves attention?
3. What will change when the next replay step runs?

Make the map the primary surface. Panels explain the selected context; they do not compete with the map by showing every record at once.

## Inputs

- current viewer screenshots at target viewports;
- the stage's replay states and event types;
- `visuals/style*.json`, `visuals/layout*.json`, and the asset/animation manifests;
- accessibility labels and existing keyboard/mouse actions.

## Profile gate

Before changing components, consume the production plan from `world-production-director` and lock one visual profile. The profile decides the camera, map coverage, actor scale, panel geometry, dialogue treatment, and viewport budgets. Use [`../world-stage/references/visual-profiles.v0.5.md`](../world-stage/references/visual-profiles.v0.5.md); do not substitute a generic “polished” target. UI work may clarify replay facts, but it cannot add world entities or hide unresolved asset debt.

## Workflow

1. Capture the current stage at its target desktop and narrow viewports before editing.
2. Inventory states: initial, movement, dialogue, exchange, decision, pause, empty, error, branch, and reduced-motion.
3. Select one hierarchy: world overview, actor focus, or event focus. Only one contextual panel is open by default.
4. Write or update a layout contract with map ratio, panel width, safe-area padding, focus modes, and component purposes.
5. Define visual tokens for surfaces, text levels, highlights, warnings, resource changes, and motion.
6. Wire each visible state to the replay frame and event source. Do not duplicate world rules in the UI.
7. Check long names, long event text, large resource values, panel collapse, keyboard focus, and narrow layout.
8. Capture the same states again and report the remaining visual risks.

## Required interaction model

- `world`: chapter, current event, resource summary, and nearby spaces;
- `actor`: identity, location, activity, needs, inventory, relationships, and history;
- `event`: event summary, participants, space, resource delta, and source record;
- selecting a record may move the replay cursor, but never edits the record;
- keyboard shortcuts must have visible focus equivalents and must not interfere with form fields;
- panel collapse must leave the map and replay controls usable.

## Quality rules

- Do not use a wall of stat cards as the default composition.
- Hide inactive labels when they make the scene unreadable; retain accessible names in the DOM.
- Keep dialogue bubbles and event cues clear of the actor they describe and of primary controls.
- Use stable anchors and flow-based containers; never rely on one fixed screen size.
- Treat `prefers-reduced-motion` as a presentation change only. Preserve state, text, and source links.
- Keep the offline path functional. A missing visual asset gets a diagnostic and fallback, not a missing actor.

## v0.5 reusable visual contract

For a visual rebuild, apply [`../world-stage/references/visual-production-contract.v0.5.md`](../world-stage/references/visual-production-contract.v0.5.md) before changing components. This keeps the visual direction reusable across worlds and prevents a one-off screenshot from becoming an undocumented layout fork.

The v0.5 hierarchy is:

1. **Map and actors:** the selected profile's map coverage is the desktop budget (at least 78% for `cinematic-2.5d`) and uses one declared camera. Gameplay sprites are small, grounded, and readable against lanes and building mass.
2. **Event signal:** the current event, route, dialogue bubble, or resource delta receives a restrained semantic highlight. A highlight must point to replay data; it cannot invent a state.
3. **Context drawer:** one world, actor, or event context is open by default. Portraits belong here; a large portrait must never be placed directly on the map as a gameplay sprite.
4. **Replay controls:** timeline and pause/step controls remain reachable when the drawer collapses or becomes a narrow-screen overlay.

### v0.5 layout rules

Declare the selected profile, map ratio, drawer max width, timeline safe area, target viewports, focus modes, and narrow-screen behavior in the versioned layout manifest. For `cinematic-2.5d`, use the profile's map coverage and context width; for `pixel-sim`, preserve the internal canvas and integer scaling. At narrow widths the panel overlays the map inside the profile budget, uses safe-area padding, and must satisfy:

```js
document.documentElement.scrollWidth <= window.innerWidth
document.body.scrollWidth <= window.innerWidth
```

Keep labels, bubbles, route cues, and controls in flow-based or normalized containers. When the panel is collapsed, the map, space labels, actor selection, and replay controls still need a visible keyboard/mouse/touch path. Avoid introducing a second navigation system just for mobile.

### v0.5 acceptance sequence

1. Capture the existing stage at desktop and narrow target viewports.
2. Update the style/layout contracts and visual roles before replacing art.
3. Wire `world`, `actor`, and `event` focus to replay frame data; verify long names, long event text, resource values, and missing assets.
4. Capture the same replay state matrix with `stage-visual-qa`, including movement, dialogue, collapsed, missing-asset, and reduced-motion states.
5. Promote the visual contract only when map dominance, actor grounding, bubble/label overlap, text fit, keyboard focus, and narrow overflow checks pass. Keep unresolved art debt in the report rather than hiding it with a screenshot crop.

## Deliverable

Return the changed files, the layout/style contract version, asset role changes, states covered, target viewport captures, overlap/text-fit findings, accessibility checks, and known limitations. A polished screenshot without a replay-state check is incomplete.

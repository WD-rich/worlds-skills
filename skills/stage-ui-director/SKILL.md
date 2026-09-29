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

## Deliverable

Return the changed files, the layout/style contract, states covered, target viewport captures, overlap/text-fit findings, accessibility checks, and known limitations. A polished screenshot without a replay-state check is incomplete.

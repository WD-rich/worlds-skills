---
name: stage-visual-qa
description: Capture and diagnose replayable world-stage states for visual regression, including viewport screenshots, DOM/replay consistency, overlap, text fit, and offline asset checks.
---

# Stage Visual QA

Use this skill after a stage layout, scene, asset, animation, or interaction change. It proves that the viewer looks and behaves correctly at named replay ticks; it does not replace world audit or replay validation.

## Profile gate

Read the production plan and the selected profile before capturing evidence. Every report must include `visualProfile` and separate `technical`, `visual`, `interaction`, and `humanReview` results. Passing DOM assertions, a copied screenshot, or a concept image never promotes a build to release evidence.

## Inputs

- a built viewer directory and its local URL;
- a world workspace and replay report;
- target viewport/state pairs, for example `1440x900:T0`, `1440x900:T3`, `1280x800:T5`, and `390x844:T3`;
- expected focus mode, selected actor/record, and panel state for each pair.
- the selected `visualProfile` and its profile JSON.

## Pass

1. Run the world audit and deterministic replay first. Stop if the facts or source references fail.
2. Start the viewer from the generated directory and record the run ID, URL, commit, and viewport list.
3. Capture the initial state and each required tick through the real controls. Do not validate only by changing internal variables.
4. For every capture, record the visible tick, focus mode, selected context, resource values, event record ID, console errors, network errors, and asset errors.
5. Inspect the pixels and DOM together. Check map dominance, actor readability, bubble/label/panel overlap, text truncation, focus state, replay controls, and narrow-window behavior.
6. Repeat the changed state after the fix. Keep the failing screenshot and diagnostic if a check remains unresolved.

## Minimum state matrix

| State | Evidence |
| --- | --- |
| T0 / world | map composition, resource summary, world panel |
| movement tick | route, walking state, arrival feedback |
| dialogue tick | stopped actors, bubbles, dialogue dock, sources |
| exchange or decision | participants, resource delta, event focus |
| collapsed panel | usable map, labels, and replay controls |
| narrow viewport | drawer behavior, text fit, safe areas |
| missing asset | fallback actor/map and visible diagnostic |

## Hard failures

- blank or mostly blank stage;
- a displayed tick or resource value disagrees with the replay frame;
- a missing asset silently removes an actor or space;
- a primary label, dialogue bubble, or focus panel covers the actor/event it explains;
- long text or resource values are clipped so the meaning changes;
- a focus mode has no keyboard-accessible equivalent;
- offline mode requests an external model, image, audio, or telemetry service.

## Report

Write a machine-readable report containing `runId`, `commit`, `viewer`, `visualProfile`, `contract`, `viewports`, `states`, `screenshots`, `checks`, `replayChecks`, `layoutChecks`, `assetChecks`, `technical`, `visual`, `interaction`, `humanReview`, `errors`, and `remainingRisks`. Each screenshot entry must include the viewport, replay tick, focus mode, and artifact path. Passing DOM assertions alone does not establish visual quality; passing screenshots alone does not establish state correctness.

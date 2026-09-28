---
name: agent-cognition
description: Build bounded perception, needs, emotion, action menus, and candidate decisions for world actors.
---

# Agent Cognition

Use this skill before `life-director` needs an actor decision.

## Produce

- a visibility-filtered `Perception` with location, objects, actors, recent changes, and uncertainty;
- updated needs and emotion deltas with explainable causes;
- a capability- and context-aware `ActionMenu`;
- ranked `ActionIntent` candidates with evidence, confidence, and a provider record.

Keep hidden information out of perception. Apply deterministic tie-breaking when a rule provider is used. A candidate is not an executed action; legality, cost, occupancy, duration, and resource checks happen in the runtime kernel.


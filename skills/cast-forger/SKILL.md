---
name: cast-forger
description: Create validated actor profiles, relationships, capabilities, inventories, and initial runtime state from a WorldSeed and SpaceGraph.
---

# Cast Forger

Use this skill when a world needs an initial cast or a deliberate character revision.

## Produce

Create separate `ActorProfile`, `ActorState`, relationship-edge, and inventory records. Profiles include identity, role, values, motivations, constraints, knowledge boundaries, voice, and visual cues. State includes location, needs, emotion, activity, availability, inventory, and memory references. Every actor declares capabilities and an initial actionable inventory.

Validate that starting locations exist, capacities are respected, relationship targets resolve, and hidden facts are marked. Do not decide per-tick actions, generate final images, invent facts outside the seed, or write directly to a runtime store.

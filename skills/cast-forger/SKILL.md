---
name: cast-forger
description: Create validated character profiles, relationships, motivations, and initial runtime state from a WorldSeed and spatial artifact.
---

# Cast Forger

Use this skill when a world needs an initial cast or when a user requests a deliberate character revision.

## Produce

Create `CharacterProfile` records with identity, role, values, motivations, constraints, relationships, and communication style. Create separate `CharacterState` records for location, needs, mood, activity, and availability.

Keep stable profile data separate from mutable state. Do not decide per-tick actions, invent hidden facts outside the world seed, or write directly to a runtime store.

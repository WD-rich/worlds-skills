---
name: life-director
description: Advance a world by one or more validated time steps and return action intents, state transitions, dialogue, and world events.
---

# Life Director

Use this skill when a world is running and characters need to perceive context, choose actions, interact, move, or talk.

## Rules

- Read a `WorldSnapshot`; never mutate it in place.
- Build a bounded perception for each eligible character.
- Return schema-validated `ActionIntent`, `WorldEvent`, and state transition records.
- Commit changes through the engine's event and snapshot interfaces.
- Make model calls replaceable with a rule-based or test provider.

The deterministic provider uses the fixed priority order `survival > repair > movement > social`; ties are resolved by ascending actor ID. Reject actions that violate location, availability, duration, capability, capacity, resource, or world rules. Every committed event must include explicit before/after values, the rule version, the decision rule, the seed or draw index when randomness is used, and rejected intents. Preserve enough metadata to replay the decision without relying on a later model response.

---
name: life-director
description: Advance a world through validated time steps, coordinating cognition, actions, dialogue, memory, and event recording.
---

# Life Director

Use this skill when a world is running and characters need to perceive context, choose actions, interact, move, talk, reflect, or survive a day/night transition.

## Rules

- read an immutable `WorldSnapshot` and build bounded perceptions through `agent-cognition`;
- request candidate intents, action menus, and dialogue sessions from their dedicated skills;
- validate location, availability, capability, duration, capacity, resource, relationship, and world rules in the Kernel;
- apply accepted transitions transactionally and append records with before/after, rule version, cause, actor IDs, provider, seed/draw index, and rejected intents;
- run needs/emotion decay, memory evaluation, reflection, daily summaries, and scene transitions at configured boundaries;
- make model calls replaceable with deterministic, Codex, local, or HTTP providers.

The deterministic provider uses `survival > repair > movement > social`; ties use ascending actor ID. A model cannot write a state file or skip validation. Preserve enough metadata to replay a decision without a later model response.

---
name: dialogue-director
description: Start, continue, reconcile, and close character dialogue sessions with auditable social and emotional effects.
---

# Dialogue Director

Use this skill when actors meet, exchange messages, negotiate, argue, reflect, or when a user opens a sandbox conversation.

## Rules

- create a session with participants, location, trigger, intent, and context boundary;
- generate bounded turns that respect each actor's voice, knowledge, relationship, and current emotion;
- validate turn schema and separate spoken text, inner thought, and narrator text;
- emit relationship, emotion, memory, and action effects as explicit candidate events;
- close or suspend sessions when actors move, become unavailable, or exceed turn/time limits.

Sandbox turns are not world facts until explicitly committed through `world-console`.


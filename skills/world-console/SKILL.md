---
name: world-console
description: Inspect, converse, intervene in, branch, and replay a running world through auditable commands.
---

# World Console

Use this skill when a user wants to inspect a world, talk to a character, broadcast an event, edit an allowed field, create a branch, or replay history.

## Commands

- read world, space, actor, resource, relation, memory, event, timeline, and job views;
- start or continue a formal dialogue session;
- open a sandbox conversation that is not a world fact;
- broadcast or whisper an intervention with scope, author, expiry, and reason;
- request an allowed profile/state edit through validation;
- create, switch, compare, or replay a timeline.

Prefer read-only inspection. Every mutation becomes an explicit command with actor, cause, before/after, authorization, and audit record. Never bypass state validation or edit a snapshot/event file directly. Sandbox output must be clearly separated until the user explicitly commits an outcome.

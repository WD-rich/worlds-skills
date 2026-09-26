---
name: world-console
description: Inspect, converse with, intervene in, branch, and replay a running world through auditable commands.
---

# World Console

Use this skill when a user wants to inspect a world, talk to a character, broadcast an event, edit an allowed profile field, create a branch, or replay history.

## Rules

Prefer read-only inspection. Every mutation must become an explicit command with an audit record and a resulting event. Never bypass state validation or edit a snapshot file directly. Sandbox conversations must be clearly separated from world facts unless the user explicitly commits an outcome.

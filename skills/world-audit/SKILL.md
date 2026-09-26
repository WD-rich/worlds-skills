---
name: world-audit
description: Check a worlds-skills workspace for schema, reference, transition, replay, and operational errors before or after a workflow.
---

# World Audit

Use this skill before committing generated artifacts, before running a new world, and after a replay or recovery operation.

## Check

- schema versions and required fields;
- references between spaces, actors, actions, and records;
- legal locations, occupancy, capacity, and time transitions;
- append-only record integrity and snapshot hashes;
- deterministic replay from the initial seed;
- credential exposure and malformed provider output.

Return the shared result envelope with machine-readable diagnostics. An audit may suggest a repair, but it must not silently modify runtime state or rewrite records.

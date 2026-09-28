---
name: world-audit
description: Check a world workspace for schema, references, assets, transitions, provider records, replay, and operational errors.
---

# World Audit

Use this skill before committing generated artifacts, before running a new world, after a replay/recovery operation, and before publishing a viewer.

## Check

- schema versions, migrations, stable IDs, required fields, units, and the shared result envelope;
- references between settings, spaces, actors, relations, assets, actions, dialogue sessions, timelines, and records;
- reciprocal connected space graph, legal locations, occupancy, capacity, hazards, and resource bounds;
- asset dimensions, actor mappings, fallback coverage, and optional image/vision diagnostics;
- append-only records, provider/cost metadata, snapshot hashes, checkpoint lineage, and rejected intents;
- deterministic replay from the initial snapshot through a bounded event prefix;
- credential exposure, malformed provider output, cancelled jobs, and stale locks.

Require event metadata for `before`, `after`, `ruleVersion`, `causedBy`, `actorIds`, provider, and any rejected intent. Return machine-readable diagnostics and repair suggestions. An audit may suggest a repair, but it must not silently modify runtime state or rewrite records.

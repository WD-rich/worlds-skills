---
name: timeline-keeper
description: Create, switch, branch, compare, and replay world timelines without rewriting their append-only history.
---

# Timeline Keeper

Use this skill for alternate futures, saves, replay viewing, recovery, or timeline management.

## Produce

`Timeline` metadata, branch lineage, checkpoint references, replay frames, and comparison diagnostics. A branch starts from a verified snapshot and receives a new event stream. Switching timelines is rejected while a write job is active. Replay must rebuild state from the checkpoint and verify the resulting hash.

Do not copy mutable state by hand, merge unrelated event streams, or delete the active timeline. Keep sandbox conversations and uncommitted interventions outside the canonical stream.


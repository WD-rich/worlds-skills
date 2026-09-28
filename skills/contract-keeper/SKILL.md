---
name: contract-keeper
description: Define, migrate, and validate versioned world contracts shared by content, runtime, providers, and viewers.
---

# Contract Keeper

Use this skill when a world object, event, snapshot, provider result, asset, or workspace layout needs a stable schema or a version upgrade.

## Produce

- versioned schemas for `WorldSeed`, `SpaceGraph`, `ActorProfile`, `ActorState`, `ActionIntent`, `DialogueSession`, `AssetRef`, `Timeline`, `WorldRecord`, `WorldSnapshot`, `Job`, and `Diagnostic`;
- deterministic IDs and reference rules;
- migrations that preserve old records and report lossy changes;
- a shared result envelope with `status`, `artifacts`, `diagnostics`, and `next`.

Reject unknown runtime facts, dangling references, ambiguous units, and provider-specific fields in core objects. Never migrate an append-only event by rewriting its history; create a new version or a derived view instead.


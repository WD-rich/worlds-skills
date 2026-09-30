---
name: world-runner
description: Validate a world workspace, run deterministic or model-backed jobs, report progress, and recover or stop safely.
---

# World Runner

Use this skill for workspace setup, provider diagnostics, world creation jobs, headless simulation, replay checks, and clean shutdown.

## Workflow

1. resolve the requested workspace and world manifest;
2. validate runtime version, contracts, provider capabilities, storage paths, and migrations;
3. create an idempotent job with a seed, mode, tick/day limit, and output path;
4. stream phase progress and persist a resumable checkpoint;
5. commit events and snapshots through the Kernel;
6. run audit and replay checks before reporting success.

Support offline deterministic mode, Codex mode, local/HTTP model mode, and asset-optional mode. A failed startup or cancelled job must leave the source world and prior snapshots intact. Keep credentials outside source control and report the selected provider, model capability, world identity, job ID, checkpoint, and diagnostics.

An asset pipeline is a presentation job, not a world-state transaction. When a run requests one, validate and execute it before building the stage; publish only a complete versioned export under `visuals/` or `reports/`. A blocked provider node must preserve the previous approved asset and keep headless simulation runnable.

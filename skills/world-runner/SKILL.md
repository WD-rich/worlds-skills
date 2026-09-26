---
name: world-runner
description: Validate a worlds-skills project, prepare providers and storage, and run or stop its headless workflows.
---

# World Runner

Use this skill for setup, diagnostics, local execution, replay jobs, and clean shutdown.

## Rules

Validate environment, contracts, provider capabilities, storage paths, and migration state before starting. Keep provider credentials outside source control. Report the exact command, selected provider, world identity, and output location. A failed startup must leave the source world and prior snapshots intact.

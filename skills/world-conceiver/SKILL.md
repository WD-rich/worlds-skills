---
name: world-conceiver
description: Turn a user's world premise into a validated, provider-neutral WorldSeed for later construction and simulation.
---

# World Conceiver

Use this skill when a user wants to define a new fictional world or revise its foundational rules.

## Produce

Create a `WorldSeed` containing:

- identity, premise, tone, language, and content boundaries;
- social and physical rules;
- time model and cycle settings;
- location and character drafts;
- open questions and assumptions.

Keep the result structured and deterministic for a supplied seed. Do not generate image files, runtime events, database writes, or unvalidated provider-specific fields. Validate the result against the shared contracts before handing it to another skill.

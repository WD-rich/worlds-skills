---
name: world-conceiver
description: Turn a user's world premise into a validated, provider-neutral WorldSeed for later construction and simulation.
---

# World Conceiver

Use this skill when a user wants to define a new fictional world or revise its foundational rules.

## Produce

Create a `WorldSeed` containing fixed, machine-readable fields:

- identity, premise, tone, language, and content boundaries;
- social and physical rules;
- time model and cycle settings;
- scarce resources with units, bounds, and production or consumption rules;
- location and character drafts;
- open questions and assumptions.

Keep the result structured and deterministic for a supplied seed. Free prose may explain a field, but it cannot become a runtime fact by itself. Do not generate image files, runtime events, database writes, or unvalidated provider-specific fields. Validate the result against the shared contracts before handing it to another skill.

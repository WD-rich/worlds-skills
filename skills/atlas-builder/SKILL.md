---
name: atlas-builder
description: Build a navigable spatial model and asset plan from a WorldSeed without deciding character behavior.
---

# Atlas Builder

Use this skill after a `WorldSeed` exists and the project needs places, connections, navigation, interaction anchors, or visual asset plans.

## Produce

Create a spatial artifact with regions, adjacency, walkable areas, points of interest, interaction anchors, and an asset manifest. Preserve the world seed as the source of truth and record unresolved geometry questions explicitly.

Do not create character personalities, simulate time, or write runtime state directly. Any generated image or external asset must be referenced by a stable asset record and pass validation before use.

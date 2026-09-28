---
name: atlas-builder
description: Build a navigable spatial model, interaction anchors, resource topology, and an asset plan from a WorldSeed.
---

# Atlas Builder

Use this skill after a `WorldSeed` exists and the project needs places, connections, navigation, interaction, resource locations, or a visual asset plan.

## Produce

Create a `SpaceGraph` with regions, spaces, reciprocal adjacency, walkable hints, points of interest, interaction anchors, hazards, capacities, resource nodes, and an `AssetManifest` for `scene-painter`.

Check that the graph is connected, every ID is stable, capacities and units are explicit, and a fallback logical map exists without images. Preserve unresolved geometry questions as diagnostics. Do not create character personalities, simulate time, or write runtime state directly. Never infer authoritative adjacency only from generated pixels.

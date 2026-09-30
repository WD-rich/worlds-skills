---
name: asset-pipeline-director
description: Design and validate repeatable, provider-neutral game asset pipelines from a brief to reviewed exports, with offline fallbacks, provenance, versioning, and engine-ready budgets.
---

# Asset Pipeline Director

Use this skill when a world needs more than a single generated image: map layers, props, characters, materials, animation clips, 3D meshes, LODs, or a reusable workflow that can run again in a game project. It provides the Atlas-style graph and production controls while keeping Codex as the default planner and keeping the world kernel independent of any asset provider.

## Core idea

Treat an asset workflow as a versioned graph, not a prompt:

```text
brief → concept/reference → generate or import → process → optimize → export → review
```

Every node has typed inputs and outputs, a declared capability, a provider, fixed settings, and a provenance record. The graph may use an Atlas adapter, an image/3D provider, Codex, or a local deterministic step. Replacing a provider must not change the downstream contract.

## Use it when

- an asset must be generated consistently for several spaces, actors, or variants;
- a prompt-to-image result must become a transparent sprite, GLB, FBX, USD, or engine-ready material;
- the team needs triangle, texture, atlas, LOD, rig, or file-size budgets;
- a workflow should be branched, reviewed, rerun, published, or called later as an API;
- the current visual layer needs a controlled upgrade without changing replay facts.

Do not use it to create actor state, mutate `runtime/state.json`, append events, or decide authoritative world rules.

## Inputs

- an approved `WorldSeed`, `SpaceGraph`, `ActorProfile`, or scene brief;
- a style guide or visual contract with palette, camera, silhouette, material, and consistency constraints;
- target platform budgets and export formats;
- optional provider credentials supplied through the environment, never through world files;
- the contract in [`references/asset-pipeline-contract.md`](references/asset-pipeline-contract.md).
- when adding a provider adapter, read [`references/provider-adapters.md`](references/provider-adapters.md) and keep credentials/provenance out of canonical world data.

## Workflow

1. **Define the brief.** Record purpose, subject, style, reference IDs, allowed variation, target engine, and acceptance checks.
2. **Choose a graph.** Select the smallest node chain that can produce the required output. Typical branches are concept → image → sprite, concept → image-to-3D → optimize → texture → export, and scene brief → map layers → masks → review.
3. **Assign providers.** Let `model-bridge` choose Codex for reasoning/orchestration, a local rule for deterministic transforms, or an external image/3D provider for a missing capability. Record capability, provider, model, and fallback for every node.
4. **Freeze production settings.** Set seed, resolution, triangle/texture/LOD targets, anchor convention, color space, and output format before running. A budget belongs in the node settings, not only in prose.
5. **Run with checkpoints.** Hash every input and output, preserve successful intermediates, and write a node result even when a provider fails. A failed optional node must leave a usable checked-in or procedural fallback.
6. **Review the artifact.** Check identity and style consistency, transparent bounds, anchor alignment, topology, UVs, materials, LODs, file size, license/provenance, and compatibility with `scene-painter`, `sprite-forger`, and `world-stage`.
7. **Publish the manifest.** Emit versioned `AssetRef` entries and a pipeline report. The manifest is presentation data; it may be consumed by a viewer but cannot alter a replay frame.

## Offline path

When no external provider is configured, run the same graph with `checked-in`, `procedural`, or `copy` nodes. The offline result must still contain:

- stable asset IDs and hashes;
- an explicit fallback marker;
- normalized anchors and dimensions;
- the same output slot names as the provider-backed path;
- diagnostics stating which generation steps were skipped.

This makes the workflow testable in CI and lets Codex improve the graph before any model credits are spent.

## Local runner

Use the repository entrypoint to check or execute a pipeline without making provider calls:

```bash
node tools/asset-pipeline.mjs visuals/pipeline.v0.1.json \
  --root /path/to/world --mode validate
node tools/asset-pipeline.mjs visuals/pipeline.v0.1.json \
  --root /path/to/world --mode plan
node tools/asset-pipeline.mjs visuals/pipeline.v0.1.json \
  --root /path/to/world --mode run --out visuals/exports/pack-v1
```

`validate` checks graph structure and slot references. `plan` verifies input files and shows what each local or external node would do without writing assets. `run` executes only the built-in local nodes (`json.bundle`, `asset.copy`, and `sprite.inspect`), imports explicitly supplied `result.ref` files, writes a versioned bundle under `visuals/` or `reports/`, and creates a small HTML review page. It never calls Atlas, Gemini, DeepSeek, or an HTTP endpoint. A provider node becomes `skipped` or `needs_input` until an adapter supplies a checked-in result.

Keep `fallback` as a human-readable fallback label. Use `fallbackSlot` only when a graph node should reuse another slot. A successful run proves file and graph integrity; it does not approve art direction, animation quality, mesh topology, or engine integration. Send the generated report to `stage-visual-qa` and `world-audit` before replacing a stage asset.

## Required result envelope

Return the shared envelope:

```json
{
  "status": "ok|needs_input|failed",
  "artifacts": [],
  "diagnostics": [],
  "next": []
}
```

Each node result should also record `nodeId`, `status`, `provider`, `model`, `inputHashes`, `outputHashes`, `settingsHash`, `durationMs`, `creditsEstimate`, and a redacted error when applicable. Do not write API keys, cookies, private prompts, or unredacted provider responses into the report.

## Integration boundaries

- `atlas-builder` supplies logical spaces and anchors; this skill does not infer authoritative topology from a rendered image.
- `scene-painter` consumes map outputs, layers, masks, and occlusion metadata.
- `sprite-forger` consumes actor outputs, transparent bounds, anchors, directions, and actions.
- `world-stage` consumes the resulting manifest and keeps DOM/Canvas fallbacks available.
- `world-audit` validates hashes, references, budgets, and replay independence.
- `model-bridge` owns provider selection and external-call accounting.

## Hard rules

- Never make an external provider a prerequisite for headless world execution.
- Never let an asset workflow edit runtime state or event logs.
- Never silently replace an approved asset; create a new version or branch.
- Never accept a mesh, sprite, or map without a fallback and a review status.
- Never claim that a generated preview is engine-ready until the declared budget and export checks pass.
- Keep provider-specific adapters outside the canonical world and asset contracts.

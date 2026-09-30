# Asset Pipeline Contract v0.1

The contract describes a reusable creative graph without tying the world workspace to a particular service. It is presentation and production metadata; it does not contain actor state or world events.

## Pipeline shape

```json
{
  "schemaVersion": "asset-pipeline/v0.1",
  "pipelineId": "ashfall-prop-pack",
  "version": 1,
  "orchestrator": "codex",
  "inputs": [],
  "nodes": [],
  "outputs": [],
  "review": {}
}
```

### Inputs

Each input has a stable `id`, a `kind` (`brief`, `image`, `mesh`, `actor`, `space`, or `scene`), a path or inline reference, and an optional content hash. A world ID may be referenced, but the pipeline must not copy runtime state into the input.

### Nodes

```json
{
  "id": "optimize-mesh",
  "kind": "mesh.optimize",
  "in": ["raw-mesh"],
  "out": ["game-mesh"],
  "capability": "mesh-processing",
  "provider": "offline|codex|atlas|http|local",
  "model": "optional-model-id",
  "result": {"ref": "visuals/generated/prop-blue-battery-stall.glb", "kind": "mesh"},
  "settings": {
    "triangleBudget": 15000,
    "textureSize": 2048,
    "lods": [1, 0.5, 0.15]
  },
  "optional": false,
  "fallback": "copy-approved",
  "fallbackSlot": "approved-prop"
}
```

Node kinds are intentionally small and composable: `brief.normalize`, `image.generate`, `image.edit`, `sprite.pack`, `mesh.generate`, `mesh.optimize`, `material.apply`, `rig.prepare`, `map.layers`, `render.preview`, `export.asset`, and `review.visual`. An adapter may expose more names, but it must map them to a canonical kind and slot.

### Outputs

An output names the slot and the `AssetRef` that consumers will read:

```json
{
  "id": "prop-blue-battery-stall",
  "kind": "mesh",
  "path": "visuals/generated/prop-blue-battery-stall.glb",
  "format": "glb",
  "hash": "sha256:…",
  "anchor": "center",
  "fallback": "visuals/ashfall/blue-battery-stall.png",
  "review": "passed"
}
```

`result.ref` is an explicit, already-produced provider result. The local runner imports and hashes it; it never calls the provider. `fallback` is a display label, while `fallbackSlot` is an optional slot ID used for actual reuse. Keep provider credentials outside the pipeline file.

### Review

Review records the checks that are meaningful for the asset kind: `identity`, `style`, `bounds`, `anchor`, `topology`, `uv`, `materials`, `lod`, `format`, `license`, and `runtimeFallback`. A missing check is `unknown`, never an implicit pass.

## Provider adapter rule

An Atlas adapter may translate a versioned Atlas graph, API job, or export bundle into this contract. The adapter records the external workflow ID, provider run ID, settings, model nodes, and output hashes in provenance. It must not make Atlas-specific fields required by `world-stage` or by the world kernel.

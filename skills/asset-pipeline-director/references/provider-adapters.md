# Provider adapter notes

The canonical pipeline does not contain provider credentials or provider-specific request bodies. An adapter may run elsewhere and return a file bundle plus a redacted provenance record.

## Atlas-style adapter

Map a visual workflow into the canonical graph as follows:

| External concept | Canonical field |
| --- | --- |
| workflow ID and revision | `pipelineId`, `version`, provenance metadata |
| generation/processing node | `kind`, `capability`, `provider`, `model`, `settings` |
| input asset | `inputs[]` with `ref` and SHA-256 |
| exported file | node `result.ref` and `result.kind` |
| fallback branch | `fallback` label and optional `fallbackSlot` |
| API/job identifier | redacted provenance outside `runtime/` |

The adapter must verify the downloaded file before declaring `imported`: format, size, declared budget, hash, and the asset-specific review checks. If a job is pending, leave the node `needs_input` and keep the last approved export. Do not turn a provider workflow ID into an actor, space, event, or runtime state ID.

## Codex-first path

When the current Codex session is the orchestrator, it can author or revise the graph, inspect reports, and decide whether a provider call is worth making. The local runner remains the reproducible baseline. If a provider result is available through an approved tool or a user-supplied file, put the sanitized file under the world’s presentation directories and reference it with `result.ref`; never paste a key or raw response into the pipeline.

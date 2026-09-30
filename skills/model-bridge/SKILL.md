---
name: model-bridge
description: Route world tasks to Codex, local, HTTP, or image providers through one auditable provider-neutral interface.
---

# Model Bridge

Use this skill when a world needs reasoning, dialogue, vision, image generation, embeddings, or another external model capability.

## Rules

- classify a call by capability (`reasoning`, `dialogue`, `vision`, `image`, `embedding`), latency, budget, and context size;
- allow Codex to be the default reasoning and orchestration provider while keeping the kernel independent of it;
- validate structured output before it reaches a contract or runtime mutation;
- record provider, model, request hash, token/cost estimate, duration, retry count, and a redacted error;
- provide deterministic and offline fallbacks for tests and preview worlds.
- route graph nodes from `asset-pipeline-director` without making the graph depend on one vendor; Codex may plan and review, while a provider adapter supplies an explicit, hashed `result.ref`;
- count external calls and credits per node, and leave a machine-readable `needs_input` result when the required capability or credential is absent.

Do not put API keys in world content, prompts, commits, or event records. A provider can propose a map description, sprite prompt, dialogue turn, or action intent; it cannot commit world state.

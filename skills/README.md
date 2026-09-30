# Repository Skills

这里存放项目自己的 Codex Skill 定义。Skill 描述工作流和边界；共享数据、状态迁移和事件写入由 Contract 与 Kernel 负责。

## 目录

- `contract-keeper/`
- `model-bridge/`
- `world-conceiver/`
- `atlas-builder/`
- `scene-painter/`
- `cast-forger/`
- `sprite-forger/`
- `asset-pipeline-director/`
- `agent-cognition/`
- `world-audit/`
- `life-director/`
- `dialogue-director/`
- `memory-weaver/`
- `timeline-keeper/`
- `story-chronicler/`
- `world-console/`
- `world-stage/`
- `stage-ui-director/`
- `stage-visual-qa/`
- `world-runner/`
- `world-production-director/`

每个 Skill 都应说明触发条件、前置输入、输出产物、验证方式、错误恢复、证明等级和禁止事项。Skill 不得直接编辑运行状态或追加事件。生产入口是 `world-production-director`，它先列能力、依赖和证据，再调用其他 Skill。完整映射见 [`docs/capability-matrix.md`](../docs/capability-matrix.md)。

Skill 仓库只保存可复用的定义和实现。具体世界的 `content/`、`runtime/`、`reports/`、图片和查看器应写入调用方指定的工作区，例如 `neo_world/worlds/<world-id>/`。

# Repository Skills

这里存放项目自己的 Codex Skill 定义。Skill 只描述工作流和边界；共享数据、状态迁移和事件写入由后续 `packages/` 中的 Contract 与 Kernel 负责。

## 首批目录

- `world-conceiver/`
- `atlas-builder/`
- `cast-forger/`
- `world-audit/`
- `life-director/`
- `memory-weaver/`
- `world-console/`
- `world-runner/`

每个 Skill 都应说明：触发条件、前置输入、输出产物、验证方式、错误恢复和禁止事项。Skill 不得直接编辑运行状态或追加事件。

Skill 仓库只保存可复用的定义和实现。具体世界的 `content/`、`runtime/`、`reports/` 和查看器应写入调用方指定的工作区，例如 `neo_world/worlds/<world-id>/`。

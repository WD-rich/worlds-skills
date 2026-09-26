# 技能拆分

## 边界原则

每个 Skill 只负责一个可描述、可验证的工作边界。它通过共享 Contract 交换文件和对象，不读取另一个 Skill 的提示词，也不直接编辑运行状态。

## 首批 Skill

### `world-conceiver`

输入：创意文本、语言、约束和可选种子。

输出：`WorldSeed`，包含主题、社会规则、时间模型、地点草案、角色草案和内容边界。

不负责图片、数据库写入或持续模拟。

### `atlas-builder`

输入：`WorldSeed` 和地点草案。

输出：`SpaceGraph`，包含地点、邻接关系、可行走区域、交互锚点和资源清单。

第一版只需生成最小空间图，不把图片生产作为运行前置条件。

### `cast-forger`

输入：`WorldSeed`、`SpaceGraph` 和角色要求。

输出：`ActorProfile`、`ActorState` 和关系边。

稳定的角色设定与会变化的运行状态必须分开保存。

### `world-audit`

输入：任意工作区或 Skill 产物。

检查 Schema、引用完整性、空间关系、占用冲突、状态迁移、事件完整性和确定性回放。

审计可以提出修复建议，但不能静默改写事件或运行状态。

### `life-director`

输入：快照、角色状态、可见上下文、时间步和认知 Provider。

执行 `observe → propose → validate → apply → record`，输出行动意图、状态迁移、对话结果和事件。

模型只提出候选意图，Kernel 负责判断意图是否合法并应用效果。

## 后续 Skill

- `memory-weaver`：记忆写入、检索、衰减、巩固和摘要；
- `world-console`：只读查询、角色对话、广播、编辑、分支和回放；
- `world-runner`：环境检查、任务编排、断点续跑和诊断；
- 资产 Skill：可选的图片、音频和多模态资源生产。

## 推荐工作流

```text
world-conceiver
  → world-audit
  → atlas-builder + cast-forger
  → 初始快照
  → life-director
  → memory-weaver
  → world-console
```

`atlas-builder` 和 `cast-forger` 在输入就绪后可以并行；只有通过审计的产物才能进入 Kernel。

## 统一写入规则

Skill 返回共享结果封装：

```json
{
  "status": "ok|needs_input|failed",
  "artifacts": [],
  "diagnostics": [],
  "next": []
}
```

所有运行时写入都必须经过 Kernel 事务。Skill 不得直接写 `runtime/state.json`、`runtime/records.ndjson` 或快照目录。

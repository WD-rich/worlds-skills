# 技能拆分

每个 Skill 只负责一个可描述、可验证的工作边界。它通过共享 Contract 交换文件和对象，不读取另一个 Skill 的提示词，也不直接编辑运行状态。

## 基础契约与 Provider

### `contract-keeper`

负责 Schema、版本迁移、稳定 ID、引用检查和统一结果封装。所有其他 Skill 使用它定义的对象，不在自己的提示词里复制一套隐式字段。

### `model-bridge`

负责把 Codex、规则 Provider、本地模型、HTTP 模型、视觉模型和图片模型适配成统一调用。它记录能力、模型、成本和错误，但不拥有世界事实。

## 世界构建

### `world-conceiver`

输入创意文本、语言、约束和可选种子；输出 `WorldSeed`，包含主题、社会规则、时间模型、地点草案、角色草案、资源规则和内容边界。不负责图片、数据库写入或持续模拟。

### `atlas-builder`

输入 `WorldSeed` 和地点草案；输出 `SpaceGraph`，包含地点、邻接关系、可行走区域、交互锚点和资源清单。必须验证双向邻接、连通性、容量和危险，不把图片生产作为运行前置条件。

### `scene-painter`

输入通过审计的 `SpaceGraph` 和视觉约束；输出背景图、区域覆盖层、交互元素、可行走 mask、网格和资产清单。图片生成失败时必须提供程序化占位图和诊断，不阻塞无头运行。

### `cast-forger`

输入 `WorldSeed`、`SpaceGraph` 和角色要求；输出 `ActorProfile`、`ActorState` 和关系边。稳定设定、运行状态、关系、库存和记忆引用必须分开保存。

### `sprite-forger`

输入 `ActorProfile` 和视觉约束；输出透明 spritesheet、方向/动画元数据和稳定的 `AssetRef`。它不修改角色状态，也不能因为单个图片任务失败而删除角色。

### `asset-pipeline-director`

输入 brief、已批准的地图/角色素材、目标平台预算和可选 Provider 结果；输出版本化素材节点图、导出包、哈希、回退标记、技术检查和 HTML 预览。它负责素材生产的编排与可复现性，不负责世界拓扑、角色状态、事件或对话。Codex 负责规划和本地审查；Atlas、图片、3D 或视频 Provider 只通过 `result.ref` 或独立适配器接入，不能成为运行世界的前置条件。

## 认知与运行

### `agent-cognition`

输入快照、角色 profile/state、可见空间、关系和记忆检索结果；输出感知、需求/情绪变化、行动菜单和候选意图。候选意图不等于执行结果，必须交给 Kernel 校验。

### `life-director`

输入快照、候选意图和时间步；执行 `observe → propose → validate → apply → record`，输出合法的状态迁移、世界事件和快照。模型只提出候选意图，Kernel 负责合法性、资源、占用和容量检查。

### `dialogue-director`

输入对话触发、参与者上下文和关系；输出可暂停、恢复、结束的对话会话、回合和显式社会影响。沙盒对话与正式世界事件分离。

### `memory-weaver`

从事件和对话生成带来源的记忆，提供有界检索、衰减、巩固、反思和日记。记忆是角色可用的观察或解释，不是权威事实。

## 持续运行与展示

### `timeline-keeper`

负责时间线创建、分支、切换、比较和回放。分支从经过验证的快照开始，使用新的事件流；回放必须重新计算状态哈希。

### `story-chronicler`

从已验证事件和归属明确的对话生成日摘要、精彩事件、名句和可解释的戏剧评分。产物可再生成，不能反写世界事实。

### `world-console`

提供只读查询、角色对话、广播、私语、允许的编辑、分支、回放和审计命令。每个改变都形成显式命令与审计事件。

### `world-stage`

消费空间图、资产、实时事件或回放帧，提供地图、角色、气泡、资源、角色、时间线和干预面板。舞台不能直接编辑 `state.json` 或 `records.ndjson`，并且要明确 live、replay、sandbox 模式。

### `world-runner`

负责环境检查、工作区创建、Provider 检测、创建作业、进度、取消、断点续跑和清理。失败启动不能破坏源世界和已有快照。

### `world-audit`

检查 Schema、引用、空间图、资产映射、角色占用、事件完整性、Provider 记录、快照和确定性回放，并返回机器可读诊断。

## 推荐工作流

```text
world-conceiver
  → contract-keeper + world-audit
  → atlas-builder + cast-forger
  → scene-painter + sprite-forger（可选）
  → asset-pipeline-director（可选，编排/加工/发布素材）
  → 初始快照
  → agent-cognition + life-director + dialogue-director
  → memory-weaver + story-chronicler
  → timeline-keeper + world-console
  → world-stage
```

`atlas-builder` 和 `cast-forger` 在输入就绪后可以并行；只有通过审计的产物才能进入 Kernel。图片和前端是展示层，不得阻塞无头运行。

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

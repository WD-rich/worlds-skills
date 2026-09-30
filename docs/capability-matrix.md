# 能力覆盖矩阵

这张表是生产事实表。`guided` 表示 Skill 能指导 Codex 产出，`tool-backed` 表示有可执行工具，`runtime-proven` 表示新运行真实消费输入并写入可回放事实，`release-proven` 还要求目标平台和用户可见证据通过。注册表里的 `partial` 只描述实现范围，当前证明等级仍单独记录在 `proofLevel`。没有证据时保持较低等级。

详细的可机器读取版本在 [`skills/world-production-director/references/capabilities.json`](../skills/world-production-director/references/capabilities.json)。使用 [`world-production-director`](../skills/world-production-director/SKILL.md) 创建或审查生产计划。

| 能力域 | Skill | 主要输入 | 主要产物 | 当前证明等级 | 当前事实 / 缺口 |
| --- | --- | --- | --- | --- | --- |
| 生产编排 | `world-production-director` | 需求、工作区、profile | 能力图、阶段计划、证据诊断 | tool-backed | 有 registry 和检查脚本；不替代各阶段运行 |
| 契约与迁移 | `contract-keeper` | 版本对象 | Schema、迁移、诊断 | guided | 规范已写；完整 Schema/迁移执行器待补 |
| 模型与 Provider | `model-bridge` | 能力、预算、约束 | Provider 选择、调用记录 | guided | Codex 可作为默认规划者；通用 HTTP/图像/3D 适配器待补 |
| 世界创意与规则 | `world-conceiver` | 一句话、约束、种子 | `WorldSeed`、规则 | guided | Codex 工作流；无独立生成 CLI |
| 空间逻辑 | `atlas-builder` | `WorldSeed` | `SpaceGraph`、导航锚点 | guided | 有图规则；完整寻路、碰撞和容量执行器待补 |
| 角色设定 | `cast-forger` | 世界、空间图 | profile、state、关系、库存 | guided | 有拆分规范；完整自动生成/校验待补 |
| 感知与决策 | `agent-cognition` | 快照、记忆、可见信息 | `Perception`、`ActionMenu`、意图 | guided | 有边界规范；没有持续自主循环 |
| 时间步运行 | `life-director` | 合法意图、规则 | 状态迁移、事件、快照 | guided | 规范完整；当前示例主要回放已有记录 |
| 对话会话 | `dialogue-director` | 参与者、关系、上下文 | 会话、回合、社会影响 | guided | 已保存对话可展示；持续会话执行器待补 |
| 记忆与反思 | `memory-weaver` | 事件、对话 | 记忆、检索、摘要 | guided | 有来源字段；检索/巩固服务待补 |
| 多日与时间线 | `timeline-keeper` | 快照、事件、分支点 | 分支、回放、比较 | tool-backed | `engine.mjs` 可回放；持久分支与多日比较待补 |
| 剧情内容 | `story-chronicler` | 已验证事件与对话 | 摘要、名句、评分 | guided | 可由 Codex 生成来源化文本；无持续执行器 |
| 上帝操作 | `world-console` | 命令、快照 | 查询、沙盒、干预、分支 | tool-backed | viewer 有本地查询和少量干预；持久权限/编辑待补 |
| 地图美术 | `scene-painter` | 空间图、profile | 场景图层、可走区域、遮挡 | guided | 有 v0.5 两套 profile；完整分层/碰撞导出待补 |
| 角色美术 | `sprite-forger` | 角色、相机规范 | gameplay sprite、头像、动作元数据 | guided | 有角色槽位；当前地图 silhouette 不算正式动画 |
| 素材生产编排 | `asset-pipeline-director` | brief、素材、Provider | 版本化 pipeline、导出、哈希 | tool-backed | local 节点和结果导入可跑；没有图片/3D 生成器 |
| 游戏舞台 | `world-stage` | 场景、资产、回放帧 | 地图、角色、气泡、面板、时间轴 | tool-backed | 离线 viewer 可构建；live、逐帧方向、正式美术待补 |
| 舞台 UI 设计 | `stage-ui-director` | 目标图、状态矩阵 | 布局契约、交互层级 | guided | profile 与验收规则已写；需真实 profile 画面评审 |
| 舞台视觉验收 | `stage-visual-qa` | viewer、视口、时间步 | 截图矩阵、重叠/文字诊断 | guided | 有检查规则；不会自动判断美术质量 |
| 启动与作业 | `world-runner` | 工作区、模式、预算 | 作业、进度、恢复 | guided | 有离线流程；持久调度/断点恢复待补 |
| 质量与回放 | `world-audit` | 工作区、日志、快照 | 引用、连通、回放哈希 | tool-backed | `world-check.mjs` 可查基础一致性；全量契约/资产质量待补 |

## 证明规则

1. 只有实际执行过的工具、脚本或运行记录才能提升证明等级。
2. 静态 JSON、Skill 文案、概念图、复制的 viewer 和预录 NDJSON 只能作为输入或计划证据。
3. 视觉通过必须同时有技术检查、固定时间步截图和人工 profile 评审；技术通过不等于画面通过。
4. 新能力先进入 registry，声明 owner、依赖、输入、输出、脚本、proof 和 release gate，再进入路线图。
5. 外部模型 Key 只影响可选 Provider；没有 Key 时必须保留离线规划、回退和审计路径。

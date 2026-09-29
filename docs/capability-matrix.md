# 能力覆盖矩阵

这份矩阵用来防止把“能生成一份 JSON”误认为“能运行一个活的世界”。Skill 仓库只保存通用能力；具体世界的数据、图片和事件日志属于调用方工作区。

| 能力域 | 输入 | 输出 | Skill | 当前阶段 |
| --- | --- | --- | --- | --- |
| 世界创意与规则 | 一句话、约束、种子 | `WorldSeed`、资源规则、时间模型 | `world-conceiver` | M1 |
| 契约与迁移 | 版本化对象 | Schema、迁移、诊断 | `contract-keeper` | M0 |
| 模型与 Provider | 任务、预算、能力要求 | 可替换 Provider、调用记录 | `model-bridge` | M1 |
| 空间逻辑 | `WorldSeed` | 空间图、导航、交互点 | `atlas-builder` | M1 |
| 地图美术 | 地图描述、空间图 | 背景图、区域图层、可行走网格 | `scene-painter` | M3 |
| 角色设定 | 世界规则、空间图 | profile、state、关系、库存 | `cast-forger` | M1 |
| 角色美术 | 角色 profile、视觉约束 | spritesheet、透明图、动画元数据 | `sprite-forger` | M3 |
| 感知与决策 | 快照、记忆、可见上下文 | perception、action menu、intent | `agent-cognition` | M2 |
| 时间步运行 | 合法 intent、规则 | 事件、状态迁移、快照 | `life-director` | M2 |
| 对话会话 | 参与者、关系、上下文 | dialogue session、turn、情绪影响 | `dialogue-director` | M2 |
| 记忆与反思 | 事件、对话、重要性 | memory、检索、日记、摘要 | `memory-weaver` | M2 |
| 多日与时间线 | 快照、事件、分支点 | timeline、branch、replay frame | `timeline-keeper` | M3 |
| 剧情内容 | 事件、对话、关系变化 | 摘要、名句、戏剧评分 | `story-chronicler` | M3 |
| 上帝操作 | 用户命令 | 广播、私语、编辑、沙盒会话 | `world-console` | M3 |
| 游戏舞台 | 世界资产、运行事件 | 地图、角色、气泡、面板、时间轴 | `world-stage` | M4 |
| 舞台 UI 设计 | viewer 截图、状态矩阵、视觉契约 | 布局契约、设计 token、焦点/安全区/文字诊断 | `stage-ui-director` | M4.5 |
| 舞台视觉验收 | viewer、视口、时间步、交互状态 | 截图清单、重叠诊断、视觉报告 | `stage-visual-qa` | M4.5 |
| 启动与作业 | 工作区、配置、Provider | 创建作业、进度、恢复、报告 | `world-runner` | M0-M4 |
| 质量与回放 | 任意工作区 | 审计、哈希、诊断 | `world-audit` | M0-M3 |

## 约束

1. 模型只产生候选内容或意图，Kernel 负责合法性、状态迁移和事实记录。
2. 图片和前端属于可选展示层，不得成为无头运行的前置条件。
3. 每个外部调用都记录 provider、model、耗时、重试、成本和脱敏错误。
4. 角色的 profile、运行 state、关系、记忆和资产引用分开保存。
5. 所有可变状态都通过事件写入；查看器不能直接改写快照。

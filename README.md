# Worlds Skills

面向 Codex 的开放式世界构建与运行工具集。

这个项目把“创建世界”和“运行世界”拆成可以独立调用的 Skill，再用一个与模型无关的内核管理数据、规则、事件和快照。Codex 可以作为主要协作入口；运行内核不依赖某个桌面会话、模型供应商或前端。

> 当前版本正在从 Skill 定义进入可重复运行阶段。无头运行先使用确定性 Provider；模型、图片和前端都是可替换层。路线和验收标准见 [`docs/roadmap.md`](docs/roadmap.md)。

## 设计目标

- **Codex 优先，运行独立**：Skill 适合自然语言协作，CLI 和内核适合自动化与持续运行。
- **模型可替换**：模型只提出候选意图，内核负责校验、执行和记录事实。
- **可重现**：相同输入和随机种子得到相同结果；每次状态变化都能回放。
- **可审计**：生成内容、状态迁移和外部调用都有结构化诊断。
- **从零实现**：本项目使用独立的名称、契约、提示词和代码，不复制其他项目的实现或资源。

## Skill 分工

| Skill | 作用 | 主要产物 |
| --- | --- | --- |
| `contract-keeper` | 管理版本化契约、迁移和统一诊断 | Schema、迁移、结果封装 |
| `model-bridge` | 连接 Codex、本地、HTTP、视觉和图片 Provider | Provider 记录、成本和脱敏错误 |
| `world-conceiver` | 将创意整理为可校验的世界种子 | `WorldSeed` |
| `atlas-builder` | 构建地点、连接和交互空间 | 空间图、导航与资源清单 |
| `scene-painter` | 生成地图视觉资产、图层、网格并审查 | 地图资产、可行走网格、资产清单 |
| `cast-forger` | 创建角色设定、关系和初始状态 | 角色档案、角色状态 |
| `sprite-forger` | 生成角色图片、透明图和动画元数据 | spritesheet、`AssetRef` |
| `asset-pipeline-director` | 把 brief、地图、角色和外部 Provider 串成可复用、可审查的素材生产图 | 版本化 pipeline、导出包、哈希和诊断 |
| `agent-cognition` | 生成感知、需求、情绪、行动菜单和候选意图 | `Perception`、`ActionMenu`、`Intent` |
| `world-audit` | 检查契约、引用、规则和回放能力 | 结构化诊断报告 |
| `life-director` | 推进时间并产生合法行动和事件 | 事件记录、状态快照 |
| `dialogue-director` | 管理对话会话、回合和社会影响 | `DialogueSession`、对话事件 |
| `memory-weaver` | 管理记忆写入、检索和巩固 | 记忆记录、周期摘要 |
| `timeline-keeper` | 创建、分支、切换和回放时间线 | `Timeline`、回放帧 |
| `story-chronicler` | 从事实生成摘要、名句和戏剧评分 | 派生内容、来源引用 |
| `world-console` | 查询、对话、干预、分支和回放 | 操作结果、回放帧 |
| `world-stage` | 地图、角色、气泡、面板和实时/回放展示 | 可交互舞台 |
| `world-runner` | 校验配置、启动任务和报告运行状态 | 运行报告、诊断信息 |
| `world-production-director` | 为新世界编排能力、profile、阶段出口和证据 | 能力注册表、生产计划、缺口报告 |

完整覆盖矩阵见 [`docs/capability-matrix.md`](docs/capability-matrix.md)，拆分边界见 [`docs/split-design.md`](docs/split-design.md)。

面向截图级体验和超越基准产品的实施计划见 [`docs/competitive-plan.md`](docs/competitive-plan.md)。从需求到可验证成品的统一入口是 [`world-production-director`](skills/world-production-director/SKILL.md)，它会先区分“有规范”“有工具”“真实运行通过”和“发布验证通过”。

## 第一条可运行链路

第一阶段不依赖图片、网页或外部模型，先验证核心数据流：

```text
创意文本
  → world-conceiver
  → atlas-builder + cast-forger
  → contract-keeper + world-audit
  → 初始快照
  → agent-cognition + life-director + dialogue-director
  → memory-weaver + story-chronicler
  → timeline-keeper + world-console
  → 事件日志 + 新快照 + 可回放报告
```

小世界闭环通过后，再用同一条链路接入地图和角色资产，并扩大空间、角色和时间步规模。

## 目录

```text
worlds-skills/
├── skills/       # Codex Skill 定义
├── tools/        # 无头校验、回放和开发辅助工具
├── packages/     # 契约、内核、存储和 provider（逐步实现）
├── apps/         # CLI 和服务入口（逐步实现）
├── docs/         # 架构、拆分、覆盖矩阵和路线图
└── tests/        # 契约、迁移、回放和内核测试（逐步实现）
```

生成的世界、运行日志和查看器属于调用方的工作区，不放进这个 Skill 仓库。当前示例工作区位于 `/Users/wd/new_world/neo_world`。

## 开源状态

当前仓库固定公共契约、Skill 边界和可复用工具。贡献时请优先提交小而独立的变更，并保证 Skill 不绕过内核直接编辑运行状态。

# Worlds Skills

面向 Codex 的开放式世界构建与运行工具集。

这个项目把“创建世界”和“运行世界”拆成可以独立调用的 Skill，再用一个与模型无关的内核管理数据、规则、事件和快照。Codex 可以作为主要的协作入口；运行内核不会依赖某个桌面会话、模型供应商或前端。

> 当前版本是架构与 Skill 定义阶段，尚未提供完整运行内核。第一版实现目标见 [`docs/roadmap.md`](docs/roadmap.md)。

## 设计目标

- **Codex 优先，运行独立**：Skill 适合自然语言协作，CLI 和内核适合自动化与持续运行。
- **模型可替换**：模型只提出候选意图，内核负责校验、执行和记录事实。
- **可重现**：相同输入和随机种子得到相同结果；每次状态变化都能回放。
- **可审计**：生成内容、状态迁移和外部调用都有结构化诊断。
- **从零实现**：本项目使用独立的名称、契约、提示词和代码，不复制其他项目的实现或资源。

## Skill 分工

| Skill | 作用 | 主要产物 |
| --- | --- | --- |
| `world-conceiver` | 将创意整理为可校验的世界种子 | `WorldSeed` |
| `atlas-builder` | 构建地点、连接和交互空间 | 空间图、导航与资源清单 |
| `cast-forger` | 创建角色设定、关系和初始状态 | 角色档案、角色状态 |
| `world-audit` | 检查契约、引用、规则和回放能力 | 结构化诊断报告 |
| `life-director` | 推进时间并产生合法行动和事件 | 事件记录、状态快照 |
| `memory-weaver` | 管理记忆写入、检索和巩固 | 记忆记录、周期摘要 |
| `world-console` | 查询、对话、干预、分支和回放 | 操作结果、回放帧 |
| `world-runner` | 校验配置、启动任务和报告运行状态 | 运行报告、诊断信息 |

## 第一条可运行链路

第一阶段不依赖图片、网页或外部模型，先验证核心数据流：

```text
创意文本
  → world-conceiver
  → atlas-builder + cast-forger
  → world-audit
  → 初始快照
  → life-director（确定性运行五步）
  → 事件日志 + 新快照
```

之后再加入记忆、分支、Codex 认知适配器、图片资源和 Web 界面。

## 目录

```text
worlds-skills/
├── skills/       # Codex Skill 定义
├── packages/     # 契约、内核、存储和 provider（后续实现）
├── apps/         # CLI 和服务入口（后续实现）
├── docs/         # 架构、拆分和路线图
└── tests/        # 契约、迁移、回放和内核测试（后续实现）
```

生成的世界、运行日志和查看器属于调用方的工作区，不放进这个 Skill 仓库。当前示例工作区位于 `/Users/wd/new_world/neo_world`。

## 文档入口

- [架构说明](docs/architecture.md)
- [技能拆分](docs/split-design.md)
- [开发路线](docs/roadmap.md)
- [贡献指南](CONTRIBUTING.md)

## 开源状态

当前仓库先固定公共契约和边界，再逐步添加实现。贡献时请优先提交小而独立的变更，并保证 Skill 不绕过内核直接编辑运行状态。

# 开发路线

具体的产品目标、舞台布局、验收门槛和超越基准的差异化能力见 [`competitive-plan.md`](competitive-plan.md)。

## M0：契约和可重复工具

- 定义版本化 Schema、ID 策略和统一结果封装；
- 提供工作区审计、事件统计和回放校验工具；
- 固定随机种子、文件布局和诊断格式。

## M1：静态世界组装

- 实现 `world-conceiver`、`atlas-builder`、`cast-forger` 和 `model-bridge`；
- 提供一个只有两个角色的小型示例世界；
- 生成产物哈希并验证所有引用。

## M2：小世界完整闭环

- 实现时钟、合法状态迁移、追加事件和快照；
- 让 `agent-cognition` + `life-director` + `dialogue-director` 在无外部 API 的情况下运行五步；
- 从事件重建状态，并与当前快照进行比对；
- 写入最小记忆和日摘要。

## M3：认知、内容和操作

- 完成 `memory-weaver`、`timeline-keeper`、`story-chronicler` 和 `world-console`；
- 支持分支、比较、沙盒对话、创建作业进度和断点续跑；
- 接入 Codex、HTTP、本地模型和规则 Provider。

## M4：资源与展示

- 完成 `scene-painter`、`sprite-forger` 和 `world-stage`；
- 提供 live、replay、sandbox 三种舞台模式；
- 保持无 UI 的 CLI 仍可完整运行。

## M5：规模扩展

- 用同一套契约和回放工具扩展到十倍空间、角色和时间步；
- 增加性能基线、断点续跑和大事件日志压缩；
- 小规模和扩展规模使用相同的审计报告格式。

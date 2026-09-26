# 贡献指南

感谢参与 Worlds Skills。当前项目处于契约和内核设计阶段，优先欢迎边界清晰、可单独审查的变更。

## 提交前

- 先阅读 [`docs/architecture.md`](docs/architecture.md) 和 [`docs/split-design.md`](docs/split-design.md)；
- 保持 `contracts → kernel → providers/storage → skills` 的依赖方向；
- 不让 Skill 直接修改运行状态、事件日志或快照；
- 为新的 Schema、状态迁移和诊断码补充文档；
- 不提交 API Key、个人数据、生成缓存或不可授权的第三方资源。

## 独立实现要求

本项目从零实现。可以参考公开的通用概念，但不要复制其他项目的代码、提示词、资源、内部数据、品牌文案或专有字段。新模块应使用本项目自己的契约和命名，并在提交说明中写清输入、输出和验证方式。

## Skill 变更

每个 Skill 的 `SKILL.md` 应保持短小且可路由，包含：

1. 什么时候使用；
2. 需要哪些前置输入；
3. 产生哪些文件或结构化结果；
4. 如何验证和恢复；
5. 哪些操作明确禁止。

## 提交信息

使用简短、可读的提交信息，例如：

```text
docs: define first skill boundaries
feat: add deterministic state transition
fix: reject invalid occupancy change
```

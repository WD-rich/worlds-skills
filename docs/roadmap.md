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

## M4.5：游戏化视觉舞台

- 增加 `stage-ui-director`，把地图、角色、事件和回放栏组织成可读的舞台层级；
- 增加 `stage-visual-qa`，对目标视口、时间步、对话和面板状态生成截图与重叠诊断；
- 让 `world-stage` 支持世界、角色、事件三种聚焦模式；
- 让 `scene-painter` 和 `sprite-forger` 输出层级、锚点、动作和回退契约；
- 视觉质量检查继续保持离线可运行，不要求任何模型 Key。

## M4.6：素材生产图

- 增加 `asset-pipeline-director`，把 brief、参考图、图片/3D 加工、导出和验收组织成有版本的节点图；
- 提供本地可执行节点、显式 `result.ref` 导入、哈希、预算、HTML 预览和失败不发布机制；
- 保留 Atlas 以及其他图片/3D Provider 的适配边界，基线运行不需要第三方 Key；
- 让 `scene-painter`、`sprite-forger`、`world-audit` 和 `stage-visual-qa` 消费同一份导出报告。

## M4.7：生产总控与可替换视觉方案

- 增加 `world-production-director`，从能力注册表、当前实现等级和工作区事实生成可复用生产计划；
- 用 `cinematic-2.5d` 和 `pixel-sim` 两个明确 profile 替代“做得更漂亮”这类不可验收描述；
- 让场景、角色、UI、舞台和视觉 QA 都声明并消费同一 profile；
- 将证明等级拆成 `guided`、`tool-backed`、`runtime-proven`、`release-proven`，禁止把静态截图、概念图和预录日志混作运行证据；
- 小规模 hero slice 先过真实交互和视觉人工评审，之后才允许进入 M5 的十倍规模。

## M5：规模扩展

- 用同一套契约和回放工具扩展到十倍空间、角色和时间步；
- 增加性能基线、断点续跑和大事件日志压缩；
- 小规模和扩展规模使用相同的审计报告格式。

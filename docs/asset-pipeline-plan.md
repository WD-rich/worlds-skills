# 素材生产能力设计

## 目标

把“世界描述 → 视觉素材 → 游戏可用文件 → 可审查预览”做成可重复的生产图。工作流吸收 Atlas 类工具的核心方法：多模型/多步骤编排、非破坏式中间产物、版本与哈希、明确的导出边界和引擎接入预留；实现保持独立，世界内核不依赖任何品牌或供应商。

设计参考：Atlas AI Studio [产品页](https://atlas.design/)、[模型注册表](https://atlas.design/ai-models) 和 [Getting Started](https://docs.atlas.design/atlas-ai-studio-overview/getting-started)。这些链接说明的是外部产品能力边界，不是本项目运行时依赖。

## 第一版边界

`asset-pipeline-director` 现在支持三类本地节点：

- `json.bundle`：将角色、风格和地图输入整理为可审查的 brief 或报告；
- `asset.copy`：复制已批准的 PNG/GLB 等素材并保留原始哈希；
- `sprite.inspect`：检查 PNG 尺寸、透明通道和归一化脚底锚点。

它还支持校验图、计划图和运行图三种模式。运行图可导入明确的 `result.ref`，但不会自行调用 Atlas、Gemini、DeepSeek 或任何 HTTP 服务；未接入的 Provider 节点会留下 `skipped`/`needs_input` 诊断。导出目录只能在调用方世界的 `visuals/` 或 `reports/` 下，不能写入 `content/`、`runtime/` 或 Skill 仓库。

## 生产图契约

每个节点声明 `kind`、`capability`、`provider`、输入/输出 slot、设置和可选的 `result.ref`；图级 `orchestrator` 默认是 `codex`，表示由当前 Codex 会话负责规划、审查和选择是否进入在线执行。每个输入和结果都计算 SHA-256。`fallback` 是展示标签；需要复用图中已有素材时使用 `fallbackSlot`。没有完整输出时不发布素材包。

报告必须把以下情况区分开：

- `completed`：本地节点真的执行；
- `imported`：导入调用方提供的结果文件，没有外部调用；
- `fallback`：复用已批准素材；
- `skipped`：可选 Provider 没有适配器；
- `blocked`：所需输入或结果缺失；
- `failed`：文件、预算或契约检查失败。

## 与现有 Skill 的关系

`scene-painter` 消费地图导出，`sprite-forger` 消费角色导出，`stage-visual-qa` 负责像素与交互验收，`world-audit` 负责引用、哈希、预算和回放独立性。素材图不能改变空间图、角色状态、事件日志或快照；它只改变展示层的版本化输入。

## 后续适配顺序

1. 增加 Atlas 导出包适配器：把外部工作流 ID、节点、模型和导出文件映射到本契约；
2. 增加图片背景移除、图集打包和透明边界检查；
3. 增加 GLB/网格预算、UV、材质和 LOD 检查；
4. 把 `stage-visual-qa` 的截图报告作为 `review.visual` 节点输入；
5. 只有在用户明确提供 Provider 凭证并要求在线生成时，才增加在线执行器。在线执行器不能改变离线回退路径。

# World Stage v0.4 视觉重做计划

状态：可复用模板，供各世界工作区复制执行。

World Stage 的视觉重做统一采用 `stage-ui-director` 的[视觉重做计划模板](../skills/stage-ui-director/references/visual-redesign-plan-template.md)。模板把输入冻结、视觉契约、地图与角色比例、响应式壳层、事件反馈和截图回归拆成可重复阶段，避免每个世界重新发明一套流程。

## 目标

让地图成为主要视觉区域，角色以同一相机和尺度落在场景地面上，侧栏只解释当前焦点，事件通过地图、气泡、路线和资源差异形成可读反馈；桌面与窄屏都能在固定时间步复核。

## 统一生产入口

1. 复制模板到世界工作区的 `docs/visual-redesign-v04/plan.md`。
2. 冻结当前 viewer、回放哈希、资产清单和目标视口，保存 before 截图。
3. 创建版本化 `style.v0.4.json` 与 `layout.v0.4.json`，先写比例/层级/响应式规则，再改代码。
4. 按 P0–P6 顺序交付：基线、契约、壳层、场景角色、事件反馈、截图回归、发布。
5. 使用 `stage-visual-qa` 生成 after 截图和机器可读报告；硬失败没有清零时不得标记完成。

## 跨 Skill 分工

| Skill | 负责 | 不负责 |
| --- | --- | --- |
| `stage-ui-director` | 层级、布局、状态矩阵、响应式与焦点 | 世界规则、回放事实 |
| `scene-painter` | 背景/结构/遮挡/路线/锚点 | 角色身份和事件规则 |
| `sprite-forger` | gameplay sprite、脚底锚点、动作和回退 | 地图布局和资源数值 |
| `world-stage` | Canvas/DOM 投影、回放、聚焦和离线 fallback | 生成事实数据 |
| `stage-visual-qa` | 固定状态截图、DOM/像素诊断、报告 | 代替人工判断美术方向 |
| `world-audit` | manifest、哈希、引用和可重建性 | 视觉审美评分 |

## 可扩展规则

- 新世界只替换 world manifest、scene、asset/animation manifest 和版本化契约；不复制另一世界的故事、图片或 Provider 密钥。
- 任何新 UI 状态先扩截图矩阵，再实现；任何相机、断点、角色尺寸或层级变化必须递增契约版本。
- 角色立绘和地图 gameplay sprite 分开管理。没有合适的 gameplay 素材时使用标注过的回退，不把正面立绘直接放大到地图。
- UI 与回放事实保持分离，外部图像模型仅为可选资产 Provider；无 Key 时仍应完成构建、回放和验收。
- 每次版本交付都保留 before/after、运行 ID、提交和剩余风险，保证可回滚和可比较。

## 完成定义

- 构建、审计、确定性回放和离线启动通过；
- 目标桌面/窄屏无空白画布、水平溢出、主要遮挡和关键文字截断；
- T0、移动、对话、交换/决策、收起面板、缺失资产均有证据；
- 报告可定位到视口、时间步、组件、文件和修复建议；
- 新世界可以只用模板和 manifest 接入同一套生产流程。

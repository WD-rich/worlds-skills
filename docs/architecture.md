# 架构说明

## 分层

```text
Codex Skill / CLI / API / Stage
              ↓
      contracts + audit
              ↓
          world kernel
              ↓
 records.ndjson + snapshots + state
              ↑
 cognition / asset providers（可选）
```

### Skill 层

Skill 是面向用户和 Codex 的工作流入口。它负责准备输入、调用内核、组织产物和报告诊断，不直接持有世界状态。

### Contract 层

Contract 是所有模块共享的唯一数据边界，负责版本化 Schema、ID、引用和结果封装。第一批对象包括：

- `WorldSeed`：世界的静态设定和规则草案；
- `SpaceGraph`：地点、连接和交互空间；
- `ActorProfile` / `ActorState`：稳定角色资料与可变运行状态；
- `Perception` / `ActionMenu`：角色当步可见上下文和可执行选择；
- `ActionIntent`：尚未执行的行动意图；
- `DialogueSession`：正式或沙盒对话的生命周期；
- `AssetRef`：地图、角色、音频和占位资源的稳定引用；
- `Timeline` / `Job`：分支回放和可恢复作业的元数据；
- `WorldRecord`：已经发生的事实；
- `WorldSnapshot`：某一时刻可恢复的状态；
- `Diagnostic`：错误、警告和修复建议。

### Kernel 层

Kernel 是运行事实的唯一权威。它负责时钟、合法性检查、状态迁移、事件追加、快照和回放。Skill、模型和舞台不得直接修改 `runtime/state.json` 或 `runtime/records.ndjson`。

### Provider 层

Provider 只负责提出候选内容、视觉资产或意图。默认先实现确定性 Provider，让项目在没有外部 API 的情况下可以运行；之后可以增加 Codex、HTTP、本地模型、视觉或图片服务适配器。每次调用都写入脱敏的能力、模型、耗时、重试和成本记录。

### Stage 层

Stage 只消费 `SpaceGraph`、`AssetRef`、快照和事件/回放帧，提供地图、角色、对话气泡、角色面板、资源面板和时间轴。它可以在无服务器模式下显示静态回放，但不直接修改运行状态。

依赖方向固定为：

```text
contracts ← kernel ← storage / providers
                    ↑
              skills / stage
```

业务规则不能藏在启动脚本、Skill 文案、舞台组件或某个模型适配器里。

## 工作区产物

```text
workspace/
├── manifest.json
├── content/
│   ├── setting.json
│   ├── spaces.json
│   ├── actors/*.json
│   └── assets/              # 可选视觉/音频资源与 AssetRef
├── runtime/
│   ├── clock.json
│   ├── state.json
│   ├── records.ndjson
│   └── snapshots/
└── reports/
```

`records.ndjson` 只追加。`state.json` 是派生视图，必须能从初始内容和事件重新构建。恢复、分支和回放都以事件记录为依据。

工作区是 Skill 的输出边界，不是 Skill 包本身的一部分。Skill 仓库保存通用定义和工具；具体世界、运行日志、快照和查看器应写入用户指定的外部工作区。这样同一套 Skill 可以服务多个世界，也不会把某个故事绑定进开源工具包。

## Skill 结果封装

每个可执行 Skill 统一返回：

```json
{
  "status": "ok",
  "artifacts": [
    { "path": "content/setting.json", "kind": "world-seed", "sha256": "..." }
  ],
  "diagnostics": [],
  "next": []
}
```

`status` 可以是 `ok`、`needs_input` 或 `failed`。诊断项至少包含 `code`、`severity`、`path`、`message` 和 `fix`。这样同一个 Skill 既能由 Codex 调用，也能被 CLI、CI 或其他自动化程序调用。

## 质量标准

- 新克隆的仓库可以只用 Node.js 运行确定性示例；
- 相同种子和输入产生相同事件记录；
- 非法移动、冲突占用、无效动作和错误输出在提交前被拒绝；
- 中断后可以从最近快照继续，且不会重复追加事件；
- Schema 版本和迁移过程明确；
- Provider 与资产失败有离线 fallback，不会删除世界对象；
- 时间线分支从已验证快照开始，不能混写事件流；
- 使用外部 Provider 时，日志脱敏并记录有限的耗时、重试和成本信息。

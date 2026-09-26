# Ashfall Circuit Viewer

这是第一版世界的独立静态查看器，展示 60 个空间、40 个角色、资源压力和 50 步事件时间线。

在仓库根目录启动：

```bash
python3 -m http.server 4173
```

然后打开：<http://localhost:4173/viewer/>。

查看器默认读取 `worlds/ashfall-circuit-v0.2-scale` 的 JSON 和 NDJSON 文件，不调用外部模型，也不会修改世界状态。也可以通过 `?world=../worlds/ashfall-circuit-v0.1` 查看旧版小规模工作区。

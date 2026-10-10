# 本地测试与发布指南

> 面向首次开发 Obsidian 插件的使用者：从把插件装进你的知识库，到日常调试，再到正式发布。命令都在项目根目录执行。

## 1. 一次性配置

部署目标库的路径由项目根目录的 `deploy.config.json` 控制（该文件不入 git，换机器/换库随时改）：

```bash
cp deploy.config.example.json deploy.config.json
```

内容：

```json
{
  "vaultPath": "/path/to/obsidian-vault",
  "pluginId": "note-facet"
}
```

- `vaultPath`：你的 Obsidian 库目录（要换成别的测试库，改这一行即可）。
- `pluginId`：插件目录名，必须与 `manifest.json` 的 `id` 一致，否则 Obsidian 不识别。

## 2. 两种部署模式

| 命令 | 产物 | 用途 |
| --- | --- | --- |
| `npm run deploy:dev` | 不压缩、带 inline sourcemap | 日常开发调试（DevTools 里能看到 TS 源码） |
| `npm run deploy:prod` | 压缩、无 sourcemap | 发布前验证（与正式发布产物一致） |

两条命令都会：构建 `styles.css`（剔除 preflight）→ 构建 `main.js` → 复制 `main.js` / `manifest.json` / `styles.css` 三件套到 `<vaultPath>/.obsidian/plugins/note-facet/`。

## 3. 首次在 Obsidian 中启用

1. `npm install && npm run deploy:dev`。
2. **如果 Obsidian 在部署前就开着，先完全退出（`Cmd+Q`）再重新打开** —— Obsidian 只在启动时扫描插件目录，运行中出现的新插件文件夹不会被发现。
3. 用 Obsidian 打开 `vaultPath` 指向的库。
4. 设置 → 第三方插件：如果提示安全模式，选择"信任作者并启用社区插件"。
5. **往下滚到"已安装的插件"**（不是在"浏览"市场里搜——本地未发布的插件不会出现在市场里），找到 **NoteFacet**，打开开关。
6. 点左侧功能区的放大镜图标，或命令面板（`Cmd+P`）执行「打开知镜面板」，右侧面板出现即成功。

如果列表里看不到 NoteFacet：检查插件目录里三件套是否齐全、目录名是否与 `pluginId` 一致（见 §6 常见问题）。

## 4. 日常开发循环（热更）

```bash
npm run dev   # 一个终端即可：监听源码 → 重建 main.js + styles.css → 自动部署到库
```

`npm run dev` 会在每次保存后自动完成构建和部署（无需再手动 `deploy:dev`）。要让 Obsidian 也跟着自动重载，**在你的库里装一次社区插件 Hot Reload**（设置 → 第三方插件 → 浏览 → 搜 "Hot Reload" → 安装并启用）：它监听插件目录的 `main.js` 变化，自动重载 NoteFacet。两者配合即为完整热更链路：**保存文件 → 约 1 秒后面板就是新版本**。

不想装 Hot Reload 的话，部署后手动重载即可：

- 命令面板 → `Reload app without saving`（最快）；或
- 设置 → 第三方插件 → NoteFacet 关闭再打开。

调试：Obsidian 内按 `Cmd+Option+I` 打开 DevTools；dev 模式的 sourcemap 让你直接断点 TS 源码。`Notice` 提示与报错都在 Console 可见。

> 说明：Hot Reload 是开发辅助插件，只需要装在你的测试库里，与 NoteFacet 的发布产物无关。

## 5. 验收测试

1. 把样本笔记复制进库（例如 `1-inbox/`）：`cp test-files/test-1.md test-files/test-2.md <vaultPath>/1-inbox/`。
2. 打开 test-1，按 [05 · 样本验收与评测](./05-sample-acceptance.md) 的 T1–T10 逐条操作并记录结果（§7 有记录表模板）。
3. 至少再开几篇你自己的普通长文笔记，确认面板显示"没有可解析的分析字段"或标题概览，而不是报错。
4. 发布前用 `npm run deploy:prod` 重新部署并重载，把关键任务再跑一遍——dev 与 prod 的产物不同，必须以 prod 为准。

## 6. 正式发布到社区目录

前置条件：`npm run check` 全绿（本地已过官方 `eslint-plugin-obsidianmd` 预检，能显著减少 review 打回）。

1. **版本三处一致**：`manifest.json` 的 `version`、git tag（如 `0.1.0`）、`versions.json` 里的键（值为最低兼容的 Obsidian 版本）。
2. **名称查重**：在 [社区插件目录](https://obsidian.md/plugins) 搜 "NoteFacet"，确认无重名（`id` 和 `name` 都不能含 "Obsidian"）。
3. **推到 public GitHub 仓库**：代码公开，含 README 与 LICENSE。注意 `main.js`/`styles.css` 在 `.gitignore` 中，发布产物走 Release 附件而非仓库。
4. **创建 GitHub Release**：tag 与版本一致，附件上传 `main.js`、`manifest.json`、`styles.css` 三个文件。
5. **提交收录 PR**：fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)，在 `community-plugins.json` 末尾追加条目（`id`/`name`/`author`/`description`/`repo`），提 PR，按 review 评论修改直至合并。
6. 合并后用户在社区插件市场即可搜索安装。正式发布前想小范围测试，可让别人用 **BRAT** 插件直接装你的 GitHub 仓库 beta 版。

完整规则以官方文档为准：[Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)、[Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)，亦见 [06 §5](./06-tech-selection.md)。

## 7. 常见问题

| 现象 | 排查 |
| --- | --- |
| 插件列表里看不到 | **Obsidian 在部署前就开着：完全退出（Cmd+Q）再打开**；目录名 ≠ `pluginId`；三件套缺文件；库路径写错（确认 `<vaultPath>/.obsidian/plugins/note-facet/` 真实存在） |
| 在社区市场搜不到 | 正常：未发布的本地插件不在"浏览"里，在"已安装的插件"列表（第三方插件页往下滚） |
| 改动没生效 | 忘了重新 `deploy:dev`，或部署后没重载插件 |
| 面板样式错乱/无样式 | `styles.css` 没部署或 Tailwind 类缺 `nf:` 前缀；确认构建经过 `scripts/build-css.mjs` |
| 点"定位字段"没反应 | 面板会弹 Notice 说明原因（字段已变化/歧义）；DevTools Console 看详细报错 |
| 面板空白 | DevTools Console 看 React 报错；`npm run check` 确认本地全绿后再部署 |
| 想换一个库测试 | 改 `deploy.config.json` 的 `vaultPath`，重新 `deploy:dev` 即可，无需动其他配置 |

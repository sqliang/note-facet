# NoteFacet · 知镜

> 状态：初版实现（P0 阅读闭环）已于 2026-10-10 在真实 Obsidian 库中完成运行验收，T1–T10 交互任务与异常用例全部通过。验收任务、通过条件与验证记录见 [docs/05](./docs/05-sample-acceptance.md)。

**打开一篇笔记，看清多维判断，沿着依据找到重点。**

NoteFacet 是一个 Obsidian 插件：在右侧面板中把笔记 YAML 里的多维分析字段（评分、置信度、风险、机会、对象洞察等）组织成可探索的阅读视图——先看概览与维度分布，再进入单项详情核对理由，最后一键定位到 YAML 字段原文。Markdown 始终是原始数据来源，插件不重新给笔记打分、不写回笔记。

## 功能（当前版本）

- **概览**：摘要（已有字段优先、标注来源）、三个主指标（影响力 / 复利价值 / 炒作程度）与原值展示（量程未配置，不画比例图）。
- **维度入口**：风险分类（4 类 + 补充）、机会、对象（mention 与 insight 按身份合并）、影响分组、内容结构、其他判断；条目点击进入唯一详情。
- **聚焦详情**：值 + 置信度 + 理由忠实预览；依据区提供「定位字段」（精确到 YAML 源范围）与「外部来源」两个独立操作。
- **锁定**：固定笔记（面板不跟随切换）与固定关注（记住「笔记 + 条目」，一键跳回；原条目消失时提示而非顶替）。
- **边界**：状态类字段（extraction_status 等 6 个）排除在指标模型之外；null 信号显示「未提供」，不是零值；空文档显示占位提示。

## 设计文档

| 文档 | 内容 |
| --- | --- |
| [docs/01](./docs/01-product-assessment.md) | 评估与定位：样本发现、场景、优先级 |
| [docs/02](./docs/02-product-and-interaction.md) | 产品与交互：信息层次、密度预算、锁定 |
| [docs/03](./docs/03-implementation-and-validation.md) | 实施与验证：数据契约、定位层、一致性 |
| [docs/04](./docs/04-sample-and-metric-catalog.md) | 样本与指标字典：37 个字段的去向 |
| [docs/05](./docs/05-sample-acceptance.md) | 样本验收与评测：任务与通过条件 |
| [docs/06](./docs/06-tech-selection.md) | 技术选型与 Obsidian 开发规则 |

## 技术栈

TypeScript · esbuild · React 19 · zustand · Tailwind CSS 4（`nf-` 前缀、无 preflight）· vitest。选型理由见 [docs/06](./docs/06-tech-selection.md)。

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 开发主循环：watch 重建 + 自动部署到库（配 Hot Reload 插件即热更）
npm run check        # typecheck + eslint + 单测（改动后必跑）
npm run build        # 生产构建：styles.css + main.js
npm run deploy:dev   # 手动补发一次开发构建（一般用 npm run dev 即可）
npm run deploy:prod  # 生产构建并部署到本地库（发布前验证）
```

装入测试库：配置好 `deploy.config.json`（从 `deploy.config.example.json` 复制）后运行 `npm run deploy:dev`，在 Obsidian 设置中启用 NoteFacet。完整的首次启用、调试循环与发布流程见 [docs/07 · 本地测试与发布指南](./docs/07-testing-and-release-guide.md)。

## 测试与质量

- 纯逻辑（解析、字段映射、指标适配、状态机）全部单元测试先行（TDD），样本驱动断言基于 `test-files/` 真实样本。
- `npm run check` = `tsc --noEmit` + `eslint`（含官方 `eslint-plugin-obsidianmd` 规则）+ `vitest run`，三者全绿才算改动完成。
- Obsidian 宿主行为（面板渲染、定位跳转、模式切换）按 [docs/05](./docs/05-sample-acceptance.md) 的任务清单人工验收，P0 已于 2026-10-10 通过。

## License

MIT

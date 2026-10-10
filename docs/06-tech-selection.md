# 技术选型与插件开发规则

> 本文决定实现技术栈，并汇总 Obsidian 官方硬性规范与本项目的注意事项。交互与视觉约束仍以 [02](./02-product-and-interaction.md) 为准，数据契约与定位层以 [03](./03-implementation-and-validation.md) 为准。外部资料查阅日期：2026-09-19。

## 1. 结论：推荐技术栈

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 语言 | TypeScript（strict） | 官方模板默认；字段适配层需要类型守卫（03 §3） |
| 构建 | **esbuild**（官方模板方案） | 产物正是 Obsidian 需要的单文件 CJS `main.js`；零配置 external `obsidian`/`electron`；构建快，watch 模式即够 |
| UI 框架 | **React 19**（`react-dom/client`） | 开发者熟练度高；`createRoot` 挂进 `ItemView` 容器是社区成熟做法；面板交互（选择、钻取、固定关注）组件化收益大 |
| 状态 | **zustand** | 面板会话状态（当前目标、选中条目、固定关注）天然适合外置 store；与 React 生命周期解耦，便于版本核对时丢弃过期快照 |
| 样式 | **Tailwind CSS 4（加前缀、关 preflight）** | 开发者熟练；但必须隔离宿主样式（§4），颜色一律映射 Obsidian 主题变量 |
| 图形 | 手写 SVG + React | 分类格、点位刻度、步骤条都很简单；不引入图布局引擎（03 §1） |
| 测试 | **vitest**（纯逻辑单测） | 只测解析、映射、排除、定位等纯函数；宿主行为按 [05](./05-sample-acceptance.md) 实测，不用 jsdom 模拟 Obsidian |

版本一律以安装时最新稳定版为准并锁定进 `package.json` / lockfile；不预装"可能用得上"的依赖。

## 2. 关键权衡

### 构建：为什么是 esbuild 而不是 Vite

Obsidian 加载插件的方式是读取插件目录下的单文件 `main.js`（CommonJS），并在宿主中注入 `obsidian`、`electron` 等模块——没有 index.html，也没有 dev server 的用武之地。Vite 的 lib 模式确实能产出这种 bundle（社区也有 [vite-plugin-obsidian](https://jsr.io/@codewithcheese/vite-plugin-obsidian) 这类方案），但相对于 esbuild 多一层配置，换到的 HMR 在 Obsidian 宿主内并不能直接生效（社区热重载本身依赖另一个插件轮询文件变化）。结论：

- **生产与开发构建都用 esbuild**：`bundle: true`、`format: 'cjs'`、`external: ['obsidian', 'electron', ...node builtins]`、`target` 与 `minAppVersion` 匹配、dev 开 sourcemap。
- **vite 生态仍以 vitest 形式保留**：测试运行器不参与产物构建，零冲突。
- 开发热更新：esbuild watch + 社区 hot-reload 插件（或软链到测试库 `.obsidian/plugins/` 下手动重载）。

### UI：为什么不用 Svelte / 原生 DOM

Svelte 在 Obsidian 社区同样流行且包体更小；原生 DOM 最轻（03 早期草案曾倾向它）。但本项目的交互密度（维度钻取、唯一详情切换、固定关注条、键盘可达性）会快速放大命令式 DOM 的维护成本，而开发者的 React 19 熟练度是确定的效率来源。React + ReactDOM 增加约 40–50KB（gzip）产物，对桌面插件可接受；代价记为已知取舍，不再叠加 MUI/AntD 等组件全家桶。

### 样式：Tailwind 4 在宿主环境里的正确用法

Obsidian 宿主（主题、其他插件）共享同一全局 CSS 命名空间，Tailwind 默认产物有两个冲突源：

1. **preflight（全局 reset）会改写宿主元素样式** —— 必须禁用（v4：`@import "tailwindcss/theme" layer(theme)` + `@import "tailwindcss/utilities" layer(utilities)`，不引入 preflight；或只导入 utilities）。
2. **工具类名可能与主题/其他插件撞名** —— v4 支持 `@import "tailwindcss" prefix(nf)` 形式统一加前缀，本项目固定前缀 `nf`（NoteFacet），与自写 CSS 类名前缀一致。

颜色不得使用 Tailwind 调色板直出：`@theme` 里把语义色映射到 Obsidian 变量（`--background-primary`、`--text-normal`、`--text-accent`、`--interactive-accent` 等），保证跟随用户主题、明暗模式与对比度要求（02 §8）。构建产物输出为插件目录约定的 `styles.css`。

### 组件库

不引入成品组件库（MUI/AntD/Chakra 等），理由有三：包体预算（§6 的 <500KB 约束，React 已占大头）；自带设计语言与全局样式注入会和 Obsidian 主题体系冲突，面板应"看起来像 Obsidian"；02 的组件清单（指标行、分类格、刻度、步骤条、关注条）本就是定制可视化元素，成品库中并不存在。

设置页用 Obsidian 原生 `Setting`/`ButtonComponent`（自动符合官方"设置页使用原生组件"的审核期望）；面板内元素自绘。真正难写的是行为而非样式：popover、tooltip、焦点管理/焦点陷阱（02 §4 要求返回后恢复焦点）。首次遇到这类需求时，按个引入 Radix Primitives 无头原语（单个约几 KB、可摇树），不整包引入。

shadcn/ui 是可接受的中间路线：它是源码复制而非依赖，技术栈（React + Tailwind + Radix）与本项目同构。如需加速，可按需复制单个组件再改造为 `nf-` 前缀与 Obsidian 主题变量；其自带的 preflight/全局 token 必须按 §2 隔离规则裁剪，且不整批复制——否则等同于变相引入组件库。

## 3. 依赖与产物清单

```text
dependencies:      （全部打进 main.js，无运行时外部依赖）
  react, react-dom, zustand
devDependencies:
  typescript, esbuild, obsidian（类型包）, vitest,
  tailwindcss @tailwindcss/cli（或 postcss 集成）,
  eslint + eslint-plugin-obsidianmd（官方规范本地检查）
```

产物与仓库布局（对应社区目录提交要求）：

| 文件 | 说明 |
| --- | --- |
| `manifest.json` | `id`、`name`、`version`、`minAppVersion`、`description`、`author`；`id` 与 `name` 不得含 "Obsidian" |
| `main.js` | esbuild 单文件产物，CJS，external 宿主模块 |
| `styles.css` | Tailwind 产物 + 少量自写样式 |
| `versions.json` | 版本号 → `minAppVersion` 映射，发布时维护 |

移动端：首版仅桌面验收（03 §1）。实现上**不调用 Node/Electron 专有 API**（文件访问一律走 `Vault`/`adapter` 公开接口），这样后续验证移动端时不需要改 `isDesktopOnly: true`；在移动端验收完成前，README 与发布说明如实标注"仅桌面验证"。

## 4. 与既有设计的对接约束

| 设计约束（出处） | 技术落点 |
| --- | --- |
| 数据归属：会话状态 vs 持久偏好（03 §2） | zustand 只存会话视图状态（当前目标、选中、固定关注）；显示偏好走 `Plugin.loadData/saveData`，与临时关注分开存储 |
| 版本一致性：过期快照丢弃（03 §5） | store 内每条数据携带 `contentVersion`；视图渲染前比对，不符即弃，不渲染混合状态 |
| 安全：不拼接 HTML、外链白名单（03 §3） | React 默认转义，**禁用 `dangerouslySetInnerHTML`**；外链渲染前校验协议（仅 `https:`/`http:`） |
| 可访问性：Tab/Enter/Esc、无动画漂移、200% 缩放（02 §8） | 自绘图形配真实 `<button>`/文本标签，焦点样式跟随主题变量；不用 canvas 画可交互内容 |
| 性能：面板隐藏暂停渲染、卸载释放（03 §5） | `ItemView.onClose` 中 `root.unmount()` 并清空 store；`Workspace` 事件全部经 `registerEvent` 注册 |
| YAML 定位层（03 §4） | 解析库必须纯前端可运行、保留语法节点位置；打进 bundle，S0 阶段先验证再定型 |

## 5. Obsidian 官方开发规则（硬性）

来源：[Developer policies](https://docs.obsidian.md/Developer+policies)、[Submission requirements for plugins](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)、[Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)、[obsidian-releases](https://github.com/obsidianmd/obsidian-releases)。以下为与本项目直接相关的条目，提交前以原文为准。

**政策与合规**

- 网络调用默认关闭、任何遥测/远程请求必须在 README 显著披露；无混淆代码；不损害用户数据（对应 03 §7 的 AI 边界）。
- 仓库必须 public，含 README（说明用途与用法）、LICENSE；赞助链接只允许走 manifest 的 `fundingUrl`。
- 如实声明桌面/移动端能力；用了 Node/Electron API 就必须 `isDesktopOnly: true`。

**代码规范（人工 review 高频打回点）**

- 不用全局 `app`，一律 `this.app`；`window`/`document` 监听用 `this.registerDomEvent`，Obsidian 事件用 `this.registerEvent`，定时器用 `this.registerInterval` —— 保证卸载自动清理。
- 不手工 `detachLeaves`、不接管视图生命周期；重活等 `onLayoutReady` 之后，`onload` 保持轻量。
- 禁止把笔记/字段内容经 `innerHTML` 类路径注入 DOM（官方明确要求，亦与 03 §3 一致）。
- 样式不覆盖全局选择器、不滥用 `!important`、类名带插件前缀（与 §2 前缀约定一致）。
- 设置数据只经 `loadData/saveData`；不读写插件目录外的 `.obsidian` 文件。
- 不用已弃用 API；`minAppVersion` 与实际调用的 API 匹配。
- 本地用官方 `eslint-plugin-obsidianmd` 预检（官方插件审核工具链），提交前跑通。

**发布流程**

1. 代码推 public GitHub 仓库；`manifest.json` 版本号与 git tag 一致。
2. GitHub Release 的 tag 与版本一致，附件含 `main.js`、`manifest.json`、`styles.css`。
3. Fork [obsidian-releases](https://github.com/obsidianmd/obsidian-releases)，在 `community-plugins.json` 追加条目并提 PR；按 review 评论修改直至合并。
4. 正式发布前完成名称查重（01 §6）；beta 阶段可用 BRAT 分发，不计入正式发布。

## 6. 本项目额外注意事项

- **包体预算**：`main.js`（gzip）目标 < 500KB；React 占大头，新增依赖前先看体积；YAML 解析库选型纳入 S0 对比记录。
- **构建校验**：CI 至少跑 `tsc --noEmit`、eslint（含 obsidianmd 规则）、vitest、esbuild 产物存在性与 external 检查（产物中不得出现 `require("obsidian")` 被打包进去）。
- **React 与宿主边界**：React 树只存在于面板容器内；正文/YAML 的渲染与定位高亮走 Obsidian 编辑器 API，不在 React 内重绘笔记内容，避免两套事实源。
- **主题适配测试矩阵**：默认主题明/暗 + 至少一个流行第三方主题，320px 宽与 200% 缩放（02 §8、05 §5）。
- **升级策略**：React/Tailwind 大版本升级与插件功能迭代分开进行；Obsidian `minAppVersion` 提升视为破坏性变更，单独发版说明。

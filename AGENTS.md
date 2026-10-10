# AGENTS.md — NoteFacet（知镜）开发指南

本文件指导后续 Agent（与人类协作者）在本仓库中生成代码。**改动完成后必须通过 `npm run check`（typecheck + eslint + vitest）再声称完成。**

## 项目是什么

Obsidian 插件：把笔记 YAML 中的多维分析字段组织成右侧阅读面板（概览 → 维度 → 单项详情 → YAML 定位）。设计规格在 `docs/`，其中 `docs/04` 是字段语义的唯一权威来源；代码与文档冲突时先停下来对齐，不要各自发挥。

## 架构与目录职责

```
src/
  main.ts                  插件入口：注册视图/命令/设置，保持轻量
  core/                    纯逻辑，禁止 import "obsidian"（必须可在 vitest 中运行）
    types.ts               数据契约（NoteViewModel、FacetItem 等）
    hash.ts                内容版本指纹
    frontmatter.ts         frontmatter 识别 + YAML 路径→源范围映射
    locate.ts              定位前的目标恢复（数组重排按指纹唯一恢复，禁止错跳）
    parsed-note.ts         ParsedNote 类型
    field-map.ts           字段角色表 + 状态排除集
    summary.ts             摘要优先级
    facet-builder.ts       解析结果 → 视图模型（适配层，唯一允许理解字段语义的地方）
  state/
    panel-store.ts         zustand 会话状态机（禁止 import "obsidian"）
  settings/                设置类型与设置页（设置页用 Obsidian 原生 Setting 组件）
  view/
    facet-view.ts          ItemView 宿主：事件订阅、快照发布、定位动作
    constants.ts           视图常量
    react/                 React 组件（薄层：从 store 读状态，经 PanelActions 调宿主）
    styles/main.css        Tailwind 源（构建产物是根目录 styles.css）
tests/                     vitest 单测，样本驱动（test-files/ 为夹具）
scripts/build-css.mjs      CSS 构建（剔除 preflight）
scripts/dev.mjs            dev watch：重建即自动部署（deploy 逻辑在 lib-deploy.mjs）
scripts/deploy.mjs         一次性 dev/prod 部署
```

数据流：Vault 文件 → `parseNote` → `buildNoteView` → `publishSnapshot` → React 渲染。组件不允许绕过这条链自己读文件或解析 YAML。

## 硬性规则

### TDD（本仓库强制）

1. 先写失败测试（RED）：新行为必须有对应断言，运行看到失败。
2. 写最小实现（GREEN）：只写到测试通过，不预先扩展。
3. 重构保持绿灯。宿主相关胶水（Obsidian API 调用）无法单测，但必须把逻辑抽进 `core/` 或 `state/` 的纯函数后再薄调用。
4. 测试夹具优先用 `test-files/` 真实样本；修改样本会同步影响 `docs/05` 的预期，需一起更新。

### 状态排除（产品红线）

`extraction_status`、`pipeline_stage`、`extract_result`、`epistemic_status`、`engineering_complexity`、`actionable_insight` 永远不得进入视图模型的展示数据。新增字段先查 `docs/04` 判定是否状态类，再改 `field-map.ts` 和对应测试。

### 量程与枚举纪律

- 数值只显示原值；`scaleConfigured` 在量程配置体系落地前永远 `false`。禁止进度条、百分比、雷达图、综合分、跨指标排名。
- `high/medium/low` 只做中文显示映射（`view/react/labels.ts`），禁止数值化；未知枚举保留原值。
- null ≠ 零值：用 `Availability`（present/missing/null/empty/invalid）区分。

### 类型与代码风格

- 禁止 `any`；`unknown` 必须收窄后使用；`import type` 显式标注（`consistent-type-imports`）。
- 每个源码文件必须有文件头注释（说明职责与关键约束）；每个 exported 函数/类必须有注释；核心业务逻辑（排除、合并、定位、版本守卫）必须有行内说明注释。注释说「为什么」，不复述代码。
- 组件样式只用 `nf:` 前缀工具类 + Obsidian 主题变量（`--color-nf-*` token），禁止新增裸类名、禁止 Tailwind 调色板直出颜色、禁止改动 `scripts/build-css.mjs` 的 preflight 剔除逻辑。
- React 内禁止 `dangerouslySetInnerHTML`；外链渲染前校验 `https?://`。

### Obsidian 官方规范（review 高频打回点）

- 不用全局 `app`；事件一律 `registerEvent`/`registerDomEvent`，定时器要可清理。
- 不写回用户笔记；设置只经 `loadData/saveData`；`onload` 保持轻量。
- 不引入成品 UI 组件库；复杂原语（popover/焦点陷阱）确有需要时按个引入 Radix Primitives，并在 PR 说明理由。

## 常用命令

```bash
npm run check     # typecheck + eslint + vitest，完成定义
npm run test      # 只跑单测
npm run build     # 生产构建（styles.css + main.js）
npm run dev       # watch 重建 + 自动部署到库（scripts/dev.mjs，见 docs/07）
npm run deploy:dev / deploy:prod  # 一次性手动部署（scripts/deploy.mjs）
```

## 验证之后

功能改动完成的标准：`npm run check` 全绿 + 涉及的行为在 `docs/05` 有对应任务且预期已更新。宿主行为（面板渲染、定位跳转）单测覆盖不到，必须在报告中如实说明「未在 Obsidian 内实测」。

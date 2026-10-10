/**
 * view/facet-view.ts — 面板宿主视图（ItemView）。
 * 职责（docs/03 §2/§5）：目标跟踪 → 快照读取 → 解析 → 发布视图快照 → 定位。
 * - 竞态守卫：发起异步读取前声明 expectTarget，乱序到达的快照由 store 丢弃；
 * - 生命周期：删除立即使目标/固定状态失效，重命名迁移引用而非解除；
 * - 定位前基于最新文本重新解析并按文本指纹恢复路径，失败提示而非错跳；
 * - React 树只存在于面板容器内，onClose 时完整卸载。
 */
import { ItemView, MarkdownView, Notice, TFile } from "obsidian";
import type { TAbstractFile, WorkspaceLeaf } from "obsidian";
import type { Root } from "react-dom/client";
import type { StoreApi } from "zustand/vanilla";
import { buildNoteView } from "../core/facet-builder";
import { parseNote } from "../core/frontmatter";
import { relocatePath } from "../core/locate";
import type { PathPart } from "../core/types";
import type { SummaryPresetSetting } from "../settings/settings";
import { createPanelStore } from "../state/panel-store";
import type { PanelState } from "../state/panel-store";
import { mountPanel } from "./react/mount";
import type { PanelActions } from "./react/mount";
import {
  REFRESH_DEBOUNCE_MS,
  VIEW_DISPLAY_NAME,
  VIEW_ICON,
  VIEW_TYPE_NOTE_FACET,
} from "./constants";

/** 视图需要宿主插件提供的能力（避免与 main.ts 循环依赖）。 */
export interface FacetViewDeps {
  getSummaryPreset: () => SummaryPresetSetting;
}

/** NoteFacet 阅读面板视图。 */
export class FacetView extends ItemView {
  private readonly deps: FacetViewDeps;
  private readonly store: StoreApi<PanelState>;
  private reactRoot: Root | null = null;
  private refreshTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf, deps: FacetViewDeps) {
    super(leaf);
    this.deps = deps;
    this.store = createPanelStore();
  }

  override getViewType(): string {
    return VIEW_TYPE_NOTE_FACET;
  }

  override getDisplayText(): string {
    return VIEW_DISPLAY_NAME;
  }

  override getIcon(): string {
    return VIEW_ICON;
  }

  /** 挂载 React 树并订阅 Vault / Workspace 事件。 */
  override async onOpen(): Promise<void> {
    const actions: PanelActions = {
      locateField: (notePath, path, expectedText) =>
        void this.locateField(notePath, path, expectedText),
      openExternal: (url) => this.openExternal(url),
      openNote: (notePath) => void this.openNote(notePath),
    };
    this.reactRoot = mountPanel(this.contentEl, this.store, actions);

    // 目标切换统一走防抖刷新；registerEvent 保证卸载自动清理
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.scheduleRefresh()));
    // 编辑刷新只关心当前目标文件，其他文件的保存不触发重读（性能约束）
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file.path === this.store.getState().target?.path) this.scheduleRefresh();
      }),
    );
    // 删除立即使相关状态失效，不残留旧快照（docs/03 §5）
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.store.getState().invalidatePath(file.path);
        this.scheduleRefresh();
      }),
    );
    // 重命名迁移引用，固定状态随路径更新（docs/03 §5）
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => this.handleRename(file, oldPath)),
    );
    this.register(this.clearRefreshTimer.bind(this));

    await this.refresh();
  }

  /** 卸载 React 树（store 随视图实例回收）。 */
  // eslint-disable-next-line @typescript-eslint/require-await -- Obsidian 基类签名为 Promise<void>，本实现无异步工作
  override async onClose(): Promise<void> {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  /** 重命名迁移：目标、固定笔记与固定关注的路径同步更新。 */
  private handleRename(file: TAbstractFile, oldPath: string): void {
    if (!(file instanceof TFile)) return;
    this.store.getState().renamePath(oldPath, file.path);
    this.scheduleRefresh();
  }

  /** 防抖调度刷新（编辑场景 200ms 起点值）。 */
  private scheduleRefresh(): void {
    this.clearRefreshTimer();
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 确定当前目标路径：固定笔记优先；否则取最近激活的 Markdown 编辑器；
   * 侧栏激活导致没有 Markdown 视图时，保留最近有效目标。
   */
  private resolveTargetPath(): string | null {
    const state = this.store.getState();
    if (state.pinnedNotePath) return state.pinnedNotePath;
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    return active?.file?.path ?? state.target?.path ?? null;
  }

  /** 读取目标笔记并发布新视图快照。 */
  private async refresh(): Promise<void> {
    const path = this.resolveTargetPath();
    if (!path) return;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      // 目标已不可达（删除/同步中断）：使状态失效而不是显示旧快照
      this.store.getState().invalidatePath(path);
      return;
    }

    // 竞态守卫（B1）：读取前声明期望目标；期间切走的话，本次结果将被 store 丢弃
    this.store.getState().expectTarget(path);
    const text = await this.app.vault.cachedRead(file);
    const preset = this.deps.getSummaryPreset();
    const view = buildNoteView(
      parseNote(text),
      path,
      preset === "auto" ? undefined : preset,
    );
    this.store.getState().publishSnapshot(
      { path, contentVersion: view.contentVersion },
      view,
    );
  }

  /** 优先复用已打开该文件的 Markdown 叶子，避免连续定位堆积页签。 */
  private findOpenLeaf(notePath: string): WorkspaceLeaf | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.file?.path === notePath) return leaf;
    }
    return null;
  }

  /**
   * 定位 YAML 字段：基于最新文本重新解析，并按展示时的原文指纹恢复路径
   * （数组重排唯一匹配才改下标；重复/消失拒绝定位，禁止错跳，docs/03 §4）。
   */
  private async locateField(
    notePath: string,
    path: PathPart[],
    expectedText?: unknown,
  ): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (!(file instanceof TFile)) {
      new Notice("知镜：笔记已不存在，无法定位");
      return;
    }
    const parsed = parseNote(await this.app.vault.cachedRead(file));
    const resolved = relocatePath(parsed, path, expectedText);
    const range = resolved ? parsed.rangeOf(resolved) : null;
    if (!range) {
      new Notice("知镜：内容已变化，无法唯一恢复目标，请重新选择");
      return;
    }

    const leaf = this.findOpenLeaf(notePath) ?? this.app.workspace.getLeaf("tab");
    await leaf.openFile(file);
    if (!(leaf.view instanceof MarkdownView)) return;
    // 阅读模式无法显示 YAML：切到源码模式再定位，不修改文件内容
    if (leaf.view.getMode() !== "source") {
      await leaf.setViewState({
        type: "markdown",
        state: { file: notePath, mode: "source" },
      });
    }
    const editor = leaf.view.editor;
    const from = editor.offsetToPos(range.from);
    const to = editor.offsetToPos(range.to);
    editor.setSelection(from, to);
    editor.scrollIntoView({ from, to }, true);
  }

  /** 在新页签打开笔记（固定关注跨笔记跳转）。 */
  private async openNote(notePath: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf("tab").openFile(file);
    }
  }

  /** 打开外部链接：仅允许 http/https 协议（docs/03 §3 安全约束）。 */
  private openExternal(url: string): void {
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener");
    } else {
      new Notice("知镜：不支持的外部链接协议");
    }
  }
}

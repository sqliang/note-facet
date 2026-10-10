/**
 * main.ts — 插件入口。
 * 注册面板视图、功能区图标、命令与设置页；onload 保持轻量，
 * 不接管视图生命周期、不在卸载时 detach 叶子（官方规范）。
 */
import { Plugin } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { NoteFacetSettingTab } from "./settings/settings-tab";
import { isSummaryPresetSetting } from "./settings/settings";
import { DEFAULT_SETTINGS } from "./settings/settings";
import type { NoteFacetSettings } from "./settings/settings";
import { FacetView } from "./view/facet-view";
import { VIEW_TYPE_NOTE_FACET } from "./view/constants";

/** NoteFacet（知镜）插件。 */
export default class NoteFacetPlugin extends Plugin {
  settings: NoteFacetSettings = { ...DEFAULT_SETTINGS };

  override async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_NOTE_FACET,
      (leaf: WorkspaceLeaf) =>
        new FacetView(leaf, { getSummaryPreset: () => this.settings.summaryPreset }),
    );

    this.addRibbonIcon("scan-search", "打开知镜面板", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-note-facet-panel",
      name: "打开知镜面板",
      callback: () => void this.activateView(),
    });

    this.addSettingTab(new NoteFacetSettingTab(this.app, this));
  }

  /** 读取持久化设置，逐字段校验后与默认值合并（损坏数据不污染设置）。 */
  async loadSettings(): Promise<void> {
    const data: unknown = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS };
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      const preset = (data as Record<string, unknown>)["summaryPreset"];
      if (isSummaryPresetSetting(preset)) this.settings.summaryPreset = preset;
    }
  }

  /** 保存设置。 */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** 激活或创建右侧面板中的知镜视图。 */
  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_NOTE_FACET);
    if (existing.length > 0 && existing[0]) {
      void workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_NOTE_FACET, active: true });
      void workspace.revealLeaf(leaf);
    }
  }
}

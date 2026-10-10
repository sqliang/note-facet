/**
 * settings/settings-tab.ts — 设置页。
 * 使用 Obsidian 原生 Setting 组件（官方审核期望），不引入自定义表单框架。
 */
import { Setting } from "obsidian";
import { PluginSettingTab } from "obsidian";
import type { App } from "obsidian";
import type NoteFacetPlugin from "../main";
import { isSummaryPresetSetting } from "./settings";

/** 知镜设置页：摘要预设等显示偏好。 */
export class NoteFacetSettingTab extends PluginSettingTab {
  private readonly plugin: NoteFacetPlugin;

  constructor(app: App, plugin: NoteFacetPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 摘要预设：auto 自动判断；analysis/normal 显式覆盖（docs/04 §6）
    new Setting(containerEl)
      .setName("摘要预设")
      .setDesc("自动：按笔记结构判断；分析摘录：tldr → 已有概述 → 来源描述；普通：summary → abstract → tldr。")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            auto: "自动",
            analysis: "结构化分析摘录",
            normal: "普通笔记",
          })
          .setValue(this.plugin.settings.summaryPreset)
          .onChange((value) => {
            if (isSummaryPresetSetting(value)) {
              this.plugin.settings.summaryPreset = value;
              void this.plugin.saveSettings();
            }
          }),
      );
  }
}

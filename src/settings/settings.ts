/**
 * settings/settings.ts — 插件设置的类型与默认值。
 * 通过 Plugin.loadData/saveData 持久化；会话状态（选中、固定关注）不进设置
 * （docs/03 §2 数据归属）。
 */

/** 摘要预设：auto 按笔记结构自动判断，analysis/normal 为显式覆盖。 */
export type SummaryPresetSetting = "auto" | "analysis" | "normal";

/** 插件持久化设置。 */
export interface NoteFacetSettings {
  summaryPreset: SummaryPresetSetting;
}

/** 默认设置：首次打开无需配置即可使用。 */
export const DEFAULT_SETTINGS: NoteFacetSettings = {
  summaryPreset: "auto",
};

/** 运行时守卫：只接受合法枚举，避免损坏的持久化数据污染设置。 */
export function isSummaryPresetSetting(value: unknown): value is SummaryPresetSetting {
  return value === "auto" || value === "analysis" || value === "normal";
}

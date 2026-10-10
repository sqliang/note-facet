/**
 * core/summary.ts — 摘要优先级与回退（docs/04 §6）。
 * 已有摘要优先，永远标注来源字段；无摘要返回 null，
 * 调用方显示“暂无摘要”或标题概览，不把首段伪装成总结。
 */
import type { SummaryChoice } from "./types";

/** 摘要预设：分析笔记与普通笔记的字段优先级不同。 */
export type SummaryPreset = "analysis" | "normal";

/** 各摘要字段的展示标签（来源标注，不称人工总结）。 */
const SOURCE_LABELS: Readonly<Record<string, string>> = {
  tldr: "来自 tldr",
  objective_summary: "已有概述",
  description: "来源描述",
  summary: "已有摘要",
  abstract: "已有摘要",
};

/** 预设对应的字段优先级序列。 */
const PRESET_ORDERS: Readonly<Record<SummaryPreset, readonly string[]>> = {
  analysis: ["tldr", "objective_summary", "description"],
  normal: ["summary", "abstract", "tldr"],
};

/**
 * 按预设优先级选择第一个非空字符串摘要。
 * 空白串与非字符串值视为缺失，继续回退。
 */
export function pickSummary(
  data: Record<string, unknown>,
  preset: SummaryPreset,
): SummaryChoice | null {
  for (const field of PRESET_ORDERS[preset]) {
    const value = data[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return { text: value, sourceField: field, sourceLabel: SOURCE_LABELS[field] ?? field };
    }
  }
  return null;
}

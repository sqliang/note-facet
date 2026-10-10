/**
 * view/react/labels.ts — 枚举值的中文展示标签。
 * 仅做显示映射：high/medium/low → 高/中/低；未知枚举保留原值，
 * 不做数值化或语义猜测（docs/04 §4）。
 */

/** 已知等级枚举的中文标签。 */
const LEVEL_LABELS: Readonly<Record<string, string>> = {
  high: "高",
  medium: "中",
  low: "低",
};

/**
 * 把等级枚举映射为中文标签；未知值原样返回，undefined 显示占位符。
 */
export function displayLevel(value: string | undefined): string {
  if (value === undefined) return "—";
  return LEVEL_LABELS[value] ?? value;
}

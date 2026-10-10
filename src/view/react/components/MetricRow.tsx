/**
 * view/react/components/MetricRow.tsx — 单个主指标行。
 * 用数值、留白与选中边框构成比较入口，不用相对条长暗示可比性；
 * 量程未配置时只显示原值（docs/02 §2-3、docs/04 §4）。
 */
import type { MetricItem } from "../../../core/types";
import { displayLevel } from "../labels";

interface MetricRowProps {
  metric: MetricItem;
  onSelect: (key: string) => void;
}

/** 主指标行：标签 + 原值 + 置信度，点击进入单项详情。 */
export function MetricRow({ metric, onSelect }: MetricRowProps) {
  const displayValue =
    metric.availability === "present"
      ? metric.kind === "category"
        ? displayLevel(String(metric.value))
        : String(metric.value)
      : "—";

  return (
    <button
      type="button"
      className="nf:flex nf:w-full nf:cursor-pointer nf:items-baseline nf:justify-between nf:rounded nf:px-2 nf:py-1.5 nf:text-left hover:nf:bg-(--color-nf-bg-alt)"
      onClick={() => onSelect(`metric:${metric.key}`)}
    >
      <span className="nf:text-sm nf:text-(--color-nf-text)">{metric.label}</span>
      <span className="nf:flex nf:items-baseline nf:gap-2">
        <span className="nf:text-base nf:font-semibold nf:text-(--color-nf-text)">
          {displayValue}
        </span>
        <span className="nf:text-xs nf:text-(--color-nf-muted)">
          置信度：{displayLevel(metric.confidence)}
        </span>
        <span aria-hidden="true" className="nf:text-xs nf:text-(--color-nf-muted)">
          ›
        </span>
      </span>
    </button>
  );
}

/**
 * view/react/components/DimensionGrid.tsx — 维度入口网格。
 * 先看分布（条目数量），再选关注点：卡片只表示内容规模，
 * 不表示强弱、优先级或独立证据数量（docs/02 §2-3）。
 * 卡片点击展开紧凑条目列表，条目点击进入唯一详情。
 */
import { useState } from "react";
import type { NoteViewModel } from "../../../core/types";
import { displayLevel } from "../labels";

interface DimensionGridProps {
  view: NoteViewModel;
  onSelect: (key: string) => void;
}

/** 维度定义：卡片标题、规模摘要与条目渲染。 */
interface DimensionDef {
  key: string;
  title: string;
  summary: string;
  entries: Array<{ itemKey: string; label: string }>;
}

/** 从视图模型汇总各维度卡片数据。 */
function buildDimensions(view: NoteViewModel): DimensionDef[] {
  const dimensions: DimensionDef[] = [];
  if (view.risks.length > 0 || view.riskAdditional.length > 0) {
    dimensions.push({
      key: "risks",
      title: "风险",
      summary: `${view.risks.length} 类${view.riskAdditional.length > 0 ? ` + ${view.riskAdditional.length} 补充` : ""}`,
      entries: [
        ...view.risks.map((r) => ({ itemKey: `risk:${r.category}`, label: r.label })),
        ...view.riskAdditional.map((a) => ({
          itemKey: `risk-additional:${a.index}`,
          label: `补充 ${a.index + 1}`,
        })),
      ],
    });
  }
  if (view.opportunities.length > 0) {
    dimensions.push({
      key: "opportunities",
      title: "机会",
      summary: `${view.opportunities.length} 条`,
      entries: view.opportunities.map((o) => ({
        itemKey: `opportunity:${o.index}`,
        label: `机会 ${o.index + 1}`,
      })),
    });
  }
  if (view.objects.length > 0) {
    dimensions.push({
      key: "objects",
      title: "对象",
      summary: `${view.objects.length} 个主体`,
      entries: view.objects.map((o) => ({
        itemKey: `object:${o.key}`,
        label: o.name,
      })),
    });
  }
  if (view.logicFlow.length > 0) {
    dimensions.push({
      key: "logic",
      title: "内容结构",
      summary: `${view.logicFlow.length} 步`,
      entries: view.logicFlow.map((_, i) => ({
        itemKey: `logic:${i}`,
        label: `第 ${i + 1} 步`,
      })),
    });
  }
  if (view.miscJudgments.length > 0) {
    dimensions.push({
      key: "misc",
      title: "其他判断",
      summary: `${view.miscJudgments.length} 项`,
      entries: view.miscJudgments.map((j) => ({
        itemKey: `misc:${j.key}`,
        label: `${j.label}：${displayLevel(j.value)}`,
      })),
    });
  }
  return dimensions;
}

/** 维度入口网格：2 列卡片 + 展开条目列表。 */
export function DimensionGrid({ view, onSelect }: DimensionGridProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const dimensions = buildDimensions(view);

  if (dimensions.length === 0 && view.impact.beneficiaries.length === 0) return null;

  return (
    <section className="nf:flex nf:flex-col nf:gap-2">
      <h3 className="nf:m-0 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">
        选择关注维度
      </h3>
      <div className="nf:grid nf:grid-cols-2 nf:gap-2">
        {dimensions.map((dim) => (
          <button
            key={dim.key}
            type="button"
            aria-expanded={expandedKey === dim.key}
            className="nf:cursor-pointer nf:rounded nf:border nf:border-(--color-nf-border) nf:px-2 nf:py-1.5 nf:text-left hover:nf:border-(--color-nf-accent)"
            onClick={() => setExpandedKey(expandedKey === dim.key ? null : dim.key)}
          >
            <span className="nf:block nf:text-sm nf:text-(--color-nf-text)">{dim.title}</span>
            <span className="nf:block nf:text-xs nf:text-(--color-nf-muted)">{dim.summary}</span>
          </button>
        ))}
      </div>
      {dimensions
        .filter((dim) => dim.key === expandedKey)
        .map((dim) => (
          <div
            key={dim.key}
            className="nf:flex nf:flex-wrap nf:gap-1 nf:rounded nf:bg-(--color-nf-bg-alt) nf:p-2"
          >
            {dim.entries.map((entry) => (
              <button
                key={entry.itemKey}
                type="button"
                className="nf:cursor-pointer nf:rounded nf:border nf:border-(--color-nf-border) nf:px-2 nf:py-0.5 nf:text-xs nf:text-(--color-nf-text) hover:nf:border-(--color-nf-accent)"
                onClick={() => onSelect(entry.itemKey)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ))}
      {(view.impact.beneficiaries.length > 0 || view.impact.casualties.length > 0) && (
        <div className="nf:grid nf:grid-cols-2 nf:gap-2 nf:text-xs">
          <div className="nf:rounded nf:border nf:border-(--color-nf-border) nf:p-2">
            <p className="nf:m-0 nf:mb-1 nf:font-semibold nf:text-(--color-nf-muted)">受益判断</p>
            <ul className="nf:m-0 nf:list-disc nf:pl-4 nf:text-(--color-nf-text)">
              {view.impact.beneficiaries.map((b, i) => (
                <li key={`b:${i}`}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="nf:rounded nf:border nf:border-(--color-nf-border) nf:p-2">
            <p className="nf:m-0 nf:mb-1 nf:font-semibold nf:text-(--color-nf-muted)">承压判断</p>
            <ul className="nf:m-0 nf:list-disc nf:pl-4 nf:text-(--color-nf-text)">
              {view.impact.casualties.map((c, i) => (
                <li key={`c:${i}`}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * view/react/components/OverviewPanel.tsx — 概览层。
 * 密度预算（docs/02 §1）：摘要最多 3 行、指标 3 行，不铺长理由；
 * 全量字段经维度入口与详情可达，不要求同屏可见。
 */
import { useState } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import type { NoteViewModel } from "../../../core/types";
import type { PanelState } from "../../../state/panel-store";
import { DimensionGrid } from "./DimensionGrid";
import { MetricRow } from "./MetricRow";
import type { PanelActions } from "../mount";

interface OverviewPanelProps {
  store: StoreApi<PanelState>;
  view: NoteViewModel;
  actions: PanelActions;
}

/** 概览：标题、摘要卡、三个主指标、维度入口与来源详情。 */
export function OverviewPanel({ store, view, actions }: OverviewPanelProps) {
  const selectItem = useStore(store, (s) => s.selectItem);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  return (
    <div className="nf:flex nf:flex-1 nf:flex-col nf:gap-3 nf:overflow-y-auto nf:p-3">
      <h2 className="nf:m-0 nf:text-base nf:font-semibold nf:text-(--color-nf-text)">
        {view.title}
      </h2>

      {view.summary && (
        <section className="nf:rounded nf:bg-(--color-nf-bg-alt) nf:p-2">
          <p className="nf:m-0 nf:mb-1 nf:text-xs nf:text-(--color-nf-muted)">
            内容概览 · {view.summary.sourceLabel}
          </p>
          <p
            className={`nf:m-0 nf:text-sm nf:text-(--color-nf-text) ${summaryExpanded ? "" : "nf:line-clamp-3"}`}
          >
            {view.summary.text}
          </p>
          <button
            type="button"
            className="nf:mt-1 nf:cursor-pointer nf:p-0 nf:text-xs nf:text-(--color-nf-accent)"
            onClick={() => setSummaryExpanded(!summaryExpanded)}
          >
            {summaryExpanded ? "收起摘要" : "展开摘要"}
          </button>
        </section>
      )}

      {view.metrics.length > 0 && (
        <section>
          <div className="nf:flex nf:flex-col">
            {view.metrics.map((metric) => (
              <MetricRow key={metric.key} metric={metric} onSelect={selectItem} />
            ))}
          </div>
          {view.metrics.some((m) => m.kind === "number") && (
            <p className="nf:m-0 nf:mt-1 nf:text-xs nf:text-(--color-nf-muted)">数值量程未配置</p>
          )}
        </section>
      )}

      <DimensionGrid view={view} onSelect={selectItem} />

      {(view.entities.technologies.length > 0 ||
        view.entities.companies.length > 0 ||
        view.entities.keyPeople.length > 0) && (
        <section className="nf:text-xs">
          <h3 className="nf:m-0 nf:mb-1 nf:font-semibold nf:text-(--color-nf-muted)">相关实体</h3>
          <div className="nf:flex nf:flex-wrap nf:gap-1">
            {view.entities.companies.map((name, i) => (
              <span
                key={`c:${i}`}
                className="nf:rounded nf:bg-(--color-nf-bg-alt) nf:px-2 nf:py-0.5 nf:text-(--color-nf-text)"
              >
                {name}
              </span>
            ))}
            {view.entities.technologies.map((name, i) => (
              <span
                key={`t:${i}`}
                className="nf:rounded nf:bg-(--color-nf-bg-alt) nf:px-2 nf:py-0.5 nf:text-(--color-nf-text)"
              >
                {name}
              </span>
            ))}
            {view.entities.keyPeople.map((name, i) => (
              <span
                key={`p:${i}`}
                className="nf:rounded nf:bg-(--color-nf-bg-alt) nf:px-2 nf:py-0.5 nf:text-(--color-nf-text)"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {!view.hasFrontmatter && (
        <p className="nf:m-0 nf:text-xs nf:text-(--color-nf-muted)">
          这篇笔记没有可解析的分析字段。
        </p>
      )}

      {(view.sourceInfo.author ??
        view.sourceInfo.published ??
        view.sourceInfo.created ??
        view.sourceInfo.sourceUrl ??
        view.sourceInfo.sourceType ??
        (view.sourceInfo.tags && view.sourceInfo.tags.length > 0 ? view.sourceInfo.tags : undefined) ??
        (view.sourceInfo.manifestDates && view.sourceInfo.manifestDates.length > 0
          ? view.sourceInfo.manifestDates
          : undefined)) && (
        <section className="nf:mt-auto nf:border-t nf:border-(--color-nf-border) nf:pt-2 nf:text-xs nf:text-(--color-nf-muted)">
          <p className="nf:m-0 nf:mb-1 nf:font-semibold">来源详情</p>
          {view.sourceInfo.author && <p className="nf:m-0">作者：{view.sourceInfo.author}</p>}
          {view.sourceInfo.published && <p className="nf:m-0">发布：{view.sourceInfo.published}</p>}
          {view.sourceInfo.created && <p className="nf:m-0">收录：{view.sourceInfo.created}</p>}
          {view.sourceInfo.sourceType && <p className="nf:m-0">类型：{view.sourceInfo.sourceType}</p>}
          {view.sourceInfo.tags && view.sourceInfo.tags.length > 0 && (
            <p className="nf:m-0">标签：{view.sourceInfo.tags.join("、")}</p>
          )}
          {view.sourceInfo.manifestDates && view.sourceInfo.manifestDates.length > 0 && (
            <p className="nf:m-0">清单日期：{view.sourceInfo.manifestDates.join("、")}</p>
          )}
          {view.sourceInfo.sourceUrl && (
            <button
              type="button"
              className="nf:mt-1 nf:cursor-pointer nf:p-0 nf:text-(--color-nf-accent)"
              onClick={() => actions.openExternal(view.sourceInfo.sourceUrl!)}
            >
              打开外部来源 ↗
            </button>
          )}
        </section>
      )}
    </div>
  );
}

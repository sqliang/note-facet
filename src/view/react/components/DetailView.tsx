/**
 * view/react/components/DetailView.tsx — 聚焦详情层（docs/02 §4）。
 * 替换概览主体，顶部保留笔记名与返回入口；依据区提供
 * “定位字段”和“外部来源”两个独立操作，不伪造正文证据。
 * 长文本预览以省略号截断并标注“原文预览”，不包装成摘要。
 */
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import type {
  DetailPayload,
  NoteViewModel,
  ObjectEntry,
  PathPart,
} from "../../../core/types";
import type { PanelState } from "../../../state/panel-store";
import { displayLevel } from "../labels";
import type { PanelActions } from "../mount";

interface DetailViewProps {
  store: StoreApi<PanelState>;
  view: NoteViewModel;
  detail: DetailPayload;
  actions: PanelActions;
}

/** 长文本忠实预览：默认 6 行截断，可展开全文。 */
function TextPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <p
        className={`nf:m-0 nf:text-sm nf:whitespace-pre-wrap nf:text-(--color-nf-text) ${expanded ? "" : "nf:line-clamp-6"}`}
      >
        {text}
      </p>
      <button
        type="button"
        className="nf:mt-1 nf:cursor-pointer nf:p-0 nf:text-xs nf:text-(--color-nf-accent)"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "收起" : "展开全文"}
      </button>
    </div>
  );
}

/** 依据与来源区：字段路径标注 + 定位/外链按钮。 */
function SourceSection({
  notePath,
  fieldLabel,
  path,
  expectedText,
  externalUrl,
  actions,
}: {
  notePath: string;
  fieldLabel: string;
  path: PathPart[] | undefined;
  /** 展示时的原文指纹：定位前用于数组重排的唯一恢复（docs/03 §4.6）。 */
  expectedText?: unknown;
  externalUrl?: string;
  actions: PanelActions;
}) {
  return (
    <section className="nf:mt-3 nf:rounded nf:bg-(--color-nf-bg-alt) nf:p-2">
      <p className="nf:m-0 nf:mb-1 nf:text-xs nf:text-(--color-nf-muted)">依据与来源</p>
      <p className="nf:m-0 nf:mb-2 nf:text-xs nf:break-all nf:text-(--color-nf-muted)">
        来自 {fieldLabel} · 生成方式未知
      </p>
      <div className="nf:flex nf:gap-2">
        {path && (
          <button
            type="button"
            className="nf:cursor-pointer nf:rounded nf:border nf:border-(--color-nf-border) nf:px-2 nf:py-0.5 nf:text-xs nf:text-(--color-nf-text) hover:nf:border-(--color-nf-accent)"
            onClick={() => actions.locateField(notePath, path, expectedText)}
          >
            定位字段
          </button>
        )}
        {externalUrl && (
          <button
            type="button"
            className="nf:cursor-pointer nf:rounded nf:border nf:border-(--color-nf-border) nf:px-2 nf:py-0.5 nf:text-xs nf:text-(--color-nf-text) hover:nf:border-(--color-nf-accent)"
            onClick={() => actions.openExternal(externalUrl)}
          >
            外部来源
          </button>
        )}
      </div>
    </section>
  );
}

/** 对象详情：定位、信号（未提供 ≠ 零值）、用户、风险、对象评分。 */
function ObjectDetail({ item }: { item: ObjectEntry }) {
  const missingSignals = item.signals.filter((s) => s.availability !== "present");
  const presentSignals = item.signals.filter((s) => s.availability === "present");
  return (
    <div className="nf:flex nf:flex-col nf:gap-3">
      {item.score && (
        <p className="nf:m-0 nf:text-sm nf:text-(--color-nf-text)">
          对象评分：<strong>{item.score.value}</strong>
          <span className="nf:ml-2 nf:text-xs nf:text-(--color-nf-muted)">定义及量程未声明</span>
        </p>
      )}
      {item.mentionConfidence && (
        <p className="nf:m-0 nf:text-xs nf:text-(--color-nf-muted)">
          提及识别置信度：{displayLevel(item.mentionConfidence)}
        </p>
      )}
      {item.positioning && (
        <section>
          <h4 className="nf:m-0 nf:mb-1 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">定位</h4>
          <TextPreview text={item.positioning} />
        </section>
      )}
      {presentSignals.map((signal) => (
        <section key={signal.key}>
          <h4 className="nf:m-0 nf:mb-1 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">
            {signal.label}
          </h4>
          <TextPreview text={signal.text ?? ""} />
        </section>
      ))}
      {missingSignals.length > 0 && (
        <p className="nf:m-0 nf:text-xs nf:text-(--color-nf-muted)">
          {missingSignals.length} 项信号未提供（{missingSignals.map((s) => s.label).join("、")}）
        </p>
      )}
      {item.targetUsers.length > 0 && (
        <section>
          <h4 className="nf:m-0 nf:mb-1 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">目标用户</h4>
          <ul className="nf:m-0 nf:list-disc nf:pl-4 nf:text-sm nf:text-(--color-nf-text)">
            {item.targetUsers.map((u, i) => (
              <li key={`u:${i}`}>{u}</li>
            ))}
          </ul>
        </section>
      )}
      {item.riskNotes.length > 0 && (
        <section>
          <h4 className="nf:m-0 nf:mb-1 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">对象风险</h4>
          <ul className="nf:m-0 nf:list-disc nf:pl-4 nf:text-sm nf:text-(--color-nf-text)">
            {item.riskNotes.map((r, i) => (
              <li key={`r:${i}`}>{r}</li>
            ))}
          </ul>
        </section>
      )}
      {item.watchReason && (
        <section>
          <h4 className="nf:m-0 nf:mb-1 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">关注理由</h4>
          <TextPreview text={item.watchReason} />
        </section>
      )}
      {item.differentiation && (
        <section>
          <h4 className="nf:m-0 nf:mb-1 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">差异</h4>
          <TextPreview text={item.differentiation} />
        </section>
      )}
      {item.evidenceSnippets.length > 0 && (
        <section>
          <h4 className="nf:m-0 nf:mb-1 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">
            字段内摘录（未验证为正文原句）
          </h4>
          <ul className="nf:m-0 nf:list-disc nf:pl-4 nf:text-xs nf:text-(--color-nf-muted)">
            {item.evidenceSnippets.map((s, i) => (
              <li key={`s:${i}`}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** 聚焦详情：唯一详情主体 + 固定关注入口。 */
export function DetailView({ store, view, detail, actions }: DetailViewProps) {
  const selectedItemKey = useStore(store, (s) => s.selectedItemKey);
  const pinnedFocus = useStore(store, (s) => s.pinnedFocus);
  // 进入详情时焦点移到返回按钮，键盘用户可立即继续操作（docs/02 §8）
  const backButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    backButtonRef.current?.focus();
  }, [selectedItemKey]);

  let title = "";
  let body: React.ReactNode = null;
  let sourcePath: PathPart[] | undefined;
  let sourceLabel = "";
  let expectedText: unknown;
  let externalUrl: string | undefined;

  switch (detail.kind) {
    case "metric": {
      const m = detail.item;
      title = m.label;
      sourcePath = m.reasonPath ?? m.valuePath;
      sourceLabel = m.valuePath.join(".");
      expectedText = m.reasonPath ? m.reason : undefined;
      body = (
        <div className="nf:flex nf:flex-col nf:gap-2">
          <p className="nf:m-0 nf:text-2xl nf:font-semibold nf:text-(--color-nf-text)">
            {m.availability === "present"
              ? m.kind === "category"
                ? displayLevel(String(m.value))
                : String(m.value)
              : m.availability === "invalid"
                ? String(m.value)
                : "—"}
            {m.kind === "number" && m.availability === "present" && (
              <span className="nf:ml-2 nf:text-xs nf:font-normal nf:text-(--color-nf-muted)">
                量程未配置
              </span>
            )}
          </p>
          {m.availability !== "present" && (
            <p className="nf:m-0 nf:text-xs nf:text-(--color-nf-muted)">
              {m.availability === "invalid" ? "该值类型异常，显示原值" : "该项未提供"}
            </p>
          )}
          <p className="nf:m-0 nf:text-xs nf:text-(--color-nf-muted)">
            置信度：{displayLevel(m.confidence)} · 来自笔记字段
          </p>
          {m.reason && (
            <section>
              <h4 className="nf:m-0 nf:mb-1 nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">
                评分理由（原文预览）
              </h4>
              <TextPreview text={m.reason} />
            </section>
          )}
        </div>
      );
      break;
    }
    case "risk":
      title = `风险 · ${detail.item.label}`;
      sourcePath = detail.item.path;
      sourceLabel = detail.item.path.join(".");
      expectedText = detail.item.text;
      body = <TextPreview text={detail.item.text} />;
      break;
    case "ordered":
      title = `${detail.label} ${detail.item.index + 1}`;
      sourcePath = detail.item.path;
      sourceLabel = detail.item.path.join(".");
      expectedText = detail.item.text;
      body = <TextPreview text={detail.item.text} />;
      break;
    case "object": {
      title = `对象 · ${detail.item.name}`;
      // 对象定位落到身份标量（url 优先，name 兜底）：数组重排时指纹不符即拒绝，不高亮错误对象
      const firstSource = detail.item.sourcePaths[0];
      sourcePath = firstSource
        ? [...firstSource, detail.item.url ? "url" : "name"]
        : undefined;
      sourceLabel = detail.item.sourcePaths.map((p) => p.join(".")).join("；");
      expectedText = detail.item.url ?? detail.item.name;
      externalUrl = detail.item.url;
      body = <ObjectDetail item={detail.item} />;
      break;
    }
    case "misc":
      title = detail.item.label;
      sourcePath = detail.item.path;
      sourceLabel = detail.item.path.join(".");
      body = (
        <div className="nf:flex nf:flex-col nf:gap-2">
          {detail.item.value.length > 60 ? (
            <TextPreview text={detail.item.value} />
          ) : (
            <p className="nf:m-0 nf:text-sm nf:text-(--color-nf-text)">
              原值：{displayLevel(detail.item.value)}
            </p>
          )}
          {detail.item.extra && <TextPreview text={detail.item.extra} />}
        </div>
      );
      break;
    case "logic": {
      title = `内容结构 · 第 ${detail.index + 1} 步`;
      sourcePath = ["key_logic_flow", detail.index];
      sourceLabel = sourcePath.join(".");
      expectedText = detail.steps[detail.index];
      body = (
        <ol className="nf:m-0 nf:flex nf:list-none nf:flex-col nf:gap-1 nf:p-0">
          {detail.steps.map((step, i) => (
            <li
              key={`${i}:${step.slice(0, 12)}`}
              className={`nf:rounded nf:px-2 nf:py-1 nf:text-sm ${
                i === detail.index
                  ? "nf:border nf:border-(--color-nf-accent) nf:text-(--color-nf-text)"
                  : "nf:text-(--color-nf-muted)"
              }`}
            >
              {i + 1}. {step}
            </li>
          ))}
        </ol>
      );
      break;
    }
  }

  const isPinned = pinnedFocus?.itemKey === selectedItemKey && pinnedFocus.status === "active";

  return (
    <div className="nf:flex nf:flex-1 nf:flex-col nf:overflow-y-auto nf:p-3">
      <div className="nf:mb-2 nf:flex nf:items-center nf:justify-between nf:gap-2">
        <button
          type="button"
          ref={backButtonRef}
          className="nf:cursor-pointer nf:p-0 nf:text-xs nf:text-(--color-nf-accent)"
          onClick={() => store.getState().clearSelection()}
        >
          ← 返回概览
        </button>
        {selectedItemKey && (
          <button
            type="button"
            className="nf:cursor-pointer nf:rounded nf:px-2 nf:py-0.5 nf:text-xs nf:text-(--color-nf-muted) hover:nf:text-(--color-nf-text)"
            onClick={() =>
              isPinned
                ? store.getState().unpinFocus()
                : store.getState().pinFocus(selectedItemKey, title)
            }
          >
            {isPinned ? "解除固定关注" : "固定关注"}
          </button>
        )}
      </div>
      <h3 className="nf:m-0 nf:mb-2 nf:text-sm nf:font-semibold nf:text-(--color-nf-text)">
        {view.title} · {title}
      </h3>
      {body}
      <SourceSection
        notePath={view.notePath}
        fieldLabel={sourceLabel}
        path={sourcePath}
        expectedText={expectedText}
        externalUrl={externalUrl}
        actions={actions}
      />
    </div>
  );
}

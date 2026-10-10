/**
 * view/react/App.tsx — 面板根组件。
 * 信息层次（docs/02 §1）：概览 → 聚焦 → 定位；
 * 同时只有一个详情主体，PinBar 始终可见用于锁定关键内容。
 */
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import { resolveDetail } from "../../core/facet-builder";
import type { PanelState } from "../../state/panel-store";
import { DetailView } from "./components/DetailView";
import { EmptyState } from "./components/EmptyState";
import { OverviewPanel } from "./components/OverviewPanel";
import { PinBar } from "./components/PinBar";
import type { PanelActions } from "./mount";

interface AppProps {
  store: StoreApi<PanelState>;
  actions: PanelActions;
}

/** 面板根组件：按 store 状态在概览 / 详情 / 空态之间切换。 */
export function App({ store, actions }: AppProps) {
  const view = useStore(store, (s) => s.view);
  const selectedItemKey = useStore(store, (s) => s.selectedItemKey);

  const detail = view && selectedItemKey ? resolveDetail(view, selectedItemKey) : null;

  return (
    <div
      className="nf:flex nf:h-full nf:flex-col nf:overflow-hidden"
      onKeyDown={(event) => {
        // Esc 返回详情上层（docs/02 §8 键盘可达性）
        if (event.key === "Escape" && selectedItemKey) {
          store.getState().clearSelection();
        }
      }}
    >
      <PinBar store={store} actions={actions} />
      {view?.parseError && (
        <p className="nf:m-0 nf:border-b nf:border-(--color-nf-border) nf:px-3 nf:py-2 nf:text-xs nf:text-(--color-nf-muted)">
          无法解析这篇笔记的 YAML（{view.parseError}）。面板不显示可能过期的旧分析。
        </p>
      )}
      {!view && (
        <p className="nf:p-4 nf:text-sm nf:text-(--color-nf-muted)">
          打开一篇 Markdown 笔记，这里会显示它的多维概览。
        </p>
      )}
      {view?.isEmpty && <EmptyState title={view.title} />}
      {view && !view.isEmpty && !detail && (
        <OverviewPanel store={store} view={view} actions={actions} />
      )}
      {view && !view.isEmpty && detail && (
        <DetailView store={store} view={view} detail={detail} actions={actions} />
      )}
      {view && !view.isEmpty && selectedItemKey && !detail && (
        <p className="nf:p-4 nf:text-sm nf:text-(--color-nf-muted)">
          该条目在当前版本中不存在，请重新选择。
        </p>
      )}
    </div>
  );
}

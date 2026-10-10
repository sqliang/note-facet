/**
 * view/react/components/PinBar.tsx — 顶部锁定条。
 * 固定笔记与固定关注分离（docs/02 §4）：
 * - 固定笔记：面板不跟随主编辑区切换；
 * - 固定关注：紧凑返回条，记住“笔记 + 条目”，一键跳回；
 *   原条目消失时显示“内容已变化”，不找邻近条目顶替。
 */
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import type { PanelState } from "../../../state/panel-store";
import type { PanelActions } from "../mount";

interface PinBarProps {
  store: StoreApi<PanelState>;
  actions: PanelActions;
}

/** 顶部锁定条：固定笔记开关 + 固定关注返回条。 */
export function PinBar({ store, actions }: PinBarProps) {
  const pinnedNotePath = useStore(store, (s) => s.pinnedNotePath);
  const pinnedFocus = useStore(store, (s) => s.pinnedFocus);
  const targetPath = useStore(store, (s) => s.target?.path ?? null);

  /** 跳回固定关注：同篇直接选中，跨笔记先打开再选中（选中保留规则见 store）。 */
  const jumpToFocus = () => {
    if (!pinnedFocus || pinnedFocus.status === "stale") return;
    if (pinnedFocus.notePath !== targetPath) {
      actions.openNote(pinnedFocus.notePath);
    }
    store.getState().selectItem(pinnedFocus.itemKey);
  };

  return (
    <div className="nf:flex nf:shrink-0 nf:flex-col nf:gap-1 nf:border-b nf:border-(--color-nf-border) nf:px-3 nf:py-2">
      <div className="nf:flex nf:items-center nf:justify-between">
        <span className="nf:text-xs nf:font-semibold nf:text-(--color-nf-muted)">知镜</span>
        <button
          type="button"
          className="nf:cursor-pointer nf:rounded nf:px-2 nf:py-0.5 nf:text-xs nf:text-(--color-nf-muted) hover:nf:text-(--color-nf-text)"
          aria-pressed={pinnedNotePath !== null}
          onClick={() =>
            pinnedNotePath ? store.getState().unpinNote() : store.getState().pinCurrentNote()
          }
        >
          {pinnedNotePath ? "解除固定笔记" : "固定笔记"}
        </button>
      </div>
      {pinnedFocus && (
        <div className="nf:flex nf:items-center nf:gap-2 nf:rounded nf:bg-(--color-nf-bg-alt) nf:px-2 nf:py-1">
          {pinnedFocus.status === "stale" ? (
            <span className="nf:flex-1 nf:truncate nf:text-xs nf:text-(--color-nf-muted)">
              {pinnedFocus.label}：内容已变化，请重新选择
            </span>
          ) : (
            <button
              type="button"
              className="nf:flex-1 nf:cursor-pointer nf:truncate nf:text-left nf:text-xs nf:text-(--color-nf-accent)"
              title={`回到 ${pinnedFocus.notePath} 的 ${pinnedFocus.label}`}
              onClick={jumpToFocus}
            >
              ↩ {pinnedFocus.label}
            </button>
          )}
          <button
            type="button"
            className="nf:cursor-pointer nf:text-xs nf:text-(--color-nf-muted) hover:nf:text-(--color-nf-text)"
            aria-label="解除固定关注"
            onClick={() => store.getState().unpinFocus()}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

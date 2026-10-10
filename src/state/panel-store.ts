/**
 * state/panel-store.ts — 面板会话状态机（docs/02 §4、docs/03 §5）。
 * 用 zustand vanilla store 保持框架无关、可单测：
 * - 同时只有一个详情（选择新项替换旧项）；
 * - 固定笔记与固定关注分离：固定笔记决定面板是否跟随，固定关注记住位置；
 * - 快照一致性：target.contentVersion 与 view.contentVersion 不符即丢弃；
 * - 固定关注的条目在新版本消失时标记 stale，不找邻近条目顶替。
 */
import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import type { NoteViewModel } from "../core/types";

/** 当前目标笔记引用（文件身份 + 内容版本）。 */
export interface TargetRef {
  path: string;
  contentVersion: string;
}

/** 固定关注：记住“笔记 + 条目”，stale 表示原条目已不存在。 */
export interface PinnedFocus {
  notePath: string;
  itemKey: string;
  label: string;
  status: "active" | "stale";
}

/** 面板状态与全部动作。 */
export interface PanelState {
  pinnedNotePath: string | null;
  target: TargetRef | null;
  view: NoteViewModel | null;
  selectedItemKey: string | null;
  pinnedFocus: PinnedFocus | null;
  /**
   * 异步读取前声明的期望目标路径（竞态守卫）：
   * 视图层发起 cachedRead 前调用 expectTarget，乱序到达的其他路径快照被丢弃。
   */
  expectedPath: string | null;

  /** 固定当前笔记：面板不再跟随主编辑区切换。 */
  pinCurrentNote: () => void;
  /** 解除固定笔记，恢复跟随。 */
  unpinNote: () => void;
  /** 声明本次异步读取的期望目标路径。 */
  expectTarget: (path: string) => void;
  /** 发布一份视图快照；不一致、过期或非期望目标的一律丢弃。 */
  publishSnapshot: (target: TargetRef, view: NoteViewModel) => void;
  /** 笔记删除/不可达时使目标、选中与相关固定状态失效。 */
  invalidatePath: (path: string) => void;
  /** 重命名迁移：目标、固定笔记与固定关注的路径同步更新。 */
  renamePath: (oldPath: string, newPath: string) => void;
  /** 选中一个条目进入详情（替换旧详情）。 */
  selectItem: (key: string) => void;
  /** 返回概览。 */
  clearSelection: () => void;
  /** 固定关注当前笔记的某个条目。 */
  pinFocus: (itemKey: string, label: string) => void;
  /** 解除固定关注。 */
  unpinFocus: () => void;
}

/**
 * 创建独立的面板 store 实例。
 * 每个面板视图持有自己的实例；测试用它验证状态机规则。
 */
export function createPanelStore(): StoreApi<PanelState> {
  return createStore<PanelState>()((set, get) => ({
    pinnedNotePath: null,
    target: null,
    view: null,
    selectedItemKey: null,
    pinnedFocus: null,
    expectedPath: null,

    pinCurrentNote: () => {
      const target = get().target;
      if (target) set({ pinnedNotePath: target.path });
    },

    unpinNote: () => set({ pinnedNotePath: null }),

    expectTarget: (path) => set({ expectedPath: path }),

    publishSnapshot: (target, view) => {
      const state = get();
      // 一致性守卫：目标引用与视图版本必须同源，不符视为过期异步结果
      if (target.contentVersion !== view.contentVersion) return;
      // 竞态守卫：已声明期望目标时，乱序到达的其他路径快照直接丢弃
      if (state.expectedPath && target.path !== state.expectedPath) return;
      // 固定笔记：面板不跟随其他笔记
      if (state.pinnedNotePath && target.path !== state.pinnedNotePath) return;
      // 同路径同版本：重复发布不改变任何状态
      if (state.target?.path === target.path && state.target.contentVersion === target.contentVersion) {
        return;
      }

      const noteChanged = state.target?.path !== target.path;
      let pinnedFocus = state.pinnedFocus;
      // 固定关注校验：只在新快照属于关注所属笔记时重算状态
      if (pinnedFocus && pinnedFocus.notePath === target.path) {
        const exists = view.itemKeys.includes(pinnedFocus.itemKey);
        pinnedFocus = { ...pinnedFocus, status: exists ? "active" : "stale" };
      }
      // 跨笔记保留选中仅限固定关注跳转场景；普通切换一律回概览
      const isFocusJump =
        noteChanged &&
        state.selectedItemKey !== null &&
        state.pinnedFocus?.itemKey === state.selectedItemKey &&
        view.itemKeys.includes(state.selectedItemKey);
      set({
        target,
        view,
        selectedItemKey: !noteChanged || isFocusJump ? state.selectedItemKey : null,
        pinnedFocus,
      });
    },

    invalidatePath: (path) => {
      const state = get();
      // 只清理与被删路径相关的状态，避免无关删除误清面板
      set({
        target: state.target?.path === path ? null : state.target,
        view: state.target?.path === path ? null : state.view,
        selectedItemKey: state.target?.path === path ? null : state.selectedItemKey,
        pinnedNotePath: state.pinnedNotePath === path ? null : state.pinnedNotePath,
        pinnedFocus: state.pinnedFocus?.notePath === path ? null : state.pinnedFocus,
        expectedPath: state.expectedPath === path ? null : state.expectedPath,
      });
    },

    renamePath: (oldPath, newPath) => {
      const state = get();
      // 重命名迁移引用：固定状态随路径更新，不解除（docs/03 §5）
      set({
        target: state.target?.path === oldPath ? { ...state.target, path: newPath } : state.target,
        view: state.view?.notePath === oldPath ? { ...state.view, notePath: newPath } : state.view,
        pinnedNotePath: state.pinnedNotePath === oldPath ? newPath : state.pinnedNotePath,
        pinnedFocus:
          state.pinnedFocus?.notePath === oldPath
            ? { ...state.pinnedFocus, notePath: newPath }
            : state.pinnedFocus,
        expectedPath: state.expectedPath === oldPath ? newPath : state.expectedPath,
      });
    },

    selectItem: (key) => set({ selectedItemKey: key }),

    clearSelection: () => set({ selectedItemKey: null }),

    pinFocus: (itemKey, label) => {
      const target = get().target;
      if (!target) return;
      set({ pinnedFocus: { notePath: target.path, itemKey, label, status: "active" } });
    },

    unpinFocus: () => set({ pinnedFocus: null }),
  }));
}

/**
 * view/react/mount.tsx — React 树的挂载封装。
 * 面板视图通过它创建/卸载 React 根；store 与动作以 props 注入，
 * 组件层不直接依赖 obsidian 包。
 */
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { StoreApi } from "zustand/vanilla";
import type { PathPart } from "../../core/types";
import type { PanelState } from "../../state/panel-store";
import { App } from "./App";

/** 面板组件可触发的宿主动作（由 FacetView 实现）。 */
export interface PanelActions {
  /**
   * 定位到指定笔记的 YAML 字段范围。
   * @param expectedText 详情展示时的原文指纹，用于数组重排后的唯一恢复
   */
  locateField: (notePath: string, path: PathPart[], expectedText?: unknown) => void;
  /** 打开外部链接（仅 http/https）。 */
  openExternal: (url: string) => void;
  /** 打开笔记（固定关注跨笔记跳转）。 */
  openNote: (notePath: string) => void;
}

/**
 * 在容器元素中挂载面板 React 树。
 * @returns React 根，宿主在 onClose 时调用 root.unmount()
 */
export function mountPanel(
  container: HTMLElement,
  store: StoreApi<PanelState>,
  actions: PanelActions,
): Root {
  container.empty();
  container.addClass("note-facet-panel");
  const root = createRoot(container);
  root.render(<App store={store} actions={actions} />);
  return root;
}

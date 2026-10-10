/**
 * view/constants.ts — 视图层共享常量。
 */

/** 面板视图类型标识（registerView / getLeavesOfType 使用）。 */
export const VIEW_TYPE_NOTE_FACET = "note-facet-view";

/** 面板展示名。 */
export const VIEW_DISPLAY_NAME = "NoteFacet 知镜";

/** 面板图标（Obsidian 内置 lucide 图标名）。 */
export const VIEW_ICON = "scan-search";

/** 编辑内容变更的刷新防抖毫秒数（docs/03 §5 起点值，后续测量调整）。 */
export const REFRESH_DEBOUNCE_MS = 200;

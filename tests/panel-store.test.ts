/**
 * panel-store.ts 的行为契约：面板会话状态机。
 * 规则来源 docs/02 §4 与 docs/03 §5：
 * - 同时只有一个详情；固定关注与固定笔记分离；
 * - 固定笔记时面板不跟随其他笔记；过期版本快照一律丢弃；
 * - 固定关注的目标条目消失时标记 stale，不找邻近条目顶替。
 */
import { describe, expect, test } from "vitest";
import { buildNoteView } from "../src/core/facet-builder";
import { parseNote } from "../src/core/frontmatter";
import { createPanelStore } from "../src/state/panel-store";
import { loadRichSample } from "./helpers";

/** 构造一篇富样本视图与目标引用。 */
function richSnapshot() {
  const view = buildNoteView(parseNote(loadRichSample()), "test-files/test-1.md");
  return { target: { path: view.notePath, contentVersion: view.contentVersion }, view };
}

/** 构造空文档视图与目标引用（内联空文本构造，不依赖样本文件）。 */
function emptySnapshot() {
  const view = buildNoteView(parseNote(""), "test-files/empty.md");
  return { target: { path: view.notePath, contentVersion: view.contentVersion }, view };
}

describe("发布快照", () => {
  test("发布后目标与视图可见", () => {
    const store = createPanelStore();
    const { target, view } = richSnapshot();
    store.getState().publishSnapshot(target, view);
    expect(store.getState().target?.path).toBe("test-files/test-1.md");
    expect(store.getState().view?.title).toBe("Omarchy");
  });

  test("切换到另一篇笔记时清空当前选中详情", () => {
    const store = createPanelStore();
    const rich = richSnapshot();
    store.getState().publishSnapshot(rich.target, rich.view);
    store.getState().selectItem("metric:compound");
    const empty = emptySnapshot();
    store.getState().publishSnapshot(empty.target, empty.view);
    expect(store.getState().selectedItemKey).toBeNull();
  });

  test("同路径同版本的重复发布不改变选中状态", () => {
    const store = createPanelStore();
    const { target, view } = richSnapshot();
    store.getState().publishSnapshot(target, view);
    store.getState().selectItem("metric:compound");
    store.getState().publishSnapshot(target, view);
    expect(store.getState().selectedItemKey).toBe("metric:compound");
  });

  test("版本不符的过期快照被丢弃", () => {
    const store = createPanelStore();
    const { target, view } = richSnapshot();
    store.getState().publishSnapshot(target, view);
    store.getState().selectItem("metric:compound");
    // 模拟异步任务带着旧版本返回新视图
    store.getState().publishSnapshot(
      { path: target.path, contentVersion: "stale-version" },
      view,
    );
    expect(store.getState().target?.contentVersion).toBe(target.contentVersion);
  });
});

describe("单项详情", () => {
  test("选择新条目替换旧条目，不叠加第二个详情", () => {
    const store = createPanelStore();
    store.getState().selectItem("metric:compound");
    store.getState().selectItem("risk:technological");
    expect(store.getState().selectedItemKey).toBe("risk:technological");
  });

  test("clearSelection 返回概览", () => {
    const store = createPanelStore();
    store.getState().selectItem("metric:compound");
    store.getState().clearSelection();
    expect(store.getState().selectedItemKey).toBeNull();
  });
});

describe("固定笔记", () => {
  test("固定后忽略其他笔记的快照", () => {
    const store = createPanelStore();
    const rich = richSnapshot();
    store.getState().publishSnapshot(rich.target, rich.view);
    store.getState().pinCurrentNote();
    const empty = emptySnapshot();
    store.getState().publishSnapshot(empty.target, empty.view);
    expect(store.getState().target?.path).toBe("test-files/test-1.md");
  });

  test("解除固定后恢复跟随", () => {
    const store = createPanelStore();
    const rich = richSnapshot();
    store.getState().publishSnapshot(rich.target, rich.view);
    store.getState().pinCurrentNote();
    store.getState().unpinNote();
    const empty = emptySnapshot();
    store.getState().publishSnapshot(empty.target, empty.view);
    expect(store.getState().target?.path).toBe("test-files/empty.md");
  });
});

describe("固定关注", () => {
  test("固定关注意外切换选择项，关注条仍保留", () => {
    const store = createPanelStore();
    const { target, view } = richSnapshot();
    store.getState().publishSnapshot(target, view);
    store.getState().pinFocus("risk:technological", "技术风险");
    store.getState().selectItem("metric:impact");
    expect(store.getState().selectedItemKey).toBe("metric:impact");
    expect(store.getState().pinnedFocus?.itemKey).toBe("risk:technological");
  });

  test("切到另一篇笔记，关注条保留原笔记信息", () => {
    const store = createPanelStore();
    const rich = richSnapshot();
    store.getState().publishSnapshot(rich.target, rich.view);
    store.getState().pinFocus("risk:technological", "技术风险");
    const empty = emptySnapshot();
    store.getState().publishSnapshot(empty.target, empty.view);
    expect(store.getState().pinnedFocus?.notePath).toBe("test-files/test-1.md");
    expect(store.getState().pinnedFocus?.status).toBe("active");
  });

  test("新版本中原条目消失时标记 stale，不用邻近条目顶替", () => {
    const store = createPanelStore();
    const { target, view } = richSnapshot();
    store.getState().publishSnapshot(target, view);
    store.getState().pinFocus("risk:technological", "技术风险");
    // 模拟同路径新版本，但条目不包含被关注项
    const emptyView = { ...view, contentVersion: "newer:1", itemKeys: [] as string[] };
    store.getState().publishSnapshot(
      { path: target.path, contentVersion: "newer:1" },
      emptyView,
    );
    expect(store.getState().pinnedFocus?.status).toBe("stale");
  });

  test("解除关注", () => {
    const store = createPanelStore();
    const { target, view } = richSnapshot();
    store.getState().publishSnapshot(target, view);
    store.getState().pinFocus("risk:technological", "技术风险");
    store.getState().unpinFocus();
    expect(store.getState().pinnedFocus).toBeNull();
  });
});

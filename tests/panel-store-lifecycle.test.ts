/**
 * panel-store 生命周期守卫（修复审查 B1/B2/I4/S4 的补充契约）：
 * - expectTarget：异步读取前声明期望目标，乱序到达的其他路径快照被丢弃（B1）；
 * - invalidatePath：笔记删除后目标/固定状态立即失效，不残留旧快照（B2）；
 * - renamePath：重命名迁移引用而非解除（I4）；
 * - 跨笔记保留选中仅限固定关注跳转场景，普通切换回概览（S4）。
 */
import { describe, expect, test } from "vitest";
import { buildNoteView } from "../src/core/facet-builder";
import { parseNote } from "../src/core/frontmatter";
import { createPanelStore } from "../src/state/panel-store";
import { loadRichSample } from "./helpers";

/** 构造两篇路径不同、内容相同的视图。 */
function twoViews() {
  const a = buildNoteView(parseNote(loadRichSample()), "a.md");
  const b = buildNoteView(parseNote(loadRichSample()), "b.md");
  return { a, b };
}

describe("expectTarget：乱序快照丢弃（B1）", () => {
  test("声明期望目标后，其他路径的快照被丢弃", () => {
    const store = createPanelStore();
    const { a, b } = twoViews();
    store.getState().expectTarget("b.md");
    // 模拟 a.md 的异步读取乱序后到达
    store.getState().publishSnapshot({ path: "a.md", contentVersion: a.contentVersion }, a);
    expect(store.getState().target).toBeNull();
    store.getState().publishSnapshot({ path: "b.md", contentVersion: b.contentVersion }, b);
    expect(store.getState().target?.path).toBe("b.md");
  });

  test("未声明期望时按既有守卫处理（兼容初始化路径）", () => {
    const store = createPanelStore();
    const { a } = twoViews();
    store.getState().publishSnapshot({ path: "a.md", contentVersion: a.contentVersion }, a);
    expect(store.getState().target?.path).toBe("a.md");
  });
});

describe("invalidatePath：删除失效（B2）", () => {
  test("删除当前目标后视图与选中清空", () => {
    const store = createPanelStore();
    const { a } = twoViews();
    store.getState().publishSnapshot({ path: "a.md", contentVersion: a.contentVersion }, a);
    store.getState().selectItem("metric:compound");
    store.getState().invalidatePath("a.md");
    expect(store.getState().target).toBeNull();
    expect(store.getState().view).toBeNull();
    expect(store.getState().selectedItemKey).toBeNull();
  });

  test("删除固定笔记/固定关注所属笔记时一并失效", () => {
    const store = createPanelStore();
    const { a } = twoViews();
    store.getState().publishSnapshot({ path: "a.md", contentVersion: a.contentVersion }, a);
    store.getState().pinCurrentNote();
    store.getState().pinFocus("risk:technological", "技术风险");
    store.getState().invalidatePath("a.md");
    expect(store.getState().pinnedNotePath).toBeNull();
    expect(store.getState().pinnedFocus).toBeNull();
  });

  test("删除无关笔记不影响当前状态", () => {
    const store = createPanelStore();
    const { a } = twoViews();
    store.getState().publishSnapshot({ path: "a.md", contentVersion: a.contentVersion }, a);
    store.getState().invalidatePath("other.md");
    expect(store.getState().target?.path).toBe("a.md");
  });
});

describe("renamePath：重命名迁移（I4）", () => {
  test("目标、固定笔记与固定关注的路径同步迁移", () => {
    const store = createPanelStore();
    const { a } = twoViews();
    store.getState().publishSnapshot({ path: "a.md", contentVersion: a.contentVersion }, a);
    store.getState().pinCurrentNote();
    store.getState().pinFocus("risk:technological", "技术风险");
    store.getState().renamePath("a.md", "renamed/a.md");
    expect(store.getState().target?.path).toBe("renamed/a.md");
    expect(store.getState().pinnedNotePath).toBe("renamed/a.md");
    expect(store.getState().pinnedFocus?.notePath).toBe("renamed/a.md");
  });
});

describe("跨笔记选中保留收窄（S4）", () => {
  test("普通切换：即使新视图包含同 key 也回概览", () => {
    const store = createPanelStore();
    const { a, b } = twoViews();
    store.getState().publishSnapshot({ path: "a.md", contentVersion: a.contentVersion }, a);
    store.getState().selectItem("metric:compound");
    store.getState().publishSnapshot({ path: "b.md", contentVersion: b.contentVersion }, b);
    expect(store.getState().selectedItemKey).toBeNull();
  });

  test("固定关注跳转：新视图包含被关注 key 时保留选中", () => {
    const store = createPanelStore();
    const { a, b } = twoViews();
    store.getState().publishSnapshot({ path: "a.md", contentVersion: a.contentVersion }, a);
    store.getState().pinFocus("metric:compound", "复利价值");
    store.getState().selectItem("metric:compound");
    store.getState().publishSnapshot({ path: "b.md", contentVersion: b.contentVersion }, b);
    expect(store.getState().selectedItemKey).toBe("metric:compound");
  });
});

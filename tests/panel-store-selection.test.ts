/**
 * store 选中保留规则（补充契约）：
 * 普通切换笔记一律回概览；仅固定关注跳转场景保留选中。
 * 详细契约见 tests/panel-store-lifecycle.test.ts（S4 收窄后的版本）。
 */
import { describe, expect, test } from "vitest";
import { buildNoteView } from "../src/core/facet-builder";
import { parseNote } from "../src/core/frontmatter";
import { createPanelStore } from "../src/state/panel-store";
import { loadRichSample } from "./helpers";

describe("跨笔记选中清理", () => {
  test("新视图不包含该 key 时清空选中", () => {
    const store = createPanelStore();
    const first = buildNoteView(parseNote(loadRichSample()), "a.md");
    const second = buildNoteView(parseNote("# 只有正文\n"), "b.md");
    store.getState().publishSnapshot(
      { path: "a.md", contentVersion: first.contentVersion },
      first,
    );
    store.getState().selectItem("metric:compound");
    store.getState().publishSnapshot(
      { path: "b.md", contentVersion: second.contentVersion },
      second,
    );
    expect(store.getState().selectedItemKey).toBeNull();
  });
});

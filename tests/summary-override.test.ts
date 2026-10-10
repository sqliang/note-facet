/**
 * 摘要预设覆盖的行为契约（补充）：
 * buildNoteView 默认自动判断预设；设置页可显式覆盖（docs/04 §6 用户配置优先）。
 */
import { describe, expect, test } from "vitest";
import { buildNoteView } from "../src/core/facet-builder";
import { parseNote } from "../src/core/frontmatter";

describe("buildNoteView：摘要预设覆盖", () => {
  test("无分析结构时 auto 不给摘要；显式 analysis 预设回退 description", () => {
    const text = "---\ndescription: 站点描述\n---\n正文\n";
    const auto = buildNoteView(parseNote(text), "a.md");
    expect(auto.summary).toBeNull();
    const forced = buildNoteView(parseNote(text), "a.md", "analysis");
    expect(forced.summary?.sourceLabel).toBe("来源描述");
  });

  test("显式 normal 预设不使用 description", () => {
    const text = "---\ndescription: 站点描述\n---\n正文\n";
    const forced = buildNoteView(parseNote(text), "a.md", "normal");
    expect(forced.summary).toBeNull();
  });
});

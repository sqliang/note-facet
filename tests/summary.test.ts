/**
 * summary.ts 的行为契约：摘要优先级与回退（docs/04 §6）。
 * 分析预设：tldr → objective_summary → description；普通预设：summary → abstract → tldr。
 * description 必须标注“来源描述”；无摘要返回 null，不把首段伪装成总结。
 */
import { describe, expect, test } from "vitest";
import { pickSummary } from "../src/core/summary";

describe("pickSummary：分析预设", () => {
  test("tldr 优先并标注来源", () => {
    const result = pickSummary(
      { tldr: "简短结论", objective_summary: "客观概述", description: "站点描述" },
      "analysis",
    );
    expect(result).toEqual({ text: "简短结论", sourceField: "tldr", sourceLabel: "来自 tldr" });
  });

  test("缺少 tldr 时回退 objective_summary", () => {
    const result = pickSummary(
      { objective_summary: "客观概述", description: "站点描述" },
      "analysis",
    );
    expect(result?.sourceField).toBe("objective_summary");
    expect(result?.sourceLabel).toBe("已有概述");
  });

  test("description 标注“来源描述”，不称人工总结", () => {
    const result = pickSummary({ description: "站点描述" }, "analysis");
    expect(result?.sourceLabel).toBe("来源描述");
  });

  test("无任何摘要字段返回 null", () => {
    expect(pickSummary({ title: "x" }, "analysis")).toBeNull();
  });

  test("空字符串摘要视为缺失，继续回退", () => {
    const result = pickSummary({ tldr: "  ", description: "站点描述" }, "analysis");
    expect(result?.sourceField).toBe("description");
  });

  test("非字符串摘要字段不崩溃，继续回退", () => {
    const result = pickSummary({ tldr: 42, description: "站点描述" }, "analysis");
    expect(result?.sourceField).toBe("description");
  });
});

describe("pickSummary：普通预设", () => {
  test("summary 字段优先于 tldr", () => {
    const result = pickSummary({ summary: "手写摘要", tldr: "简短结论" }, "normal");
    expect(result?.sourceField).toBe("summary");
  });

  test("普通预设不使用 objective_summary / description", () => {
    expect(pickSummary({ objective_summary: "x", description: "y" }, "normal")).toBeNull();
  });
});

/**
 * frontmatter.ts 的行为契约：frontmatter 识别、YAML 解析与“路径 → 源范围”映射。
 * 定位层是 P0 技术重点（docs/03 §4）：折行字符串、数组条目、重复键、
 * CRLF/BOM 都必须得到可预期的结果；歧义场景宁可返回 null 也禁止错跳。
 */
import { describe, expect, test } from "vitest";
import { parseNote } from "../src/core/frontmatter";
import { loadRichSample } from "./helpers";

describe("parseNote：frontmatter 识别", () => {
  test("识别以 --- 包围的 frontmatter 块范围", () => {
    const parsed = parseNote(loadRichSample());
    expect(parsed.frontmatterRange).not.toBeNull();
    const { from, to } = parsed.frontmatterRange!;
    const text = loadRichSample();
    expect(text.slice(from, from + 3)).toBe("---");
    expect(text.slice(to - 3, to)).toBe("---");
  });

  test("空文档没有 frontmatter，也不产生解析错误", () => {
    // 空文档用内联空文本构造，不依赖样本文件保持为空
    const parsed = parseNote("");
    expect(parsed.frontmatterRange).toBeNull();
    expect(parsed.data).toBeNull();
    expect(parsed.error).toBeNull();
  });

  test("无 frontmatter 的普通笔记", () => {
    const parsed = parseNote("# 标题\n\n正文。\n");
    expect(parsed.frontmatterRange).toBeNull();
    expect(parsed.data).toBeNull();
  });

  test("非法 YAML 记录错误且不产出数据", () => {
    const parsed = parseNote("---\nfoo: [unclosed\n---\nbody\n");
    expect(parsed.error).not.toBeNull();
    expect(parsed.data).toBeNull();
  });

  test("frontmatter 不是对象（标量）时 data 为 null 但不算解析错误", () => {
    const parsed = parseNote("---\njust a scalar\n---\nbody\n");
    expect(parsed.error).toBeNull();
    expect(parsed.data).toBeNull();
    expect(parsed.frontmatterRange).not.toBeNull();
  });
});

describe("parseNote：valueAt 取值", () => {
  test("按路径读取嵌套值", () => {
    const parsed = parseNote(loadRichSample());
    expect(parsed.valueAt(["confidence", "compound"])).toBe("medium");
    expect(parsed.valueAt(["impact_score", "score"])).toBe(2.5);
  });

  test("按数组下标读取条目", () => {
    const parsed = parseNote(loadRichSample());
    expect(parsed.valueAt(["key_beneficiaries", 0])).toBe("Arch Linux");
  });

  test("缺失路径返回 undefined", () => {
    const parsed = parseNote(loadRichSample());
    expect(parsed.valueAt(["no_such_key"])).toBeUndefined();
    expect(parsed.valueAt(["confidence", "nope"])).toBeUndefined();
  });

  test("null 值与缺失路径可以区分", () => {
    const parsed = parseNote(loadRichSample());
    expect(parsed.valueAt(["object_insights", 0, "technical_signal"])).toBeNull();
    expect(parsed.valueAt(["object_insights", 0, "no_such"])).toBeUndefined();
  });
});

describe("parseNote：rangeOf 源范围定位", () => {
  const text = loadRichSample();

  test("折行长字符串返回原始源范围而非解码文本位置", () => {
    const parsed = parseNote(text);
    const range = parsed.rangeOf(["impact_score", "reason"]);
    expect(range).not.toBeNull();
    const slice = text.slice(range!.from, range!.to);
    expect(slice).toContain("先看评分依据");
    // 范围不得越过当前键，侵入下一个顶层字段
    expect(slice).not.toContain("sentiment:");
  });

  test("数组条目可精确定位", () => {
    const parsed = parseNote(text);
    const range = parsed.rangeOf(["market_opportunities", 1]);
    expect(range).not.toBeNull();
    expect(text.slice(range!.from, range!.to)).toContain("DHH 以个人影响力为");
  });

  test("嵌套对象内的标量可定位", () => {
    const parsed = parseNote(text);
    const range = parsed.rangeOf(["compound_value", "score"]);
    expect(range).not.toBeNull();
    expect(text.slice(range!.from, range!.to)).toBe("4.0");
  });

  test("缺失路径返回 null", () => {
    const parsed = parseNote(text);
    expect(parsed.rangeOf(["no_such_key"])).toBeNull();
  });

  test("重复键存在歧义时返回 null，禁止错跳", () => {
    const parsed = parseNote("---\nkey: first\nkey: second\n---\n");
    expect(parsed.rangeOf(["key"])).toBeNull();
  });

  test("CRLF 换行下范围仍然指向原文正确位置", () => {
    const crlf = text.replaceAll("\n", "\r\n");
    const parsed = parseNote(crlf);
    const range = parsed.rangeOf(["compound_value", "score"]);
    expect(range).not.toBeNull();
    expect(crlf.slice(range!.from, range!.to)).toBe("4.0");
  });

  test("带 BOM 的文本偏移仍然正确", () => {
    const bom = "\uFEFF" + text;
    const parsed = parseNote(bom);
    const range = parsed.rangeOf(["compound_value", "score"]);
    expect(range).not.toBeNull();
    expect(bom.slice(range!.from, range!.to)).toBe("4.0");
  });
});

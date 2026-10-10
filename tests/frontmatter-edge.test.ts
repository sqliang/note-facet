/**
 * frontmatter 边界补充（修复审查 S3 的契约）：
 * 尾随空格的结束标记、嵌套重复键、锚点、合并键的可预期行为。
 */
import { describe, expect, test } from "vitest";
import { parseNote } from "../src/core/frontmatter";

describe("结束标记容错", () => {
  test("带尾随空格的 --- 仍识别为 frontmatter 结束", () => {
    const parsed = parseNote("---\nkey: value\n--- \nbody\n");
    expect(parsed.frontmatterRange).not.toBeNull();
    expect(parsed.valueAt(["key"])).toBe("value");
  });
});

describe("嵌套重复键", () => {
  test("嵌套 map 内的重复键同样返回 null（歧义不定位）", () => {
    const parsed = parseNote("---\nouter:\n  key: first\n  key: second\n---\n");
    expect(parsed.rangeOf(["outer", "key"])).toBeNull();
  });

  test("嵌套重复不影响其他无歧义路径定位", () => {
    const text = "---\nouter:\n  key: first\n  key: second\nother: fine\n---\n";
    const parsed = parseNote(text);
    const range = parsed.rangeOf(["other"]);
    expect(range).not.toBeNull();
    expect(text.slice(range!.from, range!.to)).toBe("fine");
  });
});

describe("锚点与合并键", () => {
  test("锚点标量可以定位到值本体", () => {
    const text = "---\nkey: &a hello\n---\n";
    const parsed = parseNote(text);
    const range = parsed.rangeOf(["key"]);
    expect(range).not.toBeNull();
    expect(text.slice(range!.from, range!.to)).toContain("hello");
  });

  test("别名引用不定位（歧义退化为 null）", () => {
    const parsed = parseNote("---\na: &x hello\nb: *x\n---\n");
    expect(parsed.rangeOf(["b"])).toBeNull();
  });

  test("合并键场景下普通键仍可定位", () => {
    const text = "---\nbase: &b\n  x: 1\nobj:\n  <<: *b\n  y: 2\n---\n";
    const parsed = parseNote(text);
    expect(parsed.rangeOf(["obj", "y"])).not.toBeNull();
  });
});

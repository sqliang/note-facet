/**
 * core/locate.ts 的行为契约（修复审查 I1）：
 * 定位前基于最新文本核对目标内容，数组重排时按文本指纹唯一恢复，
 * 重复或消失时拒绝定位，禁止错跳（docs/03 §3/§4.6）。
 */
import { describe, expect, test } from "vitest";
import { parseNote } from "../src/core/frontmatter";
import { relocatePath } from "../src/core/locate";
import { loadRichSample } from "./helpers";

/** 把样本中机会数组的前两条互换（模拟用户编辑重排）。 */
function swapFirstTwoOpportunities(text: string): string {
  const parsed = parseNote(text);
  const first = parsed.valueAt(["market_opportunities", 0]);
  const second = parsed.valueAt(["market_opportunities", 1]);
  if (typeof first !== "string" || typeof second !== "string") throw new Error("样本结构变化");
  // 用单行 YAML 构造重排后的最小等价文档（单行无折行，语义等价）
  const inline = (s: string) => `"${s.replaceAll('"', '\\"')}"`;
  return `---\nmarket_opportunities:\n- ${inline(second)}\n- ${inline(first)}\n- 第三条保持不变\n---\n正文\n`;
}

describe("relocatePath", () => {
  const text = loadRichSample();

  test("内容未变化时返回原路径", () => {
    const parsed = parseNote(text);
    const expected = parsed.valueAt(["market_opportunities", 1]);
    const result = relocatePath(parsed, ["market_opportunities", 1], expected);
    expect(result).toEqual(["market_opportunities", 1]);
  });

  test("数组重排后按文本指纹恢复到新下标", () => {
    const parsed = parseNote(text);
    const expected = parsed.valueAt(["market_opportunities", 1]);
    const reordered = parseNote(swapFirstTwoOpportunities(text));
    const result = relocatePath(reordered, ["market_opportunities", 1], expected);
    expect(result).toEqual(["market_opportunities", 0]);
  });

  test("目标文本在数组中重复出现时拒绝定位", () => {
    const dup = parseNote("---\nitems:\n- 相同文本\n- 相同文本\n---\n");
    expect(relocatePath(dup, ["items", 0], "相同文本")).toBeNull();
  });

  test("目标文本消失时拒绝定位", () => {
    const parsed = parseNote(text);
    expect(relocatePath(parsed, ["market_opportunities", 1], "不存在的文本")).toBeNull();
  });

  test("不带指纹时按原路径直接定位（标量场景）", () => {
    const parsed = parseNote(text);
    const result = relocatePath(parsed, ["compound_value", "score"]);
    expect(result).toEqual(["compound_value", "score"]);
  });
});

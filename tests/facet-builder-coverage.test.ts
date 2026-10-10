/**
 * facet-builder 覆盖补充（修复审查 I2/I3/S4 的契约）：
 * - parseError：YAML 解析失败必须进入视图模型，与“没有分析字段”区分（I2）；
 * - entities：公司/技术/人物分组进入视图模型（I3）；
 * - domain_disruption、value_capture_layer、moat_impact、event_type 有展示路径（I3）；
 * - 来源详情补 sourceType / id / manifestDates / tags（I3）；
 * - 对象 itemKey 用身份键而非名字，同名不同 URL 不冲突（S4）。
 */
import { describe, expect, test } from "vitest";
import { buildNoteView, resolveDetail } from "../src/core/facet-builder";
import { parseNote } from "../src/core/frontmatter";
import { loadRichSample } from "./helpers";

function buildRich() {
  return buildNoteView(parseNote(loadRichSample()), "test-files/test-1.md");
}

describe("parseError（I2）", () => {
  test("YAML 解析失败时视图模型携带错误信息", () => {
    const view = buildNoteView(parseNote("---\nfoo: [unclosed\n---\nbody\n"), "bad.md");
    expect(view.parseError).not.toBeNull();
    expect(view.metrics).toHaveLength(0);
  });

  test("正常笔记 parseError 为 null", () => {
    expect(buildRich().parseError).toBeNull();
  });
});

describe("entities 分组（I3）", () => {
  test("样本的技术 4 项、人物 1 项、公司为空数组", () => {
    const view = buildRich();
    expect(view.entities.technologies).toEqual(["Linux", "Arch", "Hyprland", "Quickshell"]);
    expect(view.entities.keyPeople).toEqual(["DHH"]);
    expect(view.entities.companies).toEqual([]);
  });
});

describe("更多已映射字段的展示路径（I3）", () => {
  const view = buildRich();

  test("domain_disruption 两块长文进入其他判断", () => {
    const keys = view.miscJudgments.map((j) => j.key);
    expect(keys).toContain("domain_disruption.technical");
    expect(keys).toContain("domain_disruption.business");
    const technical = view.miscJudgments.find((j) => j.key === "domain_disruption.technical");
    expect(technical?.value).toContain("底层技术并无本质突破");
  });

  test("value_capture_layer / moat_impact / event_type 进入其他判断", () => {
    const keys = view.miscJudgments.map((j) => j.key);
    expect(keys).toContain("value_capture_layer");
    expect(keys).toContain("moat_impact");
    expect(keys).toContain("event_type");
  });

  test("来源详情补 sourceType / id / manifestDates / tags", () => {
    expect(view.sourceInfo.sourceType).toBe("community_discussion");
    expect(view.sourceInfo.id).toBe("1e94a0fddbf40b07");
    expect(view.sourceInfo.manifestDates).toEqual(["2026-09-04"]);
    expect(view.sourceInfo.tags).toEqual(["clippings"]);
  });
});

describe("对象身份键（S4）", () => {
  test("itemKey 使用 object_type::url 身份，不含裸名字", () => {
    const view = buildRich();
    const objectKey = view.itemKeys.find((k) => k.startsWith("object:"));
    expect(objectKey).toBe("object:product::https://www.producthunt.com/r/ANPVQTR3VUDIDN");
    expect(resolveDetail(view, objectKey!)?.kind).toBe("object");
  });

  test("同名不同 URL 的两个对象产生两个不同的 key", () => {
    const text = [
      "---",
      "object_mentions:",
      "- object_type: product",
      "  name: Dup",
      "  url: https://a.example",
      "- object_type: product",
      "  name: Dup",
      "  url: https://b.example",
      "---",
      "",
    ].join("\n");
    const view = buildNoteView(parseNote(text), "dup.md");
    const objectKeys = view.itemKeys.filter((k) => k.startsWith("object:"));
    expect(objectKeys).toHaveLength(2);
    for (const key of objectKeys) {
      expect(resolveDetail(view, key)).not.toBeNull();
    }
  });
});

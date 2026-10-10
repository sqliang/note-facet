/**
 * 第二篇真实样本（test-2.md，HiDream-O1-Embodied）的回归测试。
 * 与 test-1 同 schema 但取值形态不同（description 为空串、置信度含 low、
 * 对象多个实体），用于防止适配层只适配了第一篇样本。
 */
import { describe, expect, test } from "vitest";
import { buildNoteView } from "../src/core/facet-builder";
import { parseNote } from "../src/core/frontmatter";
import { loadSecondSample } from "./helpers";

function buildSecond() {
  return buildNoteView(parseNote(loadSecondSample()), "test-files/test-2.md");
}

describe("第二篇样本的结构映射", () => {
  const view = buildSecond();

  test("标题与摘要：tldr 优先，空 description 不冒充摘要", () => {
    expect(view.title).toContain("HiDream");
    expect(view.summary?.sourceField).toBe("tldr");
    expect(view.summary?.text).toContain("智象未来");
  });

  test("三主指标：impact 4.0 / compound 5.0 / hype medium", () => {
    const impact = view.metrics.find((m) => m.key === "impact");
    const compound = view.metrics.find((m) => m.key === "compound");
    const hype = view.metrics.find((m) => m.key === "hype");
    expect(impact?.value).toBe(4.0);
    expect(impact?.confidence).toBe("medium");
    expect(compound?.value).toBe(5.0);
    expect(compound?.confidence).toBe("low");
    expect(hype?.value).toBe("medium");
    expect(hype?.confidence).toBe("high");
  });

  test("状态排除同样生效（engineering_complexity: prototype 不泄漏）", () => {
    expect(JSON.stringify(view.miscJudgments)).not.toContain("prototype");
    expect(view.excludedPresent).toContain("engineering_complexity");
  });

  test("实体分组：3 家公司、多项技术", () => {
    expect(view.entities.companies).toHaveLength(3);
    expect(view.entities.companies[0]).toContain("HiDream");
    expect(view.entities.technologies.length).toBeGreaterThan(0);
  });

  test("对象合并与条目 key 均可解析", () => {
    expect(view.objects.length).toBeGreaterThan(0);
    for (const key of view.itemKeys) {
      expect(key.length).toBeGreaterThan(0);
    }
  });
});

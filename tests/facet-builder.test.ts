/**
 * facet-builder.ts 的行为契约：把解析后的笔记映射为面板视图模型。
 * 断言全部基于真实样本（docs/05 §2 的静态预期）：
 * 三主指标与置信度绑定、风险/机会/对象/影响分组、null 信号不算零值、
 * 状态字段零泄漏、空文档不产生任何假数据。
 */
import { describe, expect, test } from "vitest";
import { buildNoteView, resolveDetail } from "../src/core/facet-builder";
import { parseNote } from "../src/core/frontmatter";
import { loadRichSample } from "./helpers";

/** 用真实富字段样本构建视图模型。 */
function buildRich() {
  return buildNoteView(parseNote(loadRichSample()), "test-files/test-1.md");
}

describe("buildNoteView：基础信息与摘要", () => {
  const view = buildRich();

  test("标题来自 title 字段", () => {
    expect(view.title).toBe("Omarchy");
  });

  test("摘要取 tldr 并标注来源", () => {
    expect(view.summary?.sourceField).toBe("tldr");
    expect(view.summary?.text).toContain("DHH 在 Product Hunt 提交");
  });

  test("来源详情保留 published 与 created 的差异、author 原值", () => {
    expect(view.sourceInfo.published).toBe("2026-09-03");
    expect(view.sourceInfo.created).toBe("2026-09-04");
    expect(view.sourceInfo.author).toContain("Zac Zuo");
    expect(view.sourceInfo.sourceUrl).toBe("https://www.producthunt.com/products/omarchy-3");
  });

  test("内容版本指纹非空", () => {
    expect(view.contentVersion).toMatch(/^[0-9a-f]+:\d+$/);
  });
});

describe("buildNoteView：三个主指标", () => {
  const view = buildRich();

  test("影响力 2.5 绑定高置信度与理由", () => {
    const impact = view.metrics.find((m) => m.key === "impact");
    expect(impact?.value).toBe(2.5);
    expect(impact?.kind).toBe("number");
    expect(impact?.confidence).toBe("high");
    expect(impact?.reason).toContain("先看评分依据");
    expect(impact?.scaleConfigured).toBe(false);
  });

  test("复利价值 4.0 绑定中置信度", () => {
    const compound = view.metrics.find((m) => m.key === "compound");
    expect(compound?.value).toBe(4.0);
    expect(compound?.confidence).toBe("medium");
    expect(compound?.reason).toContain("投资逻辑链");
  });

  test("炒作程度是分类值 medium，不转成连续数值", () => {
    const hype = view.metrics.find((m) => m.key === "hype");
    expect(hype?.kind).toBe("category");
    expect(hype?.value).toBe("medium");
    expect(hype?.confidence).toBe("high");
  });

  test("置信度不跨指标借用", () => {
    const impact = view.metrics.find((m) => m.key === "impact");
    expect(impact?.confidence).not.toBe("medium");
  });
});

describe("buildNoteView：维度入口", () => {
  const view = buildRich();

  test("风险为四个分类 + 一条补充", () => {
    expect(view.risks.map((r) => r.category)).toEqual([
      "regulatory",
      "technological",
      "competitive",
      "ethical",
    ]);
    expect(view.riskAdditional).toHaveLength(1);
    expect(view.risks[1]?.text).toContain("滚动发行架构迭代快");
  });

  test("机会 3 条且保持原序", () => {
    expect(view.opportunities).toHaveLength(3);
    expect(view.opportunities[0]?.text).toContain("面向智能体时代的可塑操作系统");
    expect(view.opportunities[1]?.text).toContain("DHH 以个人影响力为");
  });

  test("影响分组：受益 4 项、承压 3 项", () => {
    expect(view.impact.beneficiaries).toHaveLength(4);
    expect(view.impact.beneficiaries[0]).toBe("Arch Linux");
    expect(view.impact.casualties).toHaveLength(3);
  });

  test("逻辑步骤 5 步", () => {
    expect(view.logicFlow).toHaveLength(5);
  });

  test("其他判断包含 sentiment / developer_sentiment / information_entropy", () => {
    const keys = view.miscJudgments.map((j) => j.key);
    expect(keys).toContain("sentiment");
    expect(keys).toContain("developer_sentiment");
    expect(keys).toContain("information_entropy");
  });
});

describe("buildNoteView：对象合并与缺失信号", () => {
  const view = buildRich();

  test("mention 与 insight 合并为一个对象入口，保留两处来源", () => {
    expect(view.objects).toHaveLength(1);
    const obj = view.objects[0]!;
    expect(obj.name).toBe("Omarchy");
    expect(obj.sourcePaths).toHaveLength(2);
  });

  test("对象评分 5.0 独立于文章指标", () => {
    const obj = view.objects[0]!;
    expect(obj.score?.value).toBe(5.0);
    // 文章指标中不得混入对象评分
    expect(view.metrics.map((m) => m.value)).not.toContain(5.0);
  });

  test("三个 null 信号是 null 可用性，不是零值也不是缺失路径", () => {
    const obj = view.objects[0]!;
    const nullSignals = obj.signals.filter((s) => s.availability === "null");
    expect(nullSignals).toHaveLength(3);
    for (const signal of nullSignals) {
      expect(signal.text).toBeUndefined();
    }
    expect(obj.signals.filter((s) => s.availability === "present")).toHaveLength(2);
  });

  test("目标用户与对象风险各 3 条", () => {
    const obj = view.objects[0]!;
    expect(obj.targetUsers).toHaveLength(3);
    expect(obj.riskNotes).toHaveLength(3);
  });

  test("两处相同的 evidence_snippets 去重，只保留一份", () => {
    const obj = view.objects[0]!;
    expect(obj.evidenceSnippets).toHaveLength(3);
  });
});

describe("buildNoteView：状态字段零泄漏", () => {
  const view = buildRich();

  test("视图模型中不出现被排除字段的值", () => {
    const serialized = JSON.stringify(view.metrics) + JSON.stringify(view.risks) + JSON.stringify(view.miscJudgments);
    expect(serialized).not.toContain("fact_extracted");
    expect(serialized).not.toContain("production_ready");
    expect(serialized).not.toContain("pr_statement");
    expect(serialized).not.toContain("monitor");
  });

  test("excludedPresent 记录样本中出现但被排除的字段，供诊断", () => {
    expect(view.excludedPresent).toContain("extraction_status");
    expect(view.excludedPresent).toContain("actionable_insight");
  });
});

describe("buildNoteView：空文档与异常", () => {
  test("空文档：isEmpty 为 true，无任何指标与维度数据", () => {
    // 空文档用内联空文本构造，不依赖样本文件保持为空
    const view = buildNoteView(parseNote(""), "test-files/empty.md");
    expect(view.isEmpty).toBe(true);
    expect(view.metrics).toHaveLength(0);
    expect(view.risks).toHaveLength(0);
    expect(view.objects).toHaveLength(0);
    expect(view.summary).toBeNull();
    expect(view.title).toBe("empty");
  });

  test("标题缺失时回退文件名", () => {
    const view = buildNoteView(parseNote("# 只有正文\n"), "folder/my-note.md");
    expect(view.title).toBe("my-note");
  });
});

describe("resolveDetail：选中项解析", () => {
  const view = buildRich();

  test("所有可选项都有稳定 key 且可解析", () => {
    expect(view.itemKeys.length).toBeGreaterThan(0);
    for (const key of view.itemKeys) {
      expect(resolveDetail(view, key), `key ${key} 无法解析`).not.toBeNull();
    }
  });

  test("解析复利指标详情", () => {
    const detail = resolveDetail(view, "metric:compound");
    expect(detail?.kind).toBe("metric");
  });

  test("解析技术风险详情", () => {
    const detail = resolveDetail(view, "risk:technological");
    expect(detail?.kind).toBe("risk");
  });

  test("未知 key 返回 null", () => {
    expect(resolveDetail(view, "metric:unknown")).toBeNull();
    expect(resolveDetail(view, "garbage")).toBeNull();
  });
});

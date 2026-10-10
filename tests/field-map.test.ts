/**
 * field-map.ts 的行为契约：顶层字段角色表与状态排除边界。
 * 规则来源 docs/04 §1-2：六个状态类字段排除出指标模型，
 * 且排除必须先于通用回退；样本 37 个顶层字段都必须有明确角色。
 */
import { parseDocument } from "yaml";
import { describe, expect, test } from "vitest";
import {
  EXCLUDED_FIELDS,
  isExcludedField,
  roleOfField,
} from "../src/core/field-map";
import { loadRichSample } from "./helpers";

/** 从真实样本解析全部顶层字段名。 */
function sampleTopLevelKeys(): string[] {
  const text = loadRichSample();
  const yaml = text.slice(4, text.indexOf("\n---", 4));
  const doc = parseDocument(yaml);
  const keys: string[] = [];
  for (const item of (doc.contents as { items: Array<{ key: { value: string } }> }).items) {
    keys.push(item.key.value);
  }
  return keys;
}

describe("状态排除边界", () => {
  test("六个状态类字段被排除", () => {
    const excluded = [
      "extraction_status",
      "pipeline_stage",
      "extract_result",
      "epistemic_status",
      "engineering_complexity",
      "actionable_insight",
    ];
    expect([...EXCLUDED_FIELDS].sort()).toEqual(excluded.sort());
    for (const key of excluded) {
      expect(isExcludedField(key)).toBe(true);
    }
  });

  test("sentiment 等分析判断不是状态字段，不排除", () => {
    expect(isExcludedField("sentiment")).toBe(false);
    expect(isExcludedField("hype_assessment")).toBe(false);
    expect(isExcludedField("confidence")).toBe(false);
  });
});

describe("字段角色表", () => {
  test("样本 37 个顶层字段全部有明确角色，无 unmapped", () => {
    const keys = sampleTopLevelKeys();
    expect(keys).toHaveLength(37);
    for (const key of keys) {
      expect(roleOfField(key), `字段 ${key} 缺少角色`).not.toBe("unmapped");
    }
  });

  test("被排除字段的角色是 excluded", () => {
    expect(roleOfField("pipeline_stage")).toBe("excluded");
    expect(roleOfField("engineering_complexity")).toBe("excluded");
  });

  test("未知字段回退为 unmapped（不做语义猜测）", () => {
    expect(roleOfField("some_future_field")).toBe("unmapped");
  });

  test("关键字段角色正确", () => {
    expect(roleOfField("tldr")).toBe("summary");
    expect(roleOfField("impact_score")).toBe("metric");
    expect(roleOfField("risk_matrix")).toBe("dimension");
    expect(roleOfField("title")).toBe("title");
  });
});

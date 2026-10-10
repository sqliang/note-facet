/**
 * labels.ts 的行为契约：枚举值的中文展示标签。
 * high/medium/low 仅作显示映射，原值在详情中可查（docs/04 §4：不数值化）。
 * 未知枚举保留原值，不猜测语义。
 */
import { describe, expect, test } from "vitest";
import { displayLevel } from "../src/view/react/labels";

describe("displayLevel", () => {
  test("已知枚举映射为中文标签", () => {
    expect(displayLevel("high")).toBe("高");
    expect(displayLevel("medium")).toBe("中");
    expect(displayLevel("low")).toBe("低");
  });

  test("未知枚举保留原值", () => {
    expect(displayLevel("critical")).toBe("critical");
  });

  test("undefined 显示占位", () => {
    expect(displayLevel(undefined)).toBe("—");
  });
});

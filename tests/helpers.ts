/**
 * 测试辅助：加载仓库内真实样本笔记（test-files/）。
 * 样本是分析字段的输入记录，测试只断言结构映射，不断言其事实真实性。
 * 注意：空文档用例一律在测试里内联空字符串构造，不依赖样本文件保持为空。
 */
import { readFileSync } from "node:fs";

/** 读取富字段样本一（test-1.md，Omarchy，37 个顶层 YAML 字段）。 */
export function loadRichSample(): string {
  return readFileSync(new URL("../test-files/test-1.md", import.meta.url), "utf8");
}

/** 读取富字段样本二（test-2.md，HiDream-O1-Embodied，同 schema 的第二篇）。 */
export function loadSecondSample(): string {
  return readFileSync(new URL("../test-files/test-2.md", import.meta.url), "utf8");
}

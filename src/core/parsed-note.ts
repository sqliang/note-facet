/**
 * core/parsed-note.ts — parseNote 的返回类型契约。
 * 独立成文件以避免 frontmatter.ts 与消费方之间的循环依赖。
 */
import type { PathPart, SourceRange } from "./types";

/** 一篇笔记的解析结果：源文本、frontmatter 范围、顶层数据与定位能力。 */
export interface ParsedNote {
  /** 原始完整文本（定位偏移的坐标系）。 */
  text: string;
  /** frontmatter 块整体范围（含首尾 --- 行）；无 frontmatter 时为 null。 */
  frontmatterRange: SourceRange | null;
  /** 顶层字段对象；非对象 YAML、解析失败或无 frontmatter 时为 null。 */
  data: Record<string, unknown> | null;
  /** 解析错误信息；无错误为 null。 */
  error: string | null;
  /** 按路径读取值；缺失返回 undefined，显式 null 返回 null。 */
  valueAt(path: PathPart[]): unknown;
  /** 按路径返回值的原始源范围；缺失或歧义（重复键/别名）返回 null。 */
  rangeOf(path: PathPart[]): SourceRange | null;
}

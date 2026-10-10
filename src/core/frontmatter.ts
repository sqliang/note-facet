/**
 * core/frontmatter.ts — frontmatter 识别、YAML 解析与“路径 → 源范围”映射。
 * 这是定位层的核心（docs/03 §4）：
 * - 保留 YAML 语法节点的原始源范围，折行字符串不做解码后全文搜索；
 * - 数组按当前路径定位；重复键、别名等歧义场景返回 null，禁止错跳；
 * - BOM 与 CRLF 不影响最终偏移（偏移始终指向传入的原始文本）。
 */
import {
  isAlias,
  isCollection,
  isMap,
  isNode,
  isSeq,
  parseDocument,
} from "yaml";
import type { Document } from "yaml";
import type { ParsedNote } from "./parsed-note";
import type { PathPart, SourceRange } from "./types";

export type { ParsedNote };

/** 判断值是否为非数组的普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** frontmatter 块扫描结果：块整体范围与 YAML 源的起止（均相对去除 BOM 后的文本）。 */
interface FrontmatterBlock {
  range: SourceRange;
  yamlFrom: number;
  yamlTo: number;
}

/**
 * 扫描文本起始处的 frontmatter 块。
 * 只识别位于文件第一行的 `---` 起始标记与独占一行的 `---` 结束标记，
 * 不使用正则拆解 YAML 结构本身。
 */
function scanFrontmatter(text: string): FrontmatterBlock | null {
  const openMatch = /^---[ \t]*(\r?\n|$)/.exec(text);
  if (!openMatch) return null;
  const yamlFrom = openMatch[0].length;
  // 逐行扫描结束标记，避免把 YAML 文档内的 "---" 字符串误判为结束
  const linePattern = /^.*(\r?\n|$)/gm;
  linePattern.lastIndex = yamlFrom;
  let match: RegExpExecArray | null;
  while ((match = linePattern.exec(text)) !== null) {
    const line = match[0].replace(/\r?\n$/, "");
    // 结束标记允许尾随空格（--- ），起始标记同理
    if (/^---[ \t]*$/.test(line)) {
      const rangeTo = match.index + line.length;
      return { range: { from: 0, to: rangeTo }, yamlFrom, yamlTo: match.index };
    }
    if (match[0] === "") break;
  }
  return null;
}

/** 沿路径在 YAML AST 中定位值节点；重复键、别名等歧义返回 "ambiguous"。 */
type NodeLookup = { status: "found"; node: unknown } | { status: "missing" } | { status: "ambiguous" };

function lookupNode(root: unknown, path: PathPart[]): NodeLookup {
  let current = root;
  for (const part of path) {
    if (isAlias(current)) return { status: "ambiguous" };
    if (isMap(current)) {
      const matches = current.items.filter(
        (pair) => isNode(pair.key) && "value" in pair.key && pair.key.value === part,
      );
      // 重复键：位置有歧义，宁可不定位也不能错跳
      if (matches.length > 1) return { status: "ambiguous" };
      const pair = matches[0];
      if (!pair) return { status: "missing" };
      current = pair.value;
    } else if (isSeq(current)) {
      if (typeof part !== "number") return { status: "missing" };
      const item = current.items[part];
      if (item === undefined || item === null) return { status: "missing" };
      current = item;
    } else {
      return { status: "missing" };
    }
  }
  if (current === null || current === undefined) return { status: "missing" };
  if (isAlias(current)) return { status: "ambiguous" };
  return { status: "found", node: current };
}

/**
 * 解析笔记文本，产出 frontmatter 范围、顶层数据与路径定位能力。
 * 解析失败时 data 为 null 并记录 error，rangeOf 仍尽力可用。
 */
export function parseNote(text: string): ParsedNote {
  // BOM：剥落后解析，最终偏移统一 +1 还原到原文坐标
  const bomOffset = text.startsWith("\uFEFF") ? 1 : 0;
  const body = bomOffset === 1 ? text.slice(1) : text;

  const block = scanFrontmatter(body);
  const frontmatterRange: SourceRange | null = block
    ? { from: block.range.from + bomOffset, to: block.range.to + bomOffset }
    : null;

  if (!block) {
    return {
      text,
      frontmatterRange: null,
      data: null,
      error: null,
      valueAt: () => undefined,
      rangeOf: () => null,
    };
  }

  const yamlSource = body.slice(block.yamlFrom, block.yamlTo);
  // uniqueKeys: false —— 重复键不抛错，留待定位时按歧义处理
  const doc: Document = parseDocument(yamlSource, { uniqueKeys: false });
  const error = doc.errors.length > 0 ? (doc.errors[0]?.message ?? "YAML 解析失败") : null;

  let data: Record<string, unknown> | null = null;
  if (!error && isMap(doc.contents)) {
    const js: unknown = doc.toJS();
    data = isRecord(js) ? js : null;
  }

  const baseOffset = bomOffset + block.yamlFrom;

  return {
    text,
    frontmatterRange,
    data,
    error,
    valueAt(path: PathPart[]): unknown {
      if (!isCollection(doc.contents)) return undefined;
      return doc.getIn(path);
    },
    rangeOf(path: PathPart[]): SourceRange | null {
      const lookup = lookupNode(doc.contents, path);
      if (lookup.status !== "found") return null;
      const node = lookup.node;
      if (!isNode(node) || !node.range) return null;
      const [from, valueEnd] = node.range;
      if (from === undefined || valueEnd === undefined || valueEnd < from) return null;
      return { from: from + baseOffset, to: valueEnd + baseOffset };
    },
  };
}

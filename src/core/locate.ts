/**
 * core/locate.ts — 定位前的目标恢复（docs/03 §3/§4.6）。
 * 数字下标只负责当次定位，不作为跨版本身份：数组被重排时按文本指纹
 * 唯一恢复到新下标；指纹重复或消失时返回 null，由调用方提示重选，禁止错跳。
 */
import { isNode, isSeq } from "yaml";
import type { ParsedNote } from "./parsed-note";
import type { PathPart } from "./types";

/**
 * 取出数组的 JS 值列表。
 * valueAt 对集合返回 YAML 节点而非 JS 数组，这里统一成可比较的 JS 值。
 */
function arrayValues(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw as unknown[];
  if (isSeq(raw)) {
    const items: unknown[] = raw.items;
    return items.map((item): unknown =>
      isNode(item) && "value" in item ? (item as { value: unknown }).value : item,
    );
  }
  return null;
}

/**
 * 在最新解析结果中恢复定位路径。
 * @param parsed 点击定位前重新解析的笔记
 * @param path 快照中保存的路径（可能包含已失效的数组下标）
 * @param expectedText 详情展示时使用的原文指纹；缺省表示不做内容核对
 * @returns 可用于定位的路径；无法唯一恢复时返回 null
 */
export function relocatePath(
  parsed: ParsedNote,
  path: PathPart[],
  expectedText?: unknown,
): PathPart[] | null {
  const current = parsed.valueAt(path);

  // 无指纹：标量/对象路径直接按原路径定位
  if (expectedText === undefined) {
    return current === undefined ? null : path;
  }

  // 数组路径：指纹必须在父级数组中唯一匹配（原位置命中也要过唯一性检查）
  const parentPath = path.slice(0, -1);
  const lastPart = path[path.length - 1];
  const parentValues = typeof lastPart === "number" ? arrayValues(parsed.valueAt(parentPath)) : null;
  if (parentValues) {
    const matches: number[] = [];
    parentValues.forEach((item, index) => {
      if (item === expectedText) matches.push(index);
    });
    if (matches.length !== 1) return null;
    return [...parentPath, matches[0]!];
  }

  // 非数组路径：原位置内容一致才定位
  return current === expectedText ? path : null;
}

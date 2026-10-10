/**
 * core/hash.ts — 内容版本指纹。
 * 用 FNV-1a（32 位）加文本长度组成版本串；不追求加密强度，
 * 只要求同一版本文本指纹稳定、任何编辑必然改变指纹（docs/03 §3 contentVersion）。
 */

/**
 * 计算文本的内容指纹。
 * @param text 笔记完整源文本
 * @returns 形如 `"1a2b3c4d:1234"` 的版本串（哈希:长度）
 */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    // FNV 素数乘法（用 Math.imul 保持 32 位语义）
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16)}:${text.length}`;
}

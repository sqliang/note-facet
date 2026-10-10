/**
 * hash.ts 的行为契约：内容版本指纹。
 * 用于视图快照的版本核对——同一文本指纹必须稳定，任何编辑都必须改变指纹。
 */
import { describe, expect, test } from "vitest";
import { fingerprint } from "../src/core/hash";
import { loadRichSample } from "./helpers";

describe("fingerprint", () => {
  test("同一文本生成相同指纹（确定性）", () => {
    const text = loadRichSample();
    expect(fingerprint(text)).toBe(fingerprint(text));
  });

  test("任意编辑都改变指纹", () => {
    const text = loadRichSample();
    expect(fingerprint(text.replace("2.5", "2.6"))).not.toBe(fingerprint(text));
  });

  test("不同文本指纹不同", () => {
    expect(fingerprint("alpha")).not.toBe(fingerprint("beta"));
  });

  test("指纹包含长度信息，空文本也有合法指纹", () => {
    const empty = fingerprint("");
    expect(empty).toMatch(/^[0-9a-f]+:0$/);
  });
});

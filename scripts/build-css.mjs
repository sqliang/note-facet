/**
 * scripts/build-css.mjs — 面板样式构建脚本。
 * 背景：Tailwind 4.3 只有完整包导入（@import "tailwindcss"）才会触发按需生成，
 * 而完整导入必然携带 preflight（@layer base 的全局 margin/padding reset）。
 * preflight 会改写 Obsidian 宿主与其他插件的样式，必须在产物中剔除。
 * 本脚本：调用 Tailwind CLI 构建 → 移除 @layer base 块；--watch 时监听 src 重建。
 */
import { spawnSync } from "node:child_process";
import { readFileSync, watch, writeFileSync } from "node:fs";

const OUTPUT_FILE = "styles.css";
const isWatch = process.argv.includes("--watch");
const isMinify = process.argv.includes("--minify") || !isWatch;

/** 运行一次 Tailwind CLI 构建。 */
function runTailwind() {
  const args = ["tailwindcss", "-i", "src/styles/main.css", "-o", OUTPUT_FILE];
  if (isMinify) args.push("--minify");
  const result = spawnSync("npx", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("[note-facet] tailwind 构建失败");
    process.exitCode = 1;
    return false;
  }
  return true;
}

/** 用花括号配对移除产物中的 @layer base 块（preflight）。 */
function stripPreflight() {
  const css = readFileSync(OUTPUT_FILE, "utf8");
  const marker = "@layer base";
  const start = css.indexOf(marker);
  if (start === -1) return;
  const openBrace = css.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = openBrace; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) {
    console.error("[note-facet] 无法定位 @layer base 结束位置，产物未修改");
    process.exitCode = 1;
    return;
  }
  writeFileSync(OUTPUT_FILE, css.slice(0, start) + css.slice(end));
  console.log("[note-facet] 已剔除 preflight（@layer base）");
}

/** 完整构建一轮。 */
function buildOnce() {
  if (runTailwind()) stripPreflight();
}

buildOnce();

if (isWatch) {
  let timer = null;
  // macOS 支持 recursive；Tailwind 构建约 30ms，防抖 100ms 足够
  watch("src", { recursive: true }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(buildOnce, 100);
  });
  console.log("[note-facet] CSS watching for changes...");
}

/**
 * esbuild 构建配置：产出 Obsidian 要求的单文件 CJS main.js。
 * - 直接执行（node esbuild.config.mjs [--production]）：一次性构建；
 * - 作为模块被 scripts/dev.mjs 导入：复用 buildOptions，附加重建后自动部署。
 * obsidian / electron / Node 内置模块由宿主注入，必须保持 external。
 */
import esbuild from "esbuild";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { builtinModules } from "node:module";

/** 宿主注入模块与 Node 内置模块（含 node: 前缀形态）一律外置，不打入产物。 */
export const external = [
  "obsidian",
  "electron",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
  ...builtinModules,
  ...builtinModules.map((mod) => `node:${mod}`),
];

/**
 * 共享构建选项。
 * @param {boolean} isProduction 生产模式：压缩、关闭 sourcemap
 */
export function createBuildOptions(isProduction) {
  return {
    entryPoints: ["src/main.ts"],
    bundle: true,
    format: "cjs",
    target: "es2022",
    platform: "browser",
    external,
    outfile: "main.js",
    sourcemap: isProduction ? false : "inline",
    minify: isProduction,
    treeShaking: true,
    logLevel: "info",
  };
}

/** 是否被直接执行（而非作为模块导入）。 */
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const isProduction = process.argv.includes("--production");
  const isWatch = process.argv.includes("--watch");
  const buildOptions = createBuildOptions(isProduction);

  if (isWatch) {
    // 兼容保留：纯 JS watch（不自动部署）；日常开发请用 npm run dev（scripts/dev.mjs）
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log("[note-facet] esbuild watching for changes...");
  } else {
    await esbuild.build(buildOptions);
  }
}

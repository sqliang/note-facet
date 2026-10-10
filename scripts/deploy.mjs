/**
 * scripts/deploy.mjs — 把插件构建产物一次性部署到本地 Obsidian 库。
 * 用法：
 *   node scripts/deploy.mjs dev    开发构建（含 sourcemap）+ 部署
 *   node scripts/deploy.mjs prod   生产构建（压缩、无 sourcemap）+ 部署
 *
 * 目标库路径由 deploy.config.json 配置（本地文件，不入库；
 * 首次使用从 deploy.config.example.json 复制一份并修改 vaultPath）。
 * 日常开发建议直接用 npm run dev（保存即构建并部署），本脚本适合手动补发。
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { copyPlugin, loadConfigOrExit } from "./lib-deploy.mjs";

/** 运行一条构建命令，失败即中断。 */
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`[note-facet] 构建失败：${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

const mode = process.argv[2];
if (mode !== "dev" && mode !== "prod") {
  console.error("[note-facet] 用法：node scripts/deploy.mjs <dev|prod>");
  process.exit(1);
}

const config = loadConfigOrExit();

// dev：保留 inline sourcemap 便于在 Obsidian DevTools 里调试；prod：压缩且不带 sourcemap
run("node", ["scripts/build-css.mjs"]);
run("node", ["esbuild.config.mjs", ...(mode === "prod" ? ["--production"] : [])]);

const pluginDir = copyPlugin(config);
console.log(`\n[note-facet] ${mode} 模式已部署到 ${pluginDir}`);
console.log("[note-facet] 下一步：在 Obsidian 中重载插件（命令面板 → Reload app without saving），");
console.log("[note-facet] 或在 设置 → 第三方插件 中关闭再启用 NoteFacet。");

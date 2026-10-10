/**
 * scripts/dev.mjs — 日常开发的统一 watch 入口（npm run dev）。
 * 每次源码变更后：重建 main.js → 重建 styles.css → 若 deploy.config.json
 * 存在则自动复制三件套到目标库。配合 Obsidian 的 Hot Reload 社区插件
 * 即可实现“保存即热更”；没有它则需要手动重载插件（docs/07 §4）。
 */
import esbuild from "esbuild";
import { spawnSync } from "node:child_process";
import { createBuildOptions } from "../esbuild.config.mjs";
import { copyPlugin, loadConfigIfPresent } from "./lib-deploy.mjs";

const config = loadConfigIfPresent();
if (!config) {
  console.warn("[note-facet] 未找到 deploy.config.json，将只构建不部署。");
  console.warn("[note-facet] 复制 deploy.config.example.json 并修改 vaultPath 可启用自动部署。");
}

/** 重建 CSS（Tailwind 需扫描 tsx 中的类名，源码变动必须连带重建样式）。 */
function buildCss() {
  const result = spawnSync("node", ["scripts/build-css.mjs"], { stdio: "inherit" });
  return result.status === 0;
}

/** 每次 JS 构建成功后的钩子：CSS 重建 + 自动部署。 */
const deployOnRebuild = {
  name: "deploy-on-rebuild",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      if (!buildCss()) return;
      if (!config) return;
      const pluginDir = copyPlugin(config);
      console.log(`[note-facet] 已构建并部署到 ${pluginDir}（${new Date().toLocaleTimeString()}）`);
    });
  },
};

const context = await esbuild.context({
  ...createBuildOptions(false),
  plugins: [deployOnRebuild],
});
await context.watch();
console.log("[note-facet] dev watch 已启动：保存源码即重建并部署。");

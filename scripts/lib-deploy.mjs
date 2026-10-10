/**
 * scripts/lib-deploy.mjs — 部署配置的读取与产物复制的共享实现。
 * 供 deploy.mjs（一次性部署）与 dev.mjs（watch 后自动部署）复用。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONFIG_FILE = "deploy.config.json";
/** 部署到库的插件三件套（Obsidian 运行所需的最小文件集）。 */
export const PLUGIN_FILES = ["main.js", "manifest.json", "styles.css"];

/** 配置存在则读取校验；不存在返回 null（调用方决定是否报错）。 */
export function loadConfigIfPresent() {
  if (!existsSync(CONFIG_FILE)) return null;
  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  if (typeof config.vaultPath !== "string" || config.vaultPath.length === 0) {
    console.error("[note-facet] deploy.config.json 缺少有效的 vaultPath");
    process.exit(1);
  }
  const pluginId =
    typeof config.pluginId === "string" && config.pluginId ? config.pluginId : "note-facet";
  return { vaultPath: config.vaultPath, pluginId };
}

/** 严格读取配置：不存在时给出引导并退出（一次性部署场景）。 */
export function loadConfigOrExit() {
  const config = loadConfigIfPresent();
  if (!config) {
    console.error(
      `[note-facet] 缺少 ${CONFIG_FILE}。请复制示例配置并改成你的库路径：\n` +
        `  cp deploy.config.example.json ${CONFIG_FILE}`,
    );
    process.exit(1);
  }
  if (!existsSync(join(config.vaultPath, ".obsidian"))) {
    console.error(`[note-facet] ${config.vaultPath} 不像一个 Obsidian 库（缺少 .obsidian 目录）`);
    process.exit(1);
  }
  return config;
}

/** 把三件套复制到目标库的插件目录，返回插件目录路径。 */
export function copyPlugin(config) {
  const pluginDir = join(config.vaultPath, ".obsidian", "plugins", config.pluginId);
  mkdirSync(pluginDir, { recursive: true });
  for (const file of PLUGIN_FILES) {
    copyFileSync(file, join(pluginDir, file));
  }
  return pluginDir;
}

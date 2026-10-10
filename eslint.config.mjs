/**
 * ESLint 扁平配置：typescript-eslint 推荐规则 + Obsidian 官方插件规范。
 * 构建产物（main.js、styles.css）与依赖目录不参与检查。
 */
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["main.js", "styles.css", "node_modules", "coverage"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
    plugins: { obsidianmd },
    rules: {
      // Obsidian 官方规范（本地预检社区目录 review 高频问题）
      ...obsidianmd.configs.recommended.rules,
      // 本项目约定：显式类型导入，保持产物 tree-shaking 友好
      "@typescript-eslint/consistent-type-imports": "error",
      // 契约层需要 unknown 兜底（FacetItem.value），但禁止不经校验直接拼装
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // 测试中允许未绑定方法的直接断言与必要的非空断言
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: ["**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);

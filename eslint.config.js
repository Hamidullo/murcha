import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import vue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/graphify-out/**",
      "**/.agents/**",
      "**/.claude/skills/**",
    ],
  },
  js.configs.recommended,
  jsdoc.configs["flat/recommended"],
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-returns-description": "off",
    },
  },
  ...vue.configs["flat/recommended"],
  {
    files: ["apps/web/**/*.{js,vue}", "apps/shop/**/*.{js,vue}", "apps/landing/**/*.{js,vue}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        localStorage: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "jsdoc/no-undefined-types": ["warn", { definedTypes: ["Response", "RequestInit"] }],
    },
  },
  {
    // Qatlam qoidasi (CLAUDE.md): controller Prisma'ni to'g'ridan-to'g'ri
    // chaqirmaydi — faqat service orqali. `*.routes.js` bundan istisno —
    // yengil DI kompozitsiya ildizi shu yerda ("qo'lda factory", CLAUDE.md),
    // repository/service klasslarini import qilib bog'laydi.
    files: ["apps/api/src/modules/**/*.controller.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              message:
                "Controller Prisma'ni to'g'ridan-to'g'ri chaqirmaydi — service orqali ishlang.",
            },
          ],
          patterns: [
            {
              group: ["**/lib/prisma.js", "**/lib/tenant-context.js", "**/*.repository.js"],
              message: "Controller faqat service orqali ishlaydi (CLAUDE.md qatlam qoidasi).",
            },
          ],
        },
      ],
    },
  },
  prettier,
];

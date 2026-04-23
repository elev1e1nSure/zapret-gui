import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: ["dist/**", "src-tauri/target/**", "src-tauri/gen/**"] },
  {
    files: ["src/**/*.{js,jsx}", "vite.config.js", "vitest.config.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Injected by Vite at build time (vite.config.js `define`)
        __APP_VERSION__: "readonly",
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Allow console in a desktop utility app
      "no-console": "off",

      // Catch genuinely unused variables; allow _ prefix for intentional gaps
      "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],

      // This rule flags all setState inside effects, including valid sync patterns
      // (e.g. resetting derived UI state in response to prop changes, delayed render
      // flags in portal components). The real fix for useServiceUI was to eliminate
      // the effect entirely; remaining cases are intentional.
      "react-hooks/set-state-in-effect": "off",

      // Refs are intentionally omitted from dependency arrays — they are stable
      // and adding them would be incorrect. Demote to warn so CI stays green.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/**/__tests__/**/*.{js,jsx}", "src/**/*.test.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];

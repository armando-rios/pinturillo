import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { baseConfig, reactConfig } from "../../eslint.config.js";

export default tseslint.config([
  // Ignore patterns
  {
    ignores: ["dist/**", "node_modules/**", "*.js.map", "vite.config.ts"]
  },
  
  // Apply base configuration
  ...baseConfig,
  
  // Apply React/Browser specific configuration
  ...reactConfig,
  
  // React-specific plugins and rules
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Frontend-specific rules
      "no-console": "warn", // Warn on console usage in frontend
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }]
    },
  },
]);

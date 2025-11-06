import globals from "globals";
import baseConfig from "./base.js";

export default [
  ...baseConfig,
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
];

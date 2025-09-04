import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

// Base configuration shared across all workspaces
export const baseConfig = [
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: { js },
    extends: [js.configs.recommended]
  },
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      // Shared rules across all workspaces
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn'
    }
  }
];

// Node.js specific configuration
export const nodeConfig = [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: { 
      globals: {
        ...globals.node,
        ...globals.es2022
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  }
];

// Browser/React specific configuration  
export const reactConfig = [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022
      },
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
];
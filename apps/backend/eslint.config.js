import { defineConfig } from 'eslint/config';
import { baseConfig, nodeConfig } from '../../eslint.config.js';

export default defineConfig([
  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**', '*.js.map']
  },
  
  // Apply base configuration
  ...baseConfig,
  
  // Apply Node.js specific configuration
  ...nodeConfig,
  
  // Backend-specific rules
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    rules: {
      // Allow console in backend
      'no-console': 'off',
      // Backend-specific TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }]
    }
  }
]);
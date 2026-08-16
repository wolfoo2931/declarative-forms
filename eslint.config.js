import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'docs/.vitepress/cache/**',
      'test-results/**',
      // This config is not part of any tsconfig project.
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['*.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Descriptor callbacks legitimately return values that are ignored.
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
  {
    files: ['test/**/*.ts', 'e2e/**/*.ts', 'examples/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // Fixtures routinely stub async APIs with a synchronous body.
      '@typescript-eslint/require-await': 'off',
      // Test data is deliberately typed loosely; String() of it is intentional.
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // Setup patches DOM prototypes before any test runs.
    files: ['test/setup.ts'],
    rules: { '@typescript-eslint/no-empty-function': 'off' },
  },
);

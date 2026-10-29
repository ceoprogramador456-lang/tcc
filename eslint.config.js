import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // O front-end (`siva-frontend/`) é um projeto independente, com lint e
    // build próprios — o ESLint do back-end não deve varrer o bundle dele.
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'siva-frontend/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },
  prettier,
);

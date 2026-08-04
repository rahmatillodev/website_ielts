import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Marks identifiers used in JSX as used. Without it, `no-unused-vars`
      // only saw components because `varsIgnorePattern` exempts anything
      // capitalised - so lowercase namespace imports rendered as members, i.e.
      // `motion` in `<motion.div>`, were reported as unused in every file that
      // animates anything.
      'react/jsx-uses-vars': 'error',
    },
  },
  {
    // The browser smoke tests are Node, not browser code, and contain no React.
    // Two rules misfire here otherwise: `no-undef` on Node globals, and
    // `rules-of-hooks` on Playwright's fixture callbacks, whose second argument is
    // conventionally named `use` and reads to the plugin as a React hook.
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off',
      // Playwright fixtures declare "this test needs no other fixture" as `{}`.
      'no-empty-pattern': 'off',
    },
  },
])

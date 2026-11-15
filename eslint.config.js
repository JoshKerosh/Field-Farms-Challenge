import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    files: ['apps/web/src/**/*.tsx'],
    plugins: {
      localization: {
        rules: {
          'catalog-text': {
            meta: {
              type: 'problem',
              schema: [],
              messages: {
                catalog:
                  'Add visible text to both language catalogs and render it through useI18n() or message().',
              },
            },
            create(context) {
              return {
                JSXText(node) {
                  const text = node.value.trim();
                  if (!/[A-Za-zÀ-ÿ]/.test(text)) return;
                  if (
                    /^(Español|English|ASADA|NASA|NOAA|SAGA|NDVI|RONI|IGN|CNE|PSA|FLUC|SINAC|CRTM05|A|B|C|L\/s|mm|ha|km|m|°C|No|kg)$/u.test(
                      text,
                    )
                  )
                    return;
                  context.report({ node, messageId: 'catalog' });
                },
              };
            },
          },
        },
      },
    },
    rules: { 'localization/catalog-text': 'error' },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'output/**',
      'references/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['packages/domain/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom*', '@supabase/*', 'dexie', '@field-farms/web*'] },
      ],
    },
  },
);

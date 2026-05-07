module.exports = {
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  importOrder: [
    '^react$',
    '^react-native$',
    '^[a-zA-Z0-9]',
    '^@[a-zA-Z0-9]',
    '^@/components',
    '^@/.*',
    '^[./]',
  ],
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: false,
  singleQuote: true,
  trailingComma: 'all',
};

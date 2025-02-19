module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    'import/order': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/no-named-as-default-member': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'no-case-declarations': 'warn',
    'import/no-unresolved': ['error', {
      ignore: ['server-only']
    }]
  }
} 
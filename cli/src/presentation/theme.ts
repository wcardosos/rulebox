import pc from 'picocolors';

export const theme = {
  success: pc.green,
  error: pc.red,
  warning: pc.yellow,
  dim: pc.dim,
  label: pc.cyan,
  symbols: {
    ok: '✓',
    err: '✗',
    question: '?',
    diamond: '◆',
    diamondEmpty: '◇',
    warn: '▲',
    bar: '│',
  },
} as const;

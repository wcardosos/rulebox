import { describe, expect, it } from 'vitest';
import { CONFIG_FILENAME, CONFIG_VERSION, ConfigSchema, DEFAULT_OUTPUT } from './config';

describe('constants', () => {
  it('CONFIG_VERSION is "1"', () => {
    expect(CONFIG_VERSION).toBe('1');
  });

  it('DEFAULT_OUTPUT is ".rules"', () => {
    expect(DEFAULT_OUTPUT).toBe('.rules');
  });

  it('CONFIG_FILENAME is "rulebox.json"', () => {
    expect(CONFIG_FILENAME).toBe('rulebox.json');
  });
});

describe('ConfigSchema', () => {
  it('accepts valid config', () => {
    const result = ConfigSchema.safeParse({ version: '1', output: '.rules', rules: [] });
    expect(result.success).toBe(true);
  });

  it('accepts non-empty rules array', () => {
    const result = ConfigSchema.safeParse({
      version: '1',
      output: '.rules',
      rules: ['nextjs/app-router'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong version', () => {
    const result = ConfigSchema.safeParse({ version: '2', output: '.rules', rules: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing output', () => {
    const result = ConfigSchema.safeParse({ version: '1', rules: [] });
    expect(result.success).toBe(false);
  });

  it('rejects empty output', () => {
    const result = ConfigSchema.safeParse({ version: '1', output: '', rules: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing rules', () => {
    const result = ConfigSchema.safeParse({ version: '1', output: '.rules' });
    expect(result.success).toBe(false);
  });
});

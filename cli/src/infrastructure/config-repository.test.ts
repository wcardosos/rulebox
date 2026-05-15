import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONFIG_FILENAME } from '../domain/config';
import { configExists, outputDirExists, readConfig, writeConfig } from './config-repository';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebox-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('configExists', () => {
  it('returns false when config does not exist', async () => {
    expect(await configExists(tmpDir)).toBe(false);
  });

  it('returns true when config exists', async () => {
    await fs.writeFile(path.join(tmpDir, CONFIG_FILENAME), '{}');
    expect(await configExists(tmpDir)).toBe(true);
  });
});

describe('writeConfig', () => {
  it('writes valid JSON to rulebox.json', async () => {
    const config = { version: '1' as const, output: '.rules', rules: [] };
    await writeConfig(tmpDir, config);
    const content = await fs.readFile(path.join(tmpDir, CONFIG_FILENAME), 'utf8');
    expect(JSON.parse(content)).toEqual(config);
  });

  it('ends with a newline', async () => {
    await writeConfig(tmpDir, { version: '1' as const, output: '.rules', rules: [] });
    const content = await fs.readFile(path.join(tmpDir, CONFIG_FILENAME), 'utf8');
    expect(content.endsWith('\n')).toBe(true);
  });

  it('uses 2-space indentation', async () => {
    await writeConfig(tmpDir, { version: '1' as const, output: '.rules', rules: [] });
    const content = await fs.readFile(path.join(tmpDir, CONFIG_FILENAME), 'utf8');
    expect(content).toContain('  "version"');
  });
});

describe('readConfig', () => {
  it('returns NOT_FOUND when the file does not exist', async () => {
    const result = await readConfig(tmpDir);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.kind).toBe('NOT_FOUND');
    }
  });

  it('returns INVALID_JSON when the file is not valid JSON', async () => {
    await fs.writeFile(path.join(tmpDir, CONFIG_FILENAME), '{not json');
    const result = await readConfig(tmpDir);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.kind).toBe('INVALID_JSON');
    }
  });

  it('returns INVALID_SCHEMA when the JSON does not satisfy the schema', async () => {
    await fs.writeFile(
      path.join(tmpDir, CONFIG_FILENAME),
      JSON.stringify({ version: '2', output: '.rules', rules: [] }),
    );
    const result = await readConfig(tmpDir);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.kind).toBe('INVALID_SCHEMA');
    }
  });

  it('returns INVALID_SCHEMA when a required field is missing', async () => {
    await fs.writeFile(
      path.join(tmpDir, CONFIG_FILENAME),
      JSON.stringify({ version: '1', output: '.rules' }),
    );
    const result = await readConfig(tmpDir);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.kind).toBe('INVALID_SCHEMA');
    }
  });

  it('returns ok with the parsed config when valid', async () => {
    const config = { version: '1', output: '.rules', rules: ['nextjs/app-router'] };
    await fs.writeFile(path.join(tmpDir, CONFIG_FILENAME), JSON.stringify(config));
    const result = await readConfig(tmpDir);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value).toEqual(config);
    }
  });
});

describe('outputDirExists', () => {
  it('returns false when the directory does not exist', async () => {
    expect(await outputDirExists(path.join(tmpDir, 'missing'))).toBe(false);
  });

  it('returns true when the directory exists', async () => {
    const dir = path.join(tmpDir, 'rules');
    await fs.mkdir(dir);
    expect(await outputDirExists(dir)).toBe(true);
  });

  it('returns false when the path exists but is a file', async () => {
    const file = path.join(tmpDir, 'x');
    await fs.writeFile(file, '');
    expect(await outputDirExists(file)).toBe(false);
  });
});

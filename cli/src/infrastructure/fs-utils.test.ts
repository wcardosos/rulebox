import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureDir, writeAtomic } from './fs-utils';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebox-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('writeAtomic', () => {
  it('writes content to the target file', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await writeAtomic(filePath, '{"hello":"world"}');
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toBe('{"hello":"world"}');
  });

  it('leaves no temp files after success', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await writeAtomic(filePath, 'content');
    const files = await fs.readdir(tmpDir);
    expect(files).toEqual(['test.json']);
  });

  it('overwrites an existing file', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await fs.writeFile(filePath, 'old');
    await writeAtomic(filePath, 'new');
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toBe('new');
  });
});

describe('ensureDir', () => {
  it('creates a new directory and returns created: true', async () => {
    const dirPath = path.join(tmpDir, 'new-dir');
    const result = await ensureDir(dirPath);
    expect(result.created).toBe(true);
    const stat = await fs.stat(dirPath);
    expect(stat.isDirectory()).toBe(true);
  });

  it('handles existing directory and returns created: false', async () => {
    const dirPath = path.join(tmpDir, 'existing');
    await fs.mkdir(dirPath);
    const result = await ensureDir(dirPath);
    expect(result.created).toBe(false);
  });

  it('creates nested directories', async () => {
    const dirPath = path.join(tmpDir, 'a', 'b', 'c');
    const result = await ensureDir(dirPath);
    expect(result.created).toBe(true);
    const stat = await fs.stat(dirPath);
    expect(stat.isDirectory()).toBe(true);
  });
});

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteFile, readExistingFile, writeRuleFile } from './composer';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebox-composer-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('readExistingFile', () => {
  it('returns null when the file does not exist', async () => {
    expect(await readExistingFile(path.join(tmpDir, 'missing.md'))).toBeNull();
  });

  it('returns the file contents when the file exists', async () => {
    const file = path.join(tmpDir, 'x.md');
    await fs.writeFile(file, 'hello');
    expect(await readExistingFile(file)).toBe('hello');
  });
});

describe('writeRuleFile', () => {
  it('writes a new file', async () => {
    const file = path.join(tmpDir, 'new.md');
    await writeRuleFile(file, 'content');
    expect(await fs.readFile(file, 'utf8')).toBe('content');
  });

  it('overwrites an existing file', async () => {
    const file = path.join(tmpDir, 'x.md');
    await fs.writeFile(file, 'old');
    await writeRuleFile(file, 'new');
    expect(await fs.readFile(file, 'utf8')).toBe('new');
  });
});

describe('deleteFile', () => {
  it('deletes an existing file', async () => {
    const file = path.join(tmpDir, 'x.md');
    await fs.writeFile(file, 'x');
    await deleteFile(file);
    await expect(fs.stat(file)).rejects.toThrow();
  });

  it('does not throw when the file is already missing (ENOENT)', async () => {
    await expect(deleteFile(path.join(tmpDir, 'missing.md'))).resolves.toBeUndefined();
  });
});

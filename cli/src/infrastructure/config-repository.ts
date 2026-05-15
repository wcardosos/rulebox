import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Config } from '../domain/config';
import { CONFIG_FILENAME, ConfigSchema } from '../domain/config';
import type { Result } from '../domain/result';
import { err, ok } from '../domain/result';
import { writeAtomic } from './fs-utils';

export type ReadConfigError =
  | { kind: 'NOT_FOUND' }
  | { kind: 'INVALID_JSON'; details: string }
  | { kind: 'INVALID_SCHEMA'; details: string };

export async function configExists(cwd: string): Promise<boolean> {
  try {
    await fs.stat(path.join(cwd, CONFIG_FILENAME));
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw e;
  }
}

export async function readConfig(cwd: string): Promise<Result<Config, ReadConfigError>> {
  const filePath = path.join(cwd, CONFIG_FILENAME);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return err({ kind: 'NOT_FOUND' });
    }
    throw e;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return err({ kind: 'INVALID_JSON', details: (e as Error).message });
  }
  const schemaResult = ConfigSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return err({ kind: 'INVALID_SCHEMA', details: schemaResult.error.message });
  }
  return ok(schemaResult.data);
}

export async function writeConfig(cwd: string, config: Config): Promise<void> {
  const filePath = path.join(cwd, CONFIG_FILENAME);
  await writeAtomic(filePath, `${JSON.stringify(config, null, 2)}\n`);
}

export async function outputDirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw e;
  }
}

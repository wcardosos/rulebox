import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const CANDIDATE_ROOTS = [
  path.resolve(moduleDir, '../rules'),
  path.resolve(moduleDir, '../../rules'),
  path.resolve(moduleDir, '../../../rules'),
];

let cachedRoot: string | null = null;

export function getRegistryRoot(): string {
  if (cachedRoot !== null) return cachedRoot;
  for (const candidate of CANDIDATE_ROOTS) {
    if (existsSync(candidate)) {
      cachedRoot = candidate;
      return candidate;
    }
  }
  throw new Error(`Registry root not found. Tried: ${CANDIDATE_ROOTS.join(', ')}`);
}

export async function ruleExists(name: string): Promise<boolean> {
  const [scope, ruleName] = name.split('/');
  if (!scope || !ruleName) return false;
  const root = getRegistryRoot();
  const ruleDir = path.join(root, scope, ruleName);
  try {
    const [ruleMd, packageYml] = await Promise.all([
      fs.stat(path.join(ruleDir, 'rule.md')),
      fs.stat(path.join(ruleDir, 'package.yml')),
    ]);
    return ruleMd.isFile() && packageYml.isFile();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw e;
  }
}

export async function readRule(name: string): Promise<string> {
  const [scope, ruleName] = name.split('/');
  if (!scope || !ruleName) {
    throw new Error(`Invalid rule name: ${name}`);
  }
  const root = getRegistryRoot();
  return fs.readFile(path.join(root, scope, ruleName, 'rule.md'), 'utf8');
}

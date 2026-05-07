import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function writeAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.tmp-${randomUUID()}`);
  try {
    await fs.writeFile(tmp, content, "utf8");
    await fs.rename(tmp, filePath);
  } catch (e) {
    await fs.unlink(tmp).catch(() => undefined);
    throw e;
  }
}

export async function ensureDir(dirPath: string): Promise<{ created: boolean }> {
  const result = await fs.mkdir(dirPath, { recursive: true });
  return { created: result !== undefined };
}

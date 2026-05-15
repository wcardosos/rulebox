import { promises as fs } from "node:fs";
import path from "node:path";
import type { Config } from "../domain/config";
import { CONFIG_FILENAME } from "../domain/config";
import { writeAtomic } from "./fs-utils";

export async function configExists(cwd: string): Promise<boolean> {
  try {
    await fs.stat(path.join(cwd, CONFIG_FILENAME));
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}

export async function writeConfig(cwd: string, config: Config): Promise<void> {
  const filePath = path.join(cwd, CONFIG_FILENAME);
  await writeAtomic(filePath, `${JSON.stringify(config, null, 2)}\n`);
}

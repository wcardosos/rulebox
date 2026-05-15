import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONFIG_FILENAME } from "../domain/config";
import { configExists, writeConfig } from "./config-repository";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rulebox-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("configExists", () => {
  it("returns false when config does not exist", async () => {
    expect(await configExists(tmpDir)).toBe(false);
  });

  it("returns true when config exists", async () => {
    await fs.writeFile(path.join(tmpDir, CONFIG_FILENAME), "{}");
    expect(await configExists(tmpDir)).toBe(true);
  });
});

describe("writeConfig", () => {
  it("writes valid JSON to rulebox.json", async () => {
    const config = { version: "1" as const, output: ".rules", rules: [] };
    await writeConfig(tmpDir, config);
    const content = await fs.readFile(path.join(tmpDir, CONFIG_FILENAME), "utf8");
    expect(JSON.parse(content)).toEqual(config);
  });

  it("ends with a newline", async () => {
    await writeConfig(tmpDir, { version: "1" as const, output: ".rules", rules: [] });
    const content = await fs.readFile(path.join(tmpDir, CONFIG_FILENAME), "utf8");
    expect(content.endsWith("\n")).toBe(true);
  });

  it("uses 2-space indentation", async () => {
    await writeConfig(tmpDir, { version: "1" as const, output: ".rules", rules: [] });
    const content = await fs.readFile(path.join(tmpDir, CONFIG_FILENAME), "utf8");
    expect(content).toContain('  "version"');
  });
});

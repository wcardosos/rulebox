import { Command } from "commander";
import { registerInit } from "./cli/commands/init";

const program = new Command();
program.name("rulebox").description("Package manager for AI agent rules").version("0.1.0");

registerInit(program);

try {
  await program.parseAsync(process.argv);
} catch (e) {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exitCode = 99;
}

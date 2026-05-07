import type { Command } from 'commander';
import type { InitDeps } from '../../application/init';
import { initCore } from '../../application/init';
import { configExists, writeConfig } from '../../infrastructure/config-repository';
import { ensureDir } from '../../infrastructure/fs-utils';
import { formatInitResult } from '../../presentation/formatters/init';
import { exitCodeFor } from '../exit-codes';

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize rulebox in the current directory')
    .option('-o, --output <path>', 'Output directory for rule files')
    .action(async (options: { output?: string }) => {
      const deps: InitDeps = {
        cwd: process.cwd(),
        configExists,
        writeConfig,
        ensureOutputDir: ensureDir,
      };
      const result = await initCore({ output: options.output }, deps);
      const { stdout, stderr } = formatInitResult(result);
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (result.kind === 'error') {
        process.exitCode = exitCodeFor(result.code);
      }
    });
}

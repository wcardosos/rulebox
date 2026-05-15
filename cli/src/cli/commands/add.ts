import type { Command } from 'commander';
import type { AddDeps } from '../../application/add';
import { addCore } from '../../application/add';
import { deleteFile, readExistingFile, writeRuleFile } from '../../infrastructure/composer';
import { outputDirExists, readConfig, writeConfig } from '../../infrastructure/config-repository';
import { readRule, ruleExists } from '../../infrastructure/registry-repository';
import { formatAddResult } from '../../presentation/formatters/add';
import { exitCodeFor } from '../exit-codes';

export function registerAdd(program: Command): void {
  program
    .command('add [rules...]')
    .description('Add one or more rules to the project')
    .action(async (rules: string[] = []) => {
      const deps: AddDeps = {
        cwd: process.cwd(),
        readConfig,
        writeConfig,
        ruleExists,
        readRule,
        outputDirExists,
        readExistingFile,
        writeRuleFile,
        deleteFile,
      };
      const result = await addCore({ rules }, deps);
      const { stdout, stderr } = formatAddResult(result);
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (result.kind === 'error') {
        process.exitCode = exitCodeFor(result.code);
      }
    });
}

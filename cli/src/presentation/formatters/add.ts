import type { AddResult, RollbackFailure } from '../../application/add';
import { ERROR_CODES } from '../../shared/error-codes';
import { theme } from '../theme';

export function formatAddResult(result: AddResult): { stdout: string; stderr: string } {
  if (result.kind === 'success') {
    const lines = result.operations.map((op) =>
      theme.success(`${theme.symbols.ok} ${op.op} ${op.name}`),
    );
    return { stdout: `${lines.join('\n')}\n`, stderr: '' };
  }

  switch (result.code) {
    case ERROR_CODES.NO_RULES_GIVEN:
      return {
        stdout: '',
        stderr: `${theme.error('At least one rule is required. Usage: rulebox add <rule>...')}\n`,
      };
    case ERROR_CODES.CONFIG_NOT_FOUND:
      return {
        stdout: '',
        stderr: `${theme.error('rulebox.json not found. Run `rulebox init` first.')}\n`,
      };
    case ERROR_CODES.INVALID_CONFIG_JSON:
      return {
        stdout: '',
        stderr: `${theme.error(`Invalid JSON in rulebox.json: ${result.details}`)}\n`,
      };
    case ERROR_CODES.INVALID_CONFIG_SCHEMA:
      return {
        stdout: '',
        stderr: `${theme.error(`Invalid rulebox.json schema: ${result.details}`)}\n`,
      };
    case ERROR_CODES.OUTPUT_DIR_NOT_FOUND:
      return {
        stdout: '',
        stderr: `${theme.error(`Output directory not found: ${result.path}`)}\n`,
      };
    case ERROR_CODES.UNKNOWN_RULES: {
      const header = theme.error('Unknown rule(s):');
      const items = result.rules.map((r) => `  - ${r}`).join('\n');
      return { stdout: '', stderr: `${header}\n${items}\n` };
    }
    case ERROR_CODES.IO_ERROR_WRITE_RULES:
      return {
        stdout: '',
        stderr: `${formatIoError('Failed to write rule files', result.message, result.rolledBack, result.partialRollbackFailures)}\n`,
      };
    case ERROR_CODES.IO_ERROR_WRITE_CONFIG:
      return {
        stdout: '',
        stderr: `${formatIoError('Failed to write rulebox.json', result.message, result.rolledBack, result.partialRollbackFailures)}\n`,
      };
  }
}

function formatIoError(
  prefix: string,
  message: string,
  rolledBack: boolean,
  failures: RollbackFailure[],
): string {
  const lines = [theme.error(`${prefix}: ${message}`)];
  if (rolledBack) {
    lines.push(theme.dim('Rolled back all changes.'));
  } else {
    lines.push(
      theme.warning('Rollback incomplete. The following paths may be in an inconsistent state:'),
    );
    for (const f of failures) {
      lines.push(`  - ${f.path} (${f.cause})`);
    }
  }
  return lines.join('\n');
}

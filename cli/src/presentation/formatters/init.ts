import type { InitResult } from '../../application/init';
import { theme } from '../theme';

export function formatInitResult(result: InitResult): { stdout: string; stderr: string } {
  if (result.kind === 'success') {
    const lines = [theme.success(`${theme.symbols.ok} Created rulebox.json`)];
    if (result.dirCreated) {
      lines.push(theme.success(`${theme.symbols.ok} Created ${result.output}/`));
    }
    return { stdout: lines.join('\n') + '\n', stderr: '' };
  }
  switch (result.code) {
    case 'ALREADY_INITIALIZED':
      return {
        stdout: '',
        stderr: theme.error('rulebox.json already exists in this directory.') + '\n',
      };
    case 'INVALID_OUTPUT':
      return { stdout: '', stderr: theme.error(`Invalid --output value: ${result.reason}`) + '\n' };
    case 'IO_ERROR':
      return {
        stdout: '',
        stderr:
          theme.error(`I/O error: ${result.message}${result.cause ? ` (${result.cause})` : ''}`) +
          '\n',
      };
  }
}

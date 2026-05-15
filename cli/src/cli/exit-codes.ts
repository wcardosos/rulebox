export type ErrorCode =
  | 'ALREADY_INITIALIZED'
  | 'INVALID_OUTPUT'
  | 'IO_ERROR'
  | 'NO_RULES_GIVEN'
  | 'CONFIG_NOT_FOUND'
  | 'INVALID_CONFIG_JSON'
  | 'INVALID_CONFIG_SCHEMA'
  | 'OUTPUT_DIR_NOT_FOUND'
  | 'UNKNOWN_RULES'
  | 'IO_ERROR_WRITE_RULES'
  | 'IO_ERROR_WRITE_CONFIG';

export function exitCodeFor(code: ErrorCode): number {
  switch (code) {
    case 'ALREADY_INITIALIZED':
    case 'INVALID_OUTPUT':
    case 'NO_RULES_GIVEN':
    case 'CONFIG_NOT_FOUND':
    case 'INVALID_CONFIG_JSON':
    case 'INVALID_CONFIG_SCHEMA':
    case 'OUTPUT_DIR_NOT_FOUND':
      return 2;
    case 'UNKNOWN_RULES':
      return 3;
    case 'IO_ERROR':
    case 'IO_ERROR_WRITE_RULES':
    case 'IO_ERROR_WRITE_CONFIG':
      return 4;
  }
}

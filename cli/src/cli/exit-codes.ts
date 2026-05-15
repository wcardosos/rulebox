import { ERROR_CODES, type ErrorCode } from '../shared/error-codes';

export function exitCodeFor(code: ErrorCode): number {
  switch (code) {
    case ERROR_CODES.ALREADY_INITIALIZED:
    case ERROR_CODES.INVALID_OUTPUT:
    case ERROR_CODES.NO_RULES_GIVEN:
    case ERROR_CODES.CONFIG_NOT_FOUND:
    case ERROR_CODES.INVALID_CONFIG_JSON:
    case ERROR_CODES.INVALID_CONFIG_SCHEMA:
    case ERROR_CODES.OUTPUT_DIR_NOT_FOUND:
      return 2;
    case ERROR_CODES.UNKNOWN_RULES:
      return 3;
    case ERROR_CODES.IO_ERROR:
    case ERROR_CODES.IO_ERROR_WRITE_RULES:
    case ERROR_CODES.IO_ERROR_WRITE_CONFIG:
      return 4;
  }
}

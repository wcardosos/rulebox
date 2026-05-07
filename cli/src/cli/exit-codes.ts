export type ErrorCode = "ALREADY_INITIALIZED" | "INVALID_OUTPUT" | "IO_ERROR";

export function exitCodeFor(code: ErrorCode): number {
  switch (code) {
    case "ALREADY_INITIALIZED":
    case "INVALID_OUTPUT":
      return 2;
    case "IO_ERROR":
      return 4;
  }
}

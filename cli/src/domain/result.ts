export type Result<T, E> = { kind: "ok"; value: T } | { kind: "error"; error: E };

export function ok<T, E = never>(value: T): Result<T, E> {
  return { kind: "ok", value };
}

export function err<T = never, E = unknown>(error: E): Result<T, E> {
  return { kind: "error", error };
}

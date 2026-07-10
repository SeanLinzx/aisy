// Helpers for reading JSON values stored as TEXT columns in SQLite. They keep
// the call-sites terse and well-typed without throwing on malformed data.

export function parseJson<T = any>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function parseJsonArray<T = any>(value: string | null | undefined): T[] {
  const v = parseJson<unknown>(value, []);
  return Array.isArray(v) ? (v as T[]) : [];
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function stringifyJsonOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

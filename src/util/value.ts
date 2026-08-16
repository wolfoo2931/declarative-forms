/**
 * Coerce a field value to the string an `<input>` or attribute can hold.
 *
 * Field values are `unknown` because `computed` and `custom` fields may hold
 * anything. The DOM-backed kinds still need a string, and this is the single
 * place that conversion happens — including the deliberate choice to render
 * `null`/`undefined` as `''` rather than `"null"`.
 *
 * Objects are JSON-encoded rather than becoming `[object Object]`, which is
 * what a bare `String()` would produce.
 */
export function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

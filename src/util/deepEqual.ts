/**
 * Structural equality for form data snapshots.
 *
 * Replaces the `@react-hookz/deep-equal` dependency. Scoped to what form values
 * can actually be: primitives, plain objects, arrays, `Date`, and `File`/`Blob`
 * (compared by identity, since their contents are not cheaply comparable).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  if (a instanceof Date) return a.getTime() === (b as Date).getTime();

  // Identity-compared: two distinct File/Blob handles are never treated as equal.
  if (typeof Blob !== 'undefined' && a instanceof Blob) return false;
  if (typeof FileList !== 'undefined' && a instanceof FileList) return false;

  if (Array.isArray(a)) {
    const other = b as unknown[];
    if (a.length !== other.length) return false;
    return a.every((item, i) => deepEqual(item, other[i]));
  }

  if (a instanceof Map) {
    const other = b as Map<unknown, unknown>;
    if (a.size !== other.size) return false;
    for (const [key, value] of a) {
      if (!other.has(key) || !deepEqual(value, other.get(key))) return false;
    }
    return true;
  }

  if (a instanceof Set) {
    const other = b as Set<unknown>;
    if (a.size !== other.size) return false;
    for (const value of a) {
      if (!other.has(value)) return false;
    }
    return true;
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;

  const aKeys = Object.keys(left);
  if (aKeys.length !== Object.keys(right).length) return false;

  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      deepEqual(left[key], right[key]),
  );
}

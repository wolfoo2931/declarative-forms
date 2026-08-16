let formCounter = 0;

/**
 * Per-form unique DOM ids.
 *
 * v1 gave checkboxes ids like `field-0`, which collided between any two forms on
 * the page — and always collided between a parent form and its array sub-form.
 * Scoping the counter per form makes `label[for]` reliable, which is what the
 * accessibility work builds on.
 */
export class IdGenerator {
  private readonly prefix: string;
  private counter = 0;

  constructor(prefix?: string) {
    this.prefix = prefix ?? `dlf${++formCounter}`;
  }

  /** A unique id, e.g. `dlf3-field-2`. */
  next(kind = 'field'): string {
    return `${this.prefix}-${kind}-${++this.counter}`;
  }

  /** A stable id derived from a name, e.g. `dlf3-control-email`. */
  for(kind: string, name: string): string {
    return `${this.prefix}-${kind}-${name}`;
  }
}

/** Reset the global form counter. Test-only. */
export function resetIdCounter(): void {
  formCounter = 0;
}

/**
 * Opt-in HTML for label/message/option content.
 *
 * Everything the library renders is treated as plain text by default. When you
 * genuinely need markup — a link inside a checkbox caption, a tag badge inside a
 * select option — wrap it in {@link html} to say so explicitly.
 */

const SAFE_HTML = Symbol.for('declarative-forms.SafeHtml');

/** A string the caller has explicitly marked as trusted HTML. */
export class SafeHtml {
  /** Brand used by {@link isSafeHtml} so instances survive duplicated module copies. */
  readonly [SAFE_HTML] = true;

  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

export function isSafeHtml(value: unknown): value is SafeHtml {
  return typeof value === 'object' && value !== null && SAFE_HTML in value;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a string for interpolation into an HTML context. */
export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char] as string);
}

/**
 * Mark content as trusted HTML.
 *
 * As a tagged template, interpolated values are escaped and only the literal
 * parts are trusted — this is the form you want for anything data-driven:
 *
 * ```ts
 * html`<b>${userSuppliedName}</b>`
 * ```
 *
 * Called with a plain string, the whole string is trusted. Use it only for
 * markup you control:
 *
 * ```ts
 * html('<span class="dl-option-tag">Offline</span>')
 * ```
 */
export function html(raw: string): SafeHtml;
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml;
export function html(
  stringsOrRaw: string | TemplateStringsArray,
  ...values: unknown[]
): SafeHtml {
  if (typeof stringsOrRaw === 'string') {
    return new SafeHtml(stringsOrRaw);
  }

  let out = stringsOrRaw[0] ?? '';
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    out += isSafeHtml(value) ? value.value : escapeHtml(value);
    out += stringsOrRaw[i + 1] ?? '';
  }

  return new SafeHtml(out);
}

/** Content that is rendered as text unless explicitly wrapped in {@link html}. */
export type TextOrHtml = string | SafeHtml;

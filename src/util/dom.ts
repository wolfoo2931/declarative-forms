import { isSafeHtml, type TextOrHtml } from './html.js';

/**
 * Set an element's content from a {@link TextOrHtml}.
 *
 * Plain strings go through `textContent`; only values explicitly wrapped in
 * `html()` reach `innerHTML`.
 */
export function setContent(el: Element, content: TextOrHtml | null | undefined): void {
  if (content == null) {
    el.textContent = '';
  } else if (isSafeHtml(content)) {
    el.innerHTML = content.value;
  } else {
    el.textContent = content;
  }
}

/** Render a {@link TextOrHtml} to a string, for attributes such as tooltip content. */
export function contentToString(content: TextOrHtml | null | undefined): string {
  if (content == null) return '';
  return isSafeHtml(content) ? content.value : content;
}

export interface CreateElOptions {
  classNames?: readonly (string | undefined | false)[];
  attrs?: Record<string, string | undefined>;
  content?: TextOrHtml;
}

/** Create an element with classes, attributes and content in one call. */
export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: CreateElOptions = {},
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  for (const name of options.classNames ?? []) {
    if (name) el.classList.add(name);
  }

  for (const [key, value] of Object.entries(options.attrs ?? {})) {
    if (value !== undefined) el.setAttribute(key, value);
  }

  if (options.content !== undefined) setContent(el, options.content);

  return el;
}

/** Add each space-separated name in `classNames` to `el`. */
export function addClasses(el: Element, classNames: string | undefined): void {
  if (!classNames) return;
  for (const name of classNames.split(/\s+/)) {
    if (name) el.classList.add(name);
  }
}

/**
 * Find the descendants of `root` whose `attribute` equals `value`.
 *
 * v1 built an attribute selector by string concatenation
 * (`dl-option[value="' + val + '"]`), which threw a `DOMException` on any value
 * containing a quote or a backslash. Comparing in JS sidesteps selector
 * escaping altogether — option lists are small enough that the scan is free.
 */
export function findByAttribute<T extends Element>(
  root: ParentNode,
  selector: string,
  attribute: string,
  value: string,
): T[] {
  return [...root.querySelectorAll(selector)].filter(
    (el) => el.getAttribute(attribute) === value,
  ) as T[];
}

/**
 * Strip whitespace from a tab label to form its class name.
 *
 * Part of the frozen DOM contract: `'Find Citation'` → `.dl-tab-btn.FindCitation`.
 */
export function tabClassName(tab: string): string {
  return tab.replace(/\s/g, '');
}

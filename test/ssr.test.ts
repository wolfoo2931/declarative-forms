/**
 * @vitest-environment node
 *
 * The package must be importable where there is no DOM.
 *
 * Server-rendered and prerendered apps evaluate their imports in Node, and a
 * documentation build or a framework's SSR pass will import the entry point
 * long before any component mounts. Nothing here should need a `window`.
 */
import { describe, expect, it } from 'vitest';

describe('importing without a DOM', () => {
  it('loads the entry point in Node', async () => {
    // Regression: `class DlSelect extends HTMLElement` was evaluated at module
    // load time, so this threw `HTMLElement is not defined` and broke SSR for
    // anyone who merely imported the package.
    await expect(import('../src/index.js')).resolves.toBeDefined();
  });

  it('exposes the element classes as constructors', async () => {
    const { DlSelect, DlOption } = await import('../src/index.js');

    expect(typeof DlSelect).toBe('function');
    expect(typeof DlOption).toBe('function');
  });

  it('makes element registration a no-op rather than an error', async () => {
    const { defineDlSelect } = await import('../src/index.js');

    expect(() => defineDlSelect()).not.toThrow();
  });

  it('makes style injection a no-op rather than an error', async () => {
    const { injectStyles } = await import('../src/index.js');

    expect(() => injectStyles()).not.toThrow();
  });

  it('keeps the DOM-free utilities usable', async () => {
    const { deepEqual, html, escapeHtml } = await import('../src/index.js');

    expect(deepEqual({ a: [1] }, { a: [1] })).toBe(true);
    expect(escapeHtml('<b>')).toBe('&lt;b&gt;');
    expect(html`<b>${'<i>'}</b>`.value).toBe('<b>&lt;i&gt;</b>');
  });
});

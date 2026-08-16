import { afterEach } from 'vitest';
import { cleanupForms } from './helpers.js';

// Suites that assert DOM-free behaviour run under the `node` environment, where
// there is nothing to patch or tear down.
const hasDom = typeof Element !== 'undefined';

if (hasDom) {
  /**
   * happy-dom does not implement layout, so every rect is zero. The combobox and
   * the tooltip both position themselves from `getBoundingClientRect`, so give
   * them plausible numbers rather than letting them silently compute `NaN`.
   */
  Element.prototype.getBoundingClientRect = function (): DOMRect {
    const rect = {
      x: 10,
      y: 20,
      top: 20,
      left: 10,
      bottom: 50,
      right: 210,
      width: 200,
      height: 30,
    };
    return { ...rect, toJSON: () => rect } as DOMRect;
  };

  // `scrollIntoView` is used for keyboard navigation and is absent in happy-dom.
  Element.prototype.scrollIntoView ??= function (): void {};
}

afterEach(() => {
  if (!hasDom) return;
  cleanupForms();
  document.body.replaceChildren();
});

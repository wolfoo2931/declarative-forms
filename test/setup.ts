import { afterEach } from 'vitest';
import { cleanupForms } from './helpers.js';

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

afterEach(() => {
  cleanupForms();
  document.body.replaceChildren();
});

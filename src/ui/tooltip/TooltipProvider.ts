/**
 * Pluggable tooltip backend.
 *
 * v1 hard-depended on tippy.js (and transitively @popperjs/core). The default
 * implementation here is native and dependency-free; pass your own provider to
 * `new DeclarativeForm({ tooltipProvider })` to restore tippy or use any other
 * library.
 */
export interface TooltipProvider {
  /**
   * Attach a tooltip to `element` showing `content` (an HTML string).
   * Called again with new content when the tooltip text changes.
   */
  attach(element: HTMLElement, content: string): void;
  /** Detach the tooltip from `element` and release any resources. */
  detach(element: HTMLElement): void;
}

import { contentToString, createEl } from '../../util/dom.js';
import { NativeTooltipProvider } from './NativeTooltipProvider.js';
import type { TooltipProvider } from './TooltipProvider.js';
import type { TextOrHtml } from '../../util/html.js';

/** Class applied for each message level, matching the shipped stylesheet. */
const LEVEL_CLASS = {
  info: 'tooltip-warning',
  warning: 'tooltip-warning',
  error: 'tooltip-error',
  success: 'tooltip-success',
  loading: 'tooltip-loading',
} as const;

export type TooltipLevel = keyof typeof LEVEL_CLASS;

/**
 * Owns the tooltip markers of one form.
 *
 * v1 looked markers up with `document.querySelector('#dl-form-field-wrapper-for-…')`,
 * so two forms with a same-named field fought over each other's tooltips. This
 * keeps its own registry, keyed by field name.
 */
export class TooltipController {
  private readonly markers = new Map<string, HTMLElement>();
  private readonly provider: TooltipProvider;

  constructor(provider: TooltipProvider = new NativeTooltipProvider()) {
    this.provider = provider;
  }

  /**
   * Create the `<span class="dl-tooltip">?</span>` marker for a field.
   *
   * Registered by field name so `setTooltip(name, …)` can find it later. The
   * `data-tippy-content` attribute is retained from v1 as the content store.
   */
  createMarker(content: TextOrHtml): HTMLElement {
    const text = contentToString(content);
    const marker = createEl('span', {
      classNames: ['dl-tooltip'],
      attrs: {
        'data-tippy-content': text,
        'data-initial-tippy-content': text,
      },
      content: '?',
    });

    this.provider.attach(marker, text);
    return marker;
  }

  /** Associate a marker with a field name. Called by the form after mounting. */
  register(fieldName: string, marker: HTMLElement | undefined): void {
    if (marker) this.markers.set(fieldName, marker);
  }

  /**
   * Replace a field's tooltip text, icon and state class.
   *
   * A field without a tooltip is a silent no-op, matching v1.
   */
  set(fieldName: string, text: string, icon = '?', className = ''): void {
    const marker = this.markers.get(fieldName);
    if (!marker) return;

    const base = marker.classList.contains('dl-tooltip-in-input')
      ? 'dl-tooltip dl-tooltip-in-input'
      : 'dl-tooltip';
    marker.className = className ? `${base} ${className}` : base;

    marker.setAttribute('data-tippy-content', text);
    marker.innerHTML = icon;

    this.provider.attach(marker, text);
  }

  setSuccess(fieldName: string, text: string): void {
    this.set(fieldName, text, '&#10003;', LEVEL_CLASS.success);
  }

  setWarning(fieldName: string, text: string): void {
    this.set(fieldName, text, '!', LEVEL_CLASS.warning);
  }

  setError(fieldName: string, text: string): void {
    this.set(fieldName, text, '!', LEVEL_CLASS.error);
  }

  setLoading(fieldName: string, text: string): void {
    this.set(fieldName, text, '', LEVEL_CLASS.loading);
  }

  /** Apply a `{ level, text }` message from an options loader. */
  setMessage(fieldName: string, level: 'info' | 'warning' | 'error', text: string): void {
    if (level === 'error') this.setError(fieldName, text);
    else this.setWarning(fieldName, text);
  }

  /** Restore a field's original tooltip text and `?` icon. */
  reset(fieldName: string): void {
    const marker = this.markers.get(fieldName);
    if (!marker) return;
    this.set(fieldName, marker.getAttribute('data-initial-tippy-content') ?? '', '?', '');
  }

  resetAll(fieldNames: Iterable<string>): void {
    for (const name of fieldNames) this.reset(name);
  }

  destroy(): void {
    for (const marker of this.markers.values()) this.provider.detach(marker);
    this.markers.clear();
  }
}

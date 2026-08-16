import { createEl } from '../../util/dom.js';
import type { TooltipProvider } from './TooltipProvider.js';

const BUBBLE_CLASS = 'dl-tooltip-bubble';

interface Attachment {
  content: string;
  bubble: HTMLElement | undefined;
  listeners: (() => void)[];
}

/**
 * Zero-dependency tooltip.
 *
 * Renders a positioned bubble on hover and on focus, placed to the right of the
 * trigger and flipped to the left when it would overflow the viewport. Content
 * is an HTML string because tooltip text has always supported markup; callers
 * mark it with `html()` at the descriptor level.
 */
export class NativeTooltipProvider implements TooltipProvider {
  private readonly attachments = new WeakMap<HTMLElement, Attachment>();

  attach(element: HTMLElement, content: string): void {
    const existing = this.attachments.get(element);
    if (existing) {
      existing.content = content;
      if (existing.bubble) existing.bubble.innerHTML = content;
      return;
    }

    const attachment: Attachment = { content, bubble: undefined, listeners: [] };
    this.attachments.set(element, attachment);

    const show = (): void => this.show(element);
    const hide = (): void => this.hide(element);

    const bind = (type: string, handler: EventListener): void => {
      element.addEventListener(type, handler);
      attachment.listeners.push(() => element.removeEventListener(type, handler));
    };

    bind('mouseenter', show);
    bind('mouseleave', hide);
    bind('focus', show);
    bind('blur', hide);
  }

  detach(element: HTMLElement): void {
    const attachment = this.attachments.get(element);
    if (!attachment) return;

    for (const remove of attachment.listeners) remove();
    attachment.bubble?.remove();
    this.attachments.delete(element);
  }

  private show(element: HTMLElement): void {
    const attachment = this.attachments.get(element);
    if (!attachment || attachment.bubble) return;

    const bubble = createEl('div', { classNames: [BUBBLE_CLASS] });
    bubble.innerHTML = attachment.content;
    bubble.setAttribute('role', 'tooltip');
    document.body.appendChild(bubble);
    attachment.bubble = bubble;

    this.position(element, bubble);
  }

  private hide(element: HTMLElement): void {
    const attachment = this.attachments.get(element);
    if (!attachment?.bubble) return;
    attachment.bubble.remove();
    attachment.bubble = undefined;
  }

  private position(element: HTMLElement, bubble: HTMLElement): void {
    const anchor = element.getBoundingClientRect();
    const box = bubble.getBoundingClientRect();
    const gap = 8;

    let left = anchor.right + gap;
    if (left + box.width > window.innerWidth) {
      left = Math.max(gap, anchor.left - box.width - gap);
    }

    const top = anchor.top + anchor.height / 2 - box.height / 2;

    bubble.style.left = `${left + window.scrollX}px`;
    bubble.style.top = `${Math.max(gap, top) + window.scrollY}px`;
  }
}

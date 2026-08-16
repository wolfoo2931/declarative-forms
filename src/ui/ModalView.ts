import { createEl } from '../util/dom.js';
import type { ButtonBar } from './ButtonBar.js';
import type { TabBar } from './TabBar.js';

export interface ModalViewOptions {
  tabBar: TabBar;
  buttonBar: ButtonBar;
  /** Render a close button. Omit for a dialog that cannot be dismissed. */
  onCancel?: () => void;
}

/**
 * The modal chrome.
 *
 * ```html
 * <div class="dl-modal">
 *   <div class="modal">
 *     <div class="up-bar"><button class="cancelBtn secondary"></button></div>
 *     <div class="tabWrapper">…</div>
 *     <div class="modal-content">…the form…</div>
 *     <div class="low-bar">…buttons…</div>
 *   </div>
 * </div>
 * ```
 *
 * Every one of these class names is overridden by at least one consumer, so the
 * structure is fixed. The upper bar is always present but only carries the
 * `up-bar` class when the dialog is dismissable — a v1 quirk that consumer CSS
 * relies on to reserve (or not reserve) the header strip.
 */
export class ModalView {
  readonly wrapper: HTMLElement;
  readonly modal: HTMLElement;
  readonly content: HTMLElement;
  readonly upBar: HTMLElement;

  constructor(options: ModalViewOptions) {
    this.wrapper = createEl('div', { classNames: ['dl-modal'] });
    this.wrapper.style.display = 'none';

    this.modal = createEl('div', { classNames: ['modal'] });
    this.content = createEl('div', { classNames: ['modal-content'] });
    this.upBar = createEl('div');

    if (options.onCancel) {
      this.upBar.classList.add('up-bar');

      const cancel = createEl('button', {
        classNames: ['cancelBtn', 'secondary'],
        attrs: { type: 'button', 'aria-label': 'Close dialog' },
      });
      cancel.onclick = () => options.onCancel?.();

      this.upBar.appendChild(cancel);
    }

    this.modal.appendChild(this.upBar);
    this.modal.appendChild(options.tabBar.element);
    this.modal.appendChild(this.content);
    this.modal.appendChild(options.buttonBar.element);
    this.wrapper.appendChild(this.modal);
  }

  /** Attach to the document body. Used by `openInModal`. */
  mount(): void {
    document.body.appendChild(this.wrapper);
  }

  setVisible(visible: boolean): void {
    this.wrapper.style.display = visible ? 'block' : 'none';
  }

  hide(): void {
    this.wrapper.classList.add('dl-modal-hidden');
  }

  show(): void {
    this.wrapper.classList.remove('dl-modal-hidden');
    // Re-displaying an element restarts its CSS animations. This dialog was
    // already on screen before it was covered, so replaying its entrance would
    // fade the backdrop back in from nothing — a flash of the page underneath.
    this.wrapper.classList.add('dl-modal-restored');
  }

  /**
   * Mark the dialog as opened on top of another one.
   *
   * A stacked dialog inherits a backdrop that is already on screen: the dialog
   * below is hidden in the same frame this one appears. Fading this backdrop in
   * would leave the page uncovered for the length of the animation, so themes
   * suppress it on this class.
   */
  setStacked(stacked: boolean): void {
    this.wrapper.classList.toggle('dl-modal-stacked', stacked);
  }

  /** Mark the dialog as embedded rather than floating. */
  setEmbedded(): void {
    this.wrapper.classList.add('noModalDialog');
  }

  addModalClasses(names: readonly string[] | undefined): void {
    for (const name of names ?? []) this.modal.classList.add(name);
  }

  addWrapperClasses(names: readonly string[] | undefined): void {
    for (const name of names ?? []) this.wrapper.classList.add(name);
  }

  remove(): void {
    this.wrapper.remove();
  }
}

import { addClasses, createEl } from '../util/dom.js';
import type { ButtonContext, ButtonDescriptor, ButtonMap } from '../types/options.js';

export interface ButtonBarCallbacks {
  /** Resolve once all pending form work has settled. */
  whenSettled(): Promise<void>;
  /** Recompute `computed` fields before an action runs. */
  updateComputedFields(): Promise<void>;
  getValues(): Record<string, unknown>;
  /** Run the action and close the dialog. */
  closeWith(action: ButtonDescriptor['action']): Promise<void>;
}

/**
 * The dialog's lower bar.
 *
 * Buttons are real `<button type="button">` elements rather than v1's
 * `<div class="btn">`. They keep the `.btn` class, so every existing stylesheet
 * still matches, and the shipped CSS normalises the font so the change is not
 * visible — but they are now focusable and operable from the keyboard.
 */
export class ButtonBar {
  readonly element: HTMLElement;

  private readonly buttons: { descriptor: ButtonDescriptor; element: HTMLElement }[] = [];

  constructor(
    private readonly config: ButtonMap,
    private readonly callbacks: ButtonBarCallbacks,
  ) {
    this.element = createEl('div', { classNames: ['low-bar'] });

    for (const [label, descriptor] of Object.entries(config)) {
      const button = this.createButton(label, descriptor);
      this.buttons.push({ descriptor, element: button });
      this.element.appendChild(button);
    }
  }

  get count(): number {
    return this.buttons.length;
  }

  /** The first button — the one Enter activates. */
  get primary(): HTMLElement | undefined {
    return this.buttons[0]?.element;
  }

  /** Whether the primary button is currently disabled. */
  get primaryDisabled(): boolean {
    return this.primary?.classList.contains('disabled') ?? false;
  }

  private createButton(label: string, descriptor: ButtonDescriptor): HTMLElement {
    const button = createEl('button', {
      classNames: ['btn'],
      attrs: { type: 'button' },
      content: label,
    });

    if (descriptor.id) button.id = descriptor.id;
    addClasses(button, descriptor.class);

    button.onclick = () => {
      void this.activate(descriptor, button);
    };

    return button;
  }

  private async activate(
    descriptor: ButtonDescriptor,
    button: HTMLElement,
  ): Promise<void> {
    const classes = button.classList;
    if (classes.contains('loading-btn') || classes.contains('disabled')) return;

    classes.add('loading-btn');

    try {
      await this.callbacks.whenSettled();
      // The disabled state can change while pending work settles.
      if (classes.contains('disabled')) return;

      await this.callbacks.updateComputedFields();

      if (descriptor.doNotCloseModal) {
        await descriptor.action?.(this.callbacks.getValues());
      } else {
        await this.callbacks.closeWith(descriptor.action);
      }
    } finally {
      // v1 wrote `.remove('loading-btn')`, which called Element.remove() and
      // deleted the confirm button outright.
      classes.remove('loading-btn');
    }
  }

  /**
   * Re-evaluate every `isActive` / `isVisible` predicate.
   *
   * Buttons without an `id` are skipped, matching v1 — an id is what opts a
   * button into state management.
   */
  async refresh(ctx: ButtonContext): Promise<void> {
    const work: Promise<void>[] = [];

    for (const { descriptor, element } of this.buttons) {
      if (!descriptor.id) continue;

      if (descriptor.isActive) {
        work.push(
          this.applyPredicate(descriptor.isActive(ctx), (active) => {
            element.classList.toggle('disabled', !active);
            element.toggleAttribute('disabled', !active);
          }),
        );
      }

      if (descriptor.isVisible) {
        work.push(
          this.applyPredicate(descriptor.isVisible(ctx), (visible) => {
            element.classList.toggle('invisible', !visible);
          }),
        );
      }
    }

    await Promise.allSettled(work);
  }

  /**
   * Apply a predicate result.
   *
   * A synchronous predicate is applied immediately. v1 always set the button
   * disabled first and cleared it in a `.then()`, which made every button flash
   * disabled on every keystroke and let a well-timed click be dropped.
   */
  private applyPredicate(
    result: boolean | Promise<boolean>,
    apply: (value: boolean) => void,
  ): Promise<void> {
    if (typeof result === 'boolean') {
      apply(result);
      return Promise.resolve();
    }

    return result.then(apply);
  }

  /** The configured buttons, for callers that want to invoke an action directly. */
  get descriptors(): ButtonMap {
    return this.config;
  }
}

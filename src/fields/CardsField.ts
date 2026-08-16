import { Field } from './Field.js';
import { createEl, findByAttribute } from '../util/dom.js';
import { asText } from '../util/value.js';
import type { CardsFieldDescriptor } from '../types/descriptors.js';

/**
 * A row of clickable option cards — a richer alternative to a select when there
 * are few options and each needs a description or an icon.
 *
 * v1 called this `detailedOptions`.
 */
export class CardsField extends Field<CardsFieldDescriptor> {
  private value: string | undefined;

  protected createControl(): HTMLElement {
    const container = createEl('div', { classNames: ['detailed-options'] });

    for (const card of this.descriptor.cards) {
      const cardEl = createEl('div', {
        classNames: ['detailed-option'],
        attrs: { 'data-value': card.value },
        content: card.content,
      });

      cardEl.addEventListener('click', () => {
        this.select(card.value);
        this.requestUpdate();
      });

      container.appendChild(cardEl);
    }

    return container;
  }

  getValue(): string {
    return this.value ?? '';
  }

  setValue(value: unknown): void {
    if (value == null) return;
    this.select(asText(value));
  }

  private select(value: string): void {
    const target = findByAttribute(this.element, '.detailed-option', 'data-value', value)[0];
    if (!target) return;

    this.value = value;
    this.element.setAttribute('value', value);

    for (const card of this.element.querySelectorAll('.detailed-option')) {
      card.classList.remove('active');
    }
    target.classList.add('active');
  }
}

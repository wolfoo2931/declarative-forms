import { Field } from './Field.js';
import { createEl } from '../util/dom.js';
import type { CheckboxFieldDescriptor } from '../types/descriptors.js';

/**
 * A checkbox with a caption.
 *
 * The control is a `<span class="check">` wrapping the input and its caption —
 * part of the frozen DOM contract, since `.dl-form form .check input` and
 * `.check label` are styled by the default stylesheet and by consumers.
 */
export class CheckboxField extends Field<CheckboxFieldDescriptor> {
  private input!: HTMLInputElement;

  protected createControl(): HTMLElement {
    const wrapper = createEl('span', { classNames: ['check'] });

    // v1 used `field-<index>`, which collided across forms. The generator is
    // scoped per form, so a parent form and its array sub-form never clash.
    const inputId = this.context.ids.for('check', this.descriptor.name);

    const input = createEl('input', { attrs: { type: 'checkbox', id: inputId } });
    this.input = input;

    input.oninput = input.onchange = () => {
      wrapper.setAttribute('value', String(input.checked));
      this.requestUpdate();
    };

    const caption = createEl('label', {
      attrs: { for: inputId },
      content: this.descriptor.label,
    });

    wrapper.appendChild(input);
    wrapper.appendChild(caption);
    wrapper.setAttribute('value', 'false');

    return wrapper;
  }

  /** The outer `displayName` label points at the real input, not the wrapper. */
  protected override controlIdForLabel(): string {
    return this.input.id;
  }

  getValue(): boolean {
    return this.input.checked;
  }

  setValue(value: unknown): void {
    const checked = value === 'false' ? false : Boolean(value);
    this.input.checked = checked;
    this.element.setAttribute('value', String(checked));
  }
}

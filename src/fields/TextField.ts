import { Field } from './Field.js';
import { createEl } from '../util/dom.js';
import { asText } from '../util/value.js';
import type { FormChangeContext, TextFieldDescriptor } from '../types/descriptors.js';

/** The fallback kind: a single-line `<input>`. */
export class TextField extends Field<TextFieldDescriptor> {
  private input!: HTMLInputElement;

  protected createControl(): HTMLElement {
    const input = createEl('input');
    this.input = input;

    if (this.descriptor.type) input.type = this.descriptor.type;
    if (this.descriptor.autocomplete) {
      input.setAttribute('autocomplete', this.descriptor.autocomplete);
    }

    const placeholder = this.descriptor.placeholder;
    if (typeof placeholder === 'string') input.placeholder = placeholder;

    input.oninput = () => this.requestUpdate();
    input.onchange = input.oninput;

    return input;
  }

  getValue(): string {
    return this.input.value;
  }

  setValue(value: unknown): void {
    this.input.value = asText(value);
  }

  override onFormUpdate(_ctx: FormChangeContext): void {
    if (typeof this.descriptor.placeholder === 'function') {
      this.input.placeholder = this.resolve(this.descriptor.placeholder) ?? '';
    }
  }
}

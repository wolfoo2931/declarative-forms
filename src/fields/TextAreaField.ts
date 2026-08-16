import { Field } from './Field.js';
import { createEl } from '../util/dom.js';
import { asText } from '../util/value.js';
import type { FormChangeContext, TextAreaFieldDescriptor } from '../types/descriptors.js';

/** A multi-line `<textarea>`. */
export class TextAreaField extends Field<TextAreaFieldDescriptor> {
  private textarea!: HTMLTextAreaElement;

  protected createControl(): HTMLElement {
    const textarea = createEl('textarea');
    this.textarea = textarea;

    const placeholder = this.descriptor.placeholder;
    if (typeof placeholder === 'string') textarea.placeholder = placeholder;

    textarea.oninput = () => this.requestUpdate();
    textarea.onchange = textarea.oninput;

    return textarea;
  }

  /** Whether Enter inserts a newline rather than confirming the dialog. */
  get allowsNewlines(): boolean {
    return this.descriptor.allowNewlines === true;
  }

  getValue(): string {
    return this.textarea.value;
  }

  setValue(value: unknown): void {
    this.textarea.value = asText(value);
  }

  override onFormUpdate(_ctx: FormChangeContext): void {
    if (typeof this.descriptor.placeholder === 'function') {
      this.textarea.placeholder = this.resolve(this.descriptor.placeholder) ?? '';
    }
  }
}

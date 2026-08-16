import { Field } from './Field.js';
import { createEl, setContent } from '../util/dom.js';
import type { FormChangeContext, MessageFieldDescriptor } from '../types/descriptors.js';

/**
 * A presentational paragraph. Holds no value and never appears in `getValues()`.
 */
export class MessageField extends Field<MessageFieldDescriptor> {
  protected createControl(): HTMLElement {
    const el = createEl('p', { classNames: ['message'] });
    setContent(el, this.resolve(this.descriptor.message) ?? '');
    return el;
  }

  override get contributesValue(): boolean {
    return false;
  }

  getValue(): undefined {
    return undefined;
  }

  setValue(): void {
    // Messages are not settable.
  }

  override onFormUpdate(_ctx: FormChangeContext): void {
    if (typeof this.descriptor.message === 'function') {
      setContent(this.element, this.resolve(this.descriptor.message) ?? '');
    }
  }
}

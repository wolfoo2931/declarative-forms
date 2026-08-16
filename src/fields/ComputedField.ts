import { Field } from './Field.js';
import { createEl } from '../util/dom.js';
import type { ComputedFieldDescriptor } from '../types/descriptors.js';

/**
 * A value derived from the rest of the form.
 *
 * Rendered as a hidden input (which adds `.dl-form-hidden-field` to the wrapper)
 * and recomputed before the dialog is confirmed. The computed value lives on the
 * field rather than in the DOM, so it is not limited to strings.
 */
export class ComputedField extends Field<ComputedFieldDescriptor> {
  private value: unknown = '';

  protected createControl(): HTMLElement {
    const input = createEl('input');
    input.type = 'hidden';
    return input;
  }

  getValue(): unknown {
    return this.value;
  }

  setValue(value: unknown): void {
    this.value = value;
  }

  /** Recompute. Awaited by `updateComputedFields()` before a button action runs. */
  async recompute(): Promise<void> {
    const ctx = this.context.contextFor(this.descriptor);
    this.value = await this.descriptor.compute(ctx);
  }
}

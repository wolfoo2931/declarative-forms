import { Field } from './Field.js';
import { createEl } from '../util/dom.js';
import type {
  CustomFieldDescriptor,
  FormChangeContext,
  RenderContext,
} from '../types/descriptors.js';

/**
 * An escape hatch: you render the content, the form manages the value.
 *
 * `render` is called on mount and again on every form update. v1 injected
 * `setValue` and `onChange` onto the DOM element; both now arrive on the render
 * context instead, so the element stays a plain `HTMLElement`.
 */
export class CustomField extends Field<CustomFieldDescriptor> {
  private value: unknown = '';

  protected createControl(): HTMLElement {
    return createEl('p', { classNames: ['render'] });
  }

  getValue(): unknown {
    return this.value;
  }

  setValue(value: unknown): void {
    this.value = value;
  }

  override initialize(): void {
    this.render();
  }

  override onFormUpdate(_ctx: FormChangeContext): void {
    this.render();
  }

  private render(): void {
    this.descriptor.render(this.renderContext());
  }

  private renderContext(): RenderContext {
    const base = this.context.contextFor(this.descriptor);
    return {
      ...base,
      element: this.element,
      requestUpdate: (force = false) => this.requestUpdate(force),
      setValue: (value: unknown) => {
        this.value = value;
        this.requestUpdate();
      },
    };
  }
}

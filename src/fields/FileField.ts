import { Field } from './Field.js';
import { createEl } from '../util/dom.js';
import { asText } from '../util/value.js';
import type { FileFieldDescriptor } from '../types/descriptors.js';

/**
 * A file picker with an image preview.
 *
 * The field's value is the URL returned by the form's `persistFile` hook, not
 * the `File` itself — the dialog stores a reference, the app decides where the
 * bytes go.
 */
export class FileField extends Field<FileFieldDescriptor> {
  private input!: HTMLInputElement;
  private preview!: HTMLElement;
  private url: string | undefined;

  protected createControl(): HTMLElement {
    const container = createEl('div', { classNames: ['file-field'] });
    const preview = createEl('div', { classNames: ['file-preview', 'empty'] });
    const input = createEl('input', { attrs: { type: 'file' } });

    this.preview = preview;
    this.input = input;

    if (this.descriptor.accept) input.setAttribute('accept', this.descriptor.accept);
    input.id = this.context.ids.for('file', this.descriptor.name);

    input.oninput = () => {
      void this.handlePick();
    };

    container.appendChild(preview);
    container.appendChild(input);
    return container;
  }

  protected override controlIdForLabel(): string {
    return this.input.id;
  }

  getValue(): string {
    return this.url ?? '';
  }

  setValue(value: unknown): void {
    const url = value == null || value === '' ? undefined : asText(value);
    this.url = url;

    if (url) {
      this.element.setAttribute('data-value', url);
      this.renderPreview(url);
    } else {
      this.element.removeAttribute('data-value');
      this.clearPreview();
      this.input.value = '';
    }
  }

  override setLoading(loading: boolean): void {
    this.preview.classList.toggle('loading', loading);
  }

  private async handlePick(): Promise<void> {
    const file = this.input.files?.[0];

    if (!file) {
      this.setValue(undefined);
      this.requestUpdate();
      return;
    }

    this.clearPreview();
    this.preview.classList.remove('empty');
    this.setLoading(true);

    try {
      const url = await this.context.persistFile(file);
      this.setValue(url);
    } catch (error) {
      this.setValue(undefined);
      this.reportError(error);
    } finally {
      this.setLoading(false);
      this.requestUpdate();
    }
  }

  /**
   * Surface an upload failure.
   *
   * Dispatches a cancelable `dl-error` event on the field so the app can show
   * its own message; if nothing calls `preventDefault()`, the error is logged
   * rather than vanishing. Throwing here would only produce an unhandled
   * rejection, since this runs from an event handler.
   */
  private reportError(error: unknown): void {
    const event = new CustomEvent('dl-error', {
      bubbles: true,
      cancelable: true,
      detail: { field: this.descriptor.name, error },
    });

    if (this.element.dispatchEvent(event)) {
      console.error(
        `declarative-forms: persistFile failed for field "${this.descriptor.name}".`,
        error,
      );
    }
  }

  private clearPreview(): void {
    this.preview.replaceChildren();
    this.preview.classList.add('empty');
  }

  private renderPreview(url: string): void {
    this.preview.replaceChildren();
    this.preview.classList.remove('empty');

    const container = createEl('div', { classNames: ['file-selection-container'] });
    const image = createEl('img', { classNames: ['file-preview'] });
    image.src = url;
    image.alt = '';

    const deleteButton = createEl('button', {
      classNames: ['file-selection-delete-btn'],
      attrs: { type: 'button', 'aria-label': 'Remove file' },
    });
    deleteButton.appendChild(
      createEl('div', { classNames: ['file-selection-delete-btn-icon'] }),
    );
    deleteButton.onclick = () => {
      this.setValue(undefined);
      this.requestUpdate();
    };

    container.appendChild(image);
    container.appendChild(deleteButton);
    this.preview.appendChild(container);
  }
}

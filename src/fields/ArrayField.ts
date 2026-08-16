import { Field } from './Field.js';
import { createEl, setContent } from '../util/dom.js';
import type {
  ArrayFieldDescriptor,
  FieldDescriptor,
  FormChangeContext,
  FormValues,
} from '../types/descriptors.js';
import type { TextOrHtml } from '../util/html.js';

/**
 * A repeating list of sub-records, each edited in its own nested dialog.
 *
 * v1 implemented this by overwriting the caller's `field.render` with a closure
 * that also owned the suggestion checkboxes and the add/edit/delete buttons.
 * Here the entries, the accepted suggestions and the DOM are all state on the
 * field, and the entry dialogs are built through `context.createSubForm`.
 */
export class ArrayField extends Field<ArrayFieldDescriptor> {
  private entries: FormValues[] = [];
  /** Suggestions the user ticked, kept with their index so they can be un-ticked. */
  private acceptedSuggestions: { entry: FormValues; index: number }[] = [];

  protected createControl(): HTMLElement {
    return createEl('div', { classNames: ['array-of'] });
  }

  override initialize(): void {
    this.render();
  }

  getValue(): FormValues[] {
    const result = [...this.entries];

    // Accepted suggestions are merged in, skipping any already added by hand.
    for (const { entry } of this.acceptedSuggestions) {
      const encoded = JSON.stringify(entry);
      if (!result.some((existing) => JSON.stringify(existing) === encoded)) {
        result.push(entry);
      }
    }

    return result;
  }

  setValue(value: unknown): void {
    this.entries = Array.isArray(value) ? [...(value as FormValues[])] : [];
    this.render();
  }

  override onFormUpdate(_ctx: FormChangeContext): void {
    this.render();
  }

  // ------------------------------------------------------------------ render

  private render(): void {
    this.element.replaceChildren();

    const suggestions = this.resolve(this.descriptor.suggested);
    if (suggestions && suggestions.length > 0) {
      this.element.appendChild(this.renderSuggestions(suggestions));
    }

    this.entries.forEach((entry, index) => {
      this.element.appendChild(this.renderEntry(entry, index));
    });

    this.element.appendChild(this.renderAddButton());
  }

  private renderSuggestions(suggestions: readonly FormValues[]): HTMLElement {
    const container = createEl('div', {
      classNames: ['dl-form-array-suggested-container'],
    });

    suggestions.forEach((suggestion, index) => {
      const id = this.context.ids.for(
        'suggestion',
        `${this.descriptor.name}-${String(index)}`,
      );

      const wrapper = createEl('span', {
        classNames: ['check', 'dl-form-array-of-suggestion'],
        attrs: { value: 'false' },
      });

      const checkbox = createEl('input', { attrs: { type: 'checkbox', id } });
      checkbox.checked = this.acceptedSuggestions.some((item) => item.index === index);

      checkbox.oninput = checkbox.onchange = () => {
        wrapper.setAttribute('value', String(checkbox.checked));

        if (checkbox.checked) {
          this.acceptedSuggestions.push({ entry: suggestion, index });
        } else {
          this.acceptedSuggestions = this.acceptedSuggestions.filter(
            (item) => item.index !== index,
          );
        }

        this.requestUpdate();
      };

      const label = createEl('label', { attrs: { for: id } });
      setContent(label, this.entrySummary(suggestion));

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });

    return container;
  }

  private renderEntry(entry: FormValues, index: number): HTMLElement {
    const row = createEl('div', {
      classNames: ['dl-form-array-of-entry'],
      attrs: { 'data-el-index': String(index) },
    });

    const summary = createEl('span');
    setContent(summary, this.entrySummary(entry));
    row.appendChild(summary);

    const edit = createEl('button', {
      classNames: ['edit-array-of-btn'],
      attrs: { type: 'button', 'data-el-index': String(index) },
      content: 'Edit',
    });
    edit.onclick = (event) => {
      event.preventDefault();
      this.openEntryDialog(index);
    };

    const remove = createEl('button', {
      classNames: ['delete-array-of-btn'],
      attrs: { type: 'button', 'data-el-index': String(index) },
      content: 'Remove',
    });
    remove.onclick = (event) => {
      event.preventDefault();
      this.entries.splice(index, 1);
      this.render();
      this.notifyChange();
      this.requestUpdate(true);
    };

    row.appendChild(edit);
    row.appendChild(remove);
    return row;
  }

  private renderAddButton(): HTMLElement {
    const button = createEl('button', {
      classNames: ['dl-form-array-of-add-entry'],
      attrs: { type: 'button' },
      content: this.descriptor.newButtonLabel ?? 'Add',
    });

    button.onclick = (event) => {
      event.preventDefault();
      this.openEntryDialog();
    };

    return button;
  }

  /** Default summary: every non-empty string value, comma separated. */
  private entrySummary(entry: FormValues): TextOrHtml {
    if (this.descriptor.renderEntry) return this.descriptor.renderEntry(entry);

    return Object.values(entry)
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      .join(', ');
  }

  // ------------------------------------------------------------ entry dialog

  /** Open the add dialog, or the edit dialog when `index` is given. */
  private openEntryDialog(index?: number): void {
    const editing = index !== undefined;
    const existing = editing ? this.entries[index] : undefined;

    const fields = editing ? this.editFields(existing ?? {}) : this.descriptor.of;

    const confirmId = this.context.ids.for('array-confirm', this.descriptor.name);

    const form = this.context.createSubForm({
      classNames: [`form-for-array-of-${this.descriptor.name}`],
      fields,
      isEditingArrayEntry: editing,
      buttons: {
        OK: {
          id: confirmId,
          isActive: ({ data }) => this.validateEntry(data),
          action: (values) => {
            if (editing && index !== undefined) this.entries[index] = values;
            else this.entries.push(values);

            this.render();
            this.notifyChange();
            this.requestUpdate(true);
          },
        },
      },
    });

    form.openInModal();
  }

  /** Seed each field with the entry's current value, then apply `mapFieldsOnEdit`. */
  private editFields(entry: FormValues): readonly FieldDescriptor[] {
    const seeded = this.descriptor.of.map((field) => ({
      ...field,
      defaultValue: entry[field.name] ?? field.defaultValue ?? '',
    })) as FieldDescriptor[];

    return this.descriptor.mapFieldsOnEdit?.(seeded, entry) ?? seeded;
  }

  private validateEntry(entry: FormValues): boolean | Promise<boolean> {
    if (!this.descriptor.isValidRecord) return true;
    return this.descriptor.isValidRecord(entry, this.context.contextFor(this.descriptor));
  }

  private notifyChange(): void {
    const onChange = this.descriptor.onChange;
    if (!onChange) return;

    void this.context.scheduler
      .whenSettled()
      .then(() => onChange(this.context.contextFor(this.descriptor).data));
  }
}

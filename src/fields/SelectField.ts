import { Field } from './Field.js';
import { setContent } from '../util/dom.js';
import { defineDlSelect, type DlOption, type DlSelect } from '../components/DlSelect.js';
import type {
  FormChangeContext,
  SelectFieldDescriptor,
  SelectOption,
} from '../types/descriptors.js';

/** A `<dl-select>` combobox, single or multiple. */
export class SelectField extends Field<SelectFieldDescriptor> {
  private select!: DlSelect;

  protected override get wrapperExtraClass(): string {
    return 'dl-select-wrapper';
  }

  protected createControl(): HTMLElement {
    defineDlSelect();

    const select = document.createElement('dl-select');
    this.select = select;

    if (this.descriptor.multiple) select.setAttribute('multiple', '');

    const placeholder = this.descriptor.placeholder;
    if (typeof placeholder === 'string') select.setAttribute('placeholder', placeholder);

    select.onchange = () => this.requestUpdate();

    return select;
  }

  override async initialize(): Promise<void> {
    await this.loadOptions();
  }

  getValue(): string | string[] {
    const value = this.select.getValue();
    if (value === undefined) return this.descriptor.multiple ? [] : '';
    return value;
  }

  setValue(value: unknown): void {
    this.select.setValue(value);
  }

  override setLoading(loading: boolean): void {
    if (loading) this.select.setLoadingStatus();
    else this.select.unsetLoadingStatus();
  }

  override onFormUpdate(_ctx: FormChangeContext, triggerName: string | undefined): void {
    if (typeof this.descriptor.placeholder === 'function') {
      this.select.setAttribute('placeholder', this.resolve(this.descriptor.placeholder) ?? '');
    }

    const dependsOnTrigger =
      triggerName !== undefined &&
      this.descriptor.reloadOnChangeOf?.includes(triggerName) === true;

    if (dependsOnTrigger && typeof this.descriptor.options === 'function') {
      void this.loadOptions({ reload: true });
    }
  }

  /**
   * Populate the options.
   *
   * Each load claims a generation token; if a newer load starts while this one
   * is still in flight, the stale result is dropped instead of clobbering the
   * fresher options. v1 had no such guard, so a slow response from an earlier
   * keystroke could repopulate the select with outdated values.
   */
  private async loadOptions(opts: { reload?: boolean } = {}): Promise<void> {
    const isCurrent = this.context.scheduler.claim(`options:${this.descriptor.name}`);
    const source = this.descriptor.options;

    const requested =
      typeof source === 'function'
        ? source(this.context.contextFor(this.descriptor))
        : source;

    // A plain array needs no loading state at all.
    const isAsync = requested instanceof Promise;
    if (isAsync) this.select.setLoadingStatus();

    try {
      const options = (await requested) ?? [];
      if (!isCurrent()) return;

      if (opts.reload) this.context.tooltips.reset(this.descriptor.name);

      const previous = this.select.getValue();
      this.select.removeAllOptions();
      for (const option of options) this.select.addOption(this.createOption(option));

      if (isAsync) this.select.unsetLoadingStatus();
      if (previous !== undefined) this.select.setValue(previous);
    } catch (error) {
      if (!isCurrent()) return;
      if (isAsync) this.select.unsetLoadingStatus();
      this.reportOptionsError(error);
    }
  }

  private createOption(option: SelectOption): DlOption {
    const el = document.createElement('dl-option');

    if (typeof option === 'string') {
      el.textContent = option;
      return el;
    }

    el.setAttribute('value', option.value);
    setContent(el, option.label);
    if (option.displayWhenSelected) {
      el.setAttribute('displayWhenSelected', option.displayWhenSelected);
    }

    return el;
  }

  private reportOptionsError(error: unknown): void {
    const handler = this.descriptor.onOptionsError;
    if (!handler) return;

    const message = handler({
      ...this.context.contextFor(this.descriptor),
      error,
    });

    if (message) {
      this.context.tooltips.setMessage(this.descriptor.name, message.level, message.text);
    }
  }
}

import { addClasses, createEl, setContent, tabClassName } from '../util/dom.js';
import type {
  BaseFieldDescriptor,
  FieldContext,
  FieldDescriptor,
  FormChangeContext,
  Reactive,
  TabSpec,
} from '../types/descriptors.js';
import type { FormContext } from '../core/FormContext.js';

/**
 * The imperative handle consumers get from `form.field(name)`.
 *
 * Replaces v1's `descriptor.domElement`, which the library wrote back onto the
 * caller's own object.
 */
export interface FieldHandle {
  readonly name: string;
  /** The control element — an `<input>`, `<textarea>`, `<dl-select>`, … */
  readonly element: HTMLElement;
  /** The `.dl-form-field-wrapper` containing label, tooltip and control. */
  readonly wrapper: HTMLElement;
  getValue(): unknown;
  setValue(value: unknown): void;
  focus(): void;
  /** Show a loading state, where the field kind supports one. */
  setLoading(loading: boolean): void;
}

/**
 * Base class for every field kind.
 *
 * Subclasses implement {@link createControl} plus the value accessors; the base
 * class owns the wrapper, label, tooltip marker and active state — i.e. all the
 * parts of the frozen DOM contract that are the same for every kind.
 */
export abstract class Field<D extends BaseFieldDescriptor = FieldDescriptor>
  implements FieldHandle
{
  readonly wrapper: HTMLElement;

  protected label: HTMLLabelElement | undefined;

  /** The `.dl-tooltip` marker, when this field declares a tooltip. */
  tooltipMarker: HTMLElement | undefined;

  private control: HTMLElement | undefined;
  private active = true;

  constructor(
    readonly descriptor: D,
    protected readonly context: FormContext,
  ) {
    this.wrapper = createEl('div', {
      attrs: { id: `dl-form-field-wrapper-for-${descriptor.name}` },
      classNames: ['dl-form-field-wrapper'],
    });

    this.applyTabClasses();
  }

  /**
   * Build the control and the surrounding label/tooltip.
   *
   * Deliberately separate from the constructor: subclass field initializers run
   * *after* `super()` under ES2022 class-field semantics, so anything
   * `createControl` assigned would be reset to `undefined` if it ran from the
   * base constructor. {@link FieldRegistry} calls this immediately after
   * construction.
   */
  build(): this {
    if (this.control) return this;

    const element = this.createControl();
    this.control = element;

    // v1 set both the property and the attribute; consumer selectors such as
    // `dl-select[name=…]` depend on the attribute being present.
    (element as HTMLInputElement).name = this.descriptor.name;
    element.setAttribute('name', this.descriptor.name);

    if (this.wrapperExtraClass) this.wrapper.classList.add(this.wrapperExtraClass);
    addClasses(this.wrapper, this.descriptor.className);

    this.label = this.createLabel();
    this.createTooltipMarker();

    if ((element as HTMLInputElement).type === 'hidden') {
      this.wrapper.classList.add('dl-form-hidden-field');
    }

    this.wrapper.appendChild(element);
    return this;
  }

  /** The control element — an `<input>`, `<textarea>`, `<dl-select>`, … */
  get element(): HTMLElement {
    if (!this.control) {
      throw new Error('declarativ-forms: field.build() must run before use.');
    }
    return this.control;
  }

  get name(): string {
    return this.descriptor.name;
  }

  /** Extra class the kind contributes to its wrapper, e.g. `dl-select-wrapper`. */
  protected get wrapperExtraClass(): string | undefined {
    return undefined;
  }

  /**
   * Whether this kind holds a value at all.
   *
   * `message` fields are presentational and stay out of `getValues()`.
   */
  get contributesValue(): boolean {
    return true;
  }

  /** Build the control element. Called once, from {@link build}. */
  protected abstract createControl(): HTMLElement;

  abstract getValue(): unknown;
  abstract setValue(value: unknown): void;

  focus(): void {
    (this.element as HTMLElement & { focus?: () => void }).focus?.();
  }

  setLoading(_loading: boolean): void {
    // Only kinds with an async surface (select, file) implement this.
  }

  /** Ask the owning form to recompute values and re-run the update cycle. */
  protected requestUpdate(force = false): void {
    this.context.requestUpdate(this, force);
  }

  /** Resolve a value that may have been given as a function of the form context. */
  protected resolve<T>(value: Reactive<T> | undefined): T | undefined {
    if (typeof value === 'function') {
      return (value as (ctx: FieldContext) => T)(this.context.contextFor(this.descriptor));
    }
    return value;
  }

  isActive(): boolean {
    return this.active;
  }

  setActive(active: boolean): void {
    this.active = active;
    this.wrapper.classList.toggle('inactive', !active);
  }

  /** Show or hide the field because of the currently selected tab. */
  setInTab(inTab: boolean): void {
    this.wrapper.classList.toggle('notInTab', !inTab);
  }

  /** Tabs this field currently belongs to. */
  tabs(): string[] {
    const spec = this.resolve<TabSpec | undefined>(this.descriptor.tab);
    if (!spec) return [];
    return (Array.isArray(spec) ? spec : [spec]).filter(
      (tab): tab is string => typeof tab === 'string' && tab.length > 0,
    );
  }

  /**
   * Apply the default value. Awaited during form initialisation.
   *
   * A `defaultValue` function may return a promise, so the result is always
   * resolved before being applied.
   */
  async applyDefaultValue(): Promise<void> {
    if (this.descriptor.defaultValue === undefined) return;
    const value: unknown = await Promise.resolve(this.resolve(this.descriptor.defaultValue));
    if (value !== undefined) this.setValue(value);
  }

  /**
   * Hook for setup that cannot happen in {@link build} — loading select
   * options, or a first render that needs the form context. May be synchronous.
   */
  initialize(): void | Promise<void> {
    // Overridden where needed.
  }

  /**
   * Called on every form update, after values have settled.
   *
   * @param triggerName name of the field whose input started this update
   */
  onFormUpdate(_ctx: FormChangeContext, _triggerName: string | undefined): void {
    // Overridden where needed.
  }

  destroy(): void {
    this.wrapper.remove();
  }

  private applyTabClasses(): void {
    for (const tab of this.tabsFromStaticDescriptor()) {
      this.wrapper.classList.add(tabClassName(tab));
    }
  }

  /**
   * Tab classes are stamped on at construction time, before the form has any
   * values, so only a statically declared `tab` can contribute one.
   */
  private tabsFromStaticDescriptor(): string[] {
    const spec = this.descriptor.tab;
    if (!spec || typeof spec === 'function') return [];
    return (Array.isArray(spec) ? spec : [spec]).filter(
      (tab): tab is string => typeof tab === 'string' && tab.length > 0,
    );
  }

  private createLabel(): HTMLLabelElement | undefined {
    if (this.descriptor.displayName === undefined) {
      this.wrapper.classList.add('withoutLabel');
      return undefined;
    }

    // v1 pointed `for` at the field name while the control only ever had a
    // `name`, so no label was ever actually associated. Give the control a real
    // id and point at that.
    const controlId = this.controlIdForLabel();
    const label = createEl('label', {
      attrs: { for: controlId },
      content: this.descriptor.displayName,
    });

    this.wrapper.appendChild(label);
    return label;
  }

  /**
   * The id `label[for]` should target.
   *
   * Defaults to giving the control element an id; kinds whose control is a
   * wrapper (checkbox, cards, file) override this to point at the real input.
   */
  protected controlIdForLabel(): string {
    const id = this.context.ids.for('control', this.descriptor.name);
    if (!this.element.id) this.element.id = id;
    return this.element.id;
  }

  private createTooltipMarker(): void {
    const tooltip = this.descriptor.tooltip;
    if (tooltip === undefined) return;

    const descriptor =
      typeof tooltip === 'object' && tooltip !== null && 'text' in tooltip
        ? tooltip
        : { text: tooltip, inInput: false };

    const marker = this.context.tooltips.createMarker(descriptor.text);
    this.tooltipMarker = marker;

    if (this.label && !descriptor.inInput) {
      this.label.appendChild(marker);
    } else {
      marker.classList.add('dl-tooltip-in-input');
      this.element.classList.add('dl-tooltip-inside');
      this.wrapper.appendChild(marker);
    }
  }

  /** Convenience for subclasses that render simple text content. */
  protected setContent = setContent;
}

import { ComputedField } from '../fields/ComputedField.js';
import { TextAreaField } from '../fields/TextAreaField.js';
import { defaultFieldRegistry } from './FieldRegistry.js';
import type { FieldRegistry } from './FieldRegistry.js';
import { FormModel, type InputSubscriber } from './FormModel.js';
import { IdGenerator } from './IdGenerator.js';
import { UpdateScheduler } from './UpdateScheduler.js';
import { ButtonBar } from '../ui/ButtonBar.js';
import { ModalView } from '../ui/ModalView.js';
import { globalModalStack } from '../ui/ModalStack.js';
import type { ModalStack, StackableDialog } from '../ui/ModalStack.js';
import { TabBar } from '../ui/TabBar.js';
import { TooltipController } from '../ui/tooltip/TooltipController.js';
import { createEl } from '../util/dom.js';
import type { Field, FieldHandle } from '../fields/Field.js';
import type { FormContext, SubForm, SubFormOptions } from './FormContext.js';
import type {
  FieldContext,
  FieldDescriptor,
  FormChangeContext,
  FormValues,
} from '../types/descriptors.js';
import type {
  ButtonContext,
  ButtonDescriptor,
  ButtonMap,
  DeclarativeFormOptions,
  OpenInModalOptions,
} from '../types/options.js';

/** Options only used when a form is created as a child of another. */
interface InternalOptions {
  parent?: DeclarativeForm;
  stack?: ModalStack;
  registry?: FieldRegistry;
  isEditingArrayEntry?: boolean;
}

/** Persisted file URLs, so re-picking the same file does not re-upload it. */
const filePersistenceCache = new WeakMap<File, Promise<string>>();

/**
 * A declarative form dialog.
 *
 * ```ts
 * const form = new DeclarativeForm({
 *   fields: [
 *     { name: 'title', displayName: 'Title' },
 *     { name: 'lang', kind: 'select', displayName: 'Language',
 *       options: [{ value: 'en', label: 'English' }] },
 *   ],
 *   onConfirm: (values) => console.log(values),
 *   onCancel: () => {},
 * });
 *
 * form.openInModal();
 * ```
 */
export class DeclarativeForm implements SubForm, StackableDialog {
  /** The `.dl-form` wrapper containing the `<form>`. */
  readonly dom: HTMLElement;
  /** The `<form>` element the fields are rendered into. */
  readonly formElement: HTMLFormElement;

  private readonly options: DeclarativeFormOptions;
  private readonly registry: FieldRegistry;
  private readonly stack: ModalStack;
  private readonly parent: DeclarativeForm | undefined;

  private readonly fieldList: Field[] = [];
  private readonly fieldsByName = new Map<string, Field>();

  private readonly model = new FormModel();
  private readonly scheduler = new UpdateScheduler();
  private readonly ids = new IdGenerator();
  private readonly tooltips: TooltipController;

  private readonly tabBar: TabBar;
  private readonly buttonBar: ButtonBar;
  private view: ModalView | undefined;

  private readonly editingArrayEntry: boolean;
  private embedded = false;
  private ready: Promise<void>;

  constructor(options: DeclarativeFormOptions, internal: InternalOptions = {}) {
    this.options = options;
    this.registry = internal.registry ?? defaultFieldRegistry;
    this.stack = internal.stack ?? globalModalStack;
    this.parent = internal.parent;
    this.editingArrayEntry = internal.isEditingArrayEntry ?? false;

    this.tooltips = new TooltipController(options.tooltipProvider);

    this.dom = createEl('div', { classNames: ['dl-form'] });
    this.formElement = createEl('form', { attrs: { autocomplete: 'off' } });
    for (const name of options.classNames ?? []) this.formElement.classList.add(name);
    this.formElement.onsubmit = (event) => {
      event.preventDefault();
      return false;
    };
    this.dom.appendChild(this.formElement);

    this.tabBar = new TabBar((tab) => this.setActiveTab(tab));
    this.buttonBar = new ButtonBar(this.resolveButtons(), {
      whenSettled: () => this.scheduler.whenSettled(),
      updateComputedFields: () => this.updateComputedFields(),
      getValues: () => this.getValues(),
      closeWith: (action) => this.close(action),
    });

    this.buildFields();
    this.ready = this.initialize();
  }

  // ------------------------------------------------------------------ setup

  private resolveButtons(): ButtonMap {
    if (this.options.buttons) return this.options.buttons;

    return {
      [this.options.confirmLabel ?? 'OK']: {
        id: this.ids.for('confirm', 'default'),
        action: this.options.onConfirm,
      },
    };
  }

  private buildFields(): void {
    const context = this.createFieldContext();

    for (const descriptor of this.options.fields) {
      if (this.fieldsByName.has(descriptor.name)) {
        throw new Error(
          `declarative-forms: duplicate field name "${descriptor.name}". ` +
            'Field names must be unique within a form.',
        );
      }

      const field = this.registry.create(descriptor, context);
      this.fieldList.push(field);
      this.fieldsByName.set(descriptor.name, field);
      this.tooltips.register(descriptor.name, field.tooltipMarker);
      this.formElement.appendChild(field.wrapper);
    }
  }

  private async initialize(): Promise<void> {
    await Promise.allSettled(
      this.fieldList.map((field) =>
        this.scheduler.track(Promise.resolve(field.initialize())),
      ),
    );
    await Promise.allSettled(
      this.fieldList.map((field) => this.scheduler.track(field.applyDefaultValue())),
    );
    await this.update();
  }

  /** Resolves once initial options and default values have been applied. */
  whenReady(): Promise<void> {
    return this.ready.then(() => this.scheduler.whenSettled());
  }

  private createFieldContext(): FormContext {
    return {
      ids: this.ids,
      tooltips: this.tooltips,
      scheduler: this.scheduler,
      get parentData() {
        return undefined;
      },
      stackData: [],
      isEditingArrayEntry: this.editingArrayEntry,
      contextFor: (descriptor) => this.contextFor(descriptor),
      requestUpdate: (source, force) => {
        void this.update(source, force);
      },
      persistFile: (file) => this.persistFile(file),
      createSubForm: (options) => this.createSubForm(options),
    };
  }

  private contextFor(descriptor: FieldDescriptor): FieldContext {
    return {
      data: this.getValues(),
      form: this,
      field: descriptor,
      parentData: this.parent?.getValues(),
      stackData: this.stack.values(),
      isEditingArrayEntry: this.editingArrayEntry,
    };
  }

  private createSubForm(options: SubFormOptions): SubForm {
    return new DeclarativeForm(
      {
        fields: options.fields,
        classNames: options.classNames,
        buttons: options.buttons,
        onCancel: () => {},
        persistFile: this.options.persistFile,
        tooltipProvider: this.options.tooltipProvider,
      },
      {
        parent: this,
        stack: this.stack,
        registry: this.registry,
        isEditingArrayEntry: options.isEditingArrayEntry,
      },
    );
  }

  private async persistFile(file: File): Promise<string> {
    const persist = this.options.persistFile;
    if (!persist) {
      throw new Error(
        'declarative-forms: a file field needs a `persistFile` handler on the form ' +
          'to turn the picked File into a storable URL.',
      );
    }

    const cached = filePersistenceCache.get(file);
    if (cached) return cached;

    const pending = Promise.resolve(persist(file)).then(String);
    filePersistenceCache.set(file, pending);

    try {
      return await pending;
    } catch (error) {
      filePersistenceCache.delete(file);
      throw error;
    }
  }

  // ------------------------------------------------------------------ values

  /**
   * Current values, keyed by field name.
   *
   * Inactive fields (`isActive` returned false) are omitted. The active tab is
   * always included under `activeTab`.
   */
  getValues(): FormValues {
    const values: FormValues = {};

    for (const field of this.fieldList) {
      if (!field.contributesValue || !field.isActive()) continue;
      values[field.name] = field.getValue();
    }

    values['activeTab'] = this.tabBar.activeTab;
    return values;
  }

  /** Imperative handle for a field, or `undefined` if there is no such field. */
  field(name: string): FieldHandle | undefined {
    return this.fieldsByName.get(name);
  }

  /** Every field handle, in declaration order. */
  get fields(): readonly FieldHandle[] {
    return this.fieldList;
  }

  /** Notified whenever the form's values change. Returns an unsubscribe function. */
  subscribeOnInput(subscriber: InputSubscriber): () => void {
    return this.model.subscribe(subscriber);
  }

  // ------------------------------------------------------------------ update

  /**
   * Recompute derived state: field visibility, tabs, reactive content and
   * button predicates.
   *
   * @param source the field whose input triggered this update
   * @param force run even when nothing changed
   * @param includeTab treat a tab switch as a change
   */
  async update(source?: FieldHandle, force = false, includeTab = false): Promise<void> {
    const values = this.getValues();
    const changed = this.model.hasChanged(values, includeTab);
    if (!changed && !force) return;

    const triggerName = source?.name;
    const activeTabs = new Set<string>();

    for (const field of this.fieldList) {
      const ctx: FormChangeContext = {
        ...this.contextFor(field.descriptor),
        data: values,
        trigger: source,
      };

      if (field.descriptor.isActive) {
        const active = field.descriptor.isActive(ctx);
        field.setActive(active);
        if (active) for (const tab of field.tabs()) activeTabs.add(tab);
      } else {
        field.setActive(true);
        for (const tab of field.tabs()) activeTabs.add(tab);
      }

      field.descriptor.onFormChange?.(ctx);
      field.onFormUpdate(ctx, triggerName);
    }

    this.renderTabs(activeTabs);

    await this.scheduler.whenSettled();

    if (changed) this.model.notify(this.getValues());

    await this.buttonBar.refresh(this.buttonContext());
  }

  private buttonContext(): ButtonContext {
    return {
      data: this.getValues(),
      parentData: this.parent?.getValues(),
      stackData: this.stack.values(),
    };
  }

  /** Recompute every `computed` field. Runs before a button action fires. */
  async updateComputedFields(): Promise<void> {
    const computed = this.fieldList.filter(
      (field): field is ComputedField => field instanceof ComputedField,
    );

    await Promise.allSettled(
      computed.map((field) => this.scheduler.track(field.recompute())),
    );
  }

  // -------------------------------------------------------------------- tabs

  /** Tabs in declaration order, keeping only those with at least one active field. */
  private renderTabs(activeTabs: Set<string>): void {
    const ordered: string[] = [];
    for (const field of this.fieldList) {
      for (const tab of field.tabs()) {
        if (activeTabs.has(tab) && !ordered.includes(tab)) ordered.push(tab);
      }
    }

    this.tabBar.render(ordered);
    this.applyActiveTab();
  }

  /**
   * Switch tabs.
   *
   * Called with no argument, it re-applies the current tab — useful after a
   * nested dialog closes and the fields underneath need re-syncing.
   */
  setActiveTab(tab?: string): void {
    if (tab && !this.tabBar.select(tab)) return;
    this.applyActiveTab();
    void this.update(undefined, true, true);
  }

  private applyActiveTab(): void {
    const active = this.tabBar.activeTab;
    if (!active) return;

    for (const field of this.fieldList) {
      const tabs = field.tabs();
      field.setInTab(tabs.length === 0 || tabs.includes(active));
    }
  }

  /** Re-apply the active tab. Called by the stack when this dialog is revealed. */
  refreshTabs(): void {
    this.applyActiveTab();
  }

  // ----------------------------------------------------------------- display

  /**
   * Open the form as a modal dialog.
   *
   * Returns the outer `.dl-modal` element.
   */
  openInModal(options?: OpenInModalOptions): HTMLElement {
    this.embedded = false;

    const view = this.ensureView();
    view.mount();
    view.content.appendChild(this.dom);
    view.setStacked(this.stack.size > 0);
    view.setVisible(true);
    view.addModalClasses(options?.classNames);
    view.addWrapperClasses(options?.wrapperClassNames);

    this.stack.push(this);
    this.applyActiveTab();

    return view.wrapper;
  }

  /** Render the form inline, inside `host`, instead of as a floating dialog. */
  appendInElement(host: HTMLElement, options?: OpenInModalOptions): HTMLElement {
    this.embedded = true;

    const view = this.ensureView();
    view.setEmbedded();
    view.setVisible(true);
    view.addWrapperClasses(options?.classNames);
    view.content.appendChild(this.dom);
    host.appendChild(view.wrapper);

    void this.whenReady().then(() => this.applyActiveTab());

    return view.wrapper;
  }

  private ensureView(): ModalView {
    if (this.view) return this.view;

    this.view = new ModalView({
      tabBar: this.tabBar,
      buttonBar: this.buttonBar,
      onCancel: this.options.onCancel ? () => this.cancel() : undefined,
    });

    return this.view;
  }

  /** The outer `.dl-modal` element, once the form has been displayed. */
  get modalElement(): HTMLElement | undefined {
    return this.view?.wrapper;
  }

  hide(): void {
    this.view?.hide();
  }

  show(): void {
    this.view?.show();
  }

  /** The form's HTML, for tests and snapshots. */
  getHTML(): string {
    return this.dom.outerHTML;
  }

  // ---------------------------------------------------------------- lifecycle

  get buttonCount(): number {
    return this.buttonBar.count;
  }

  /**
   * Run the confirm action and close.
   *
   * @param action defaults to the form's `onConfirm`
   */
  async close(action?: ButtonDescriptor['action']): Promise<void> {
    const callback = action ?? this.options.onConfirm;
    if (callback) await callback(this.getValues());

    if (!this.embedded) this.teardownView();
    this.stack.remove(this);
  }

  /** Dismiss the dialog. A no-op when the form has no `onCancel`. */
  cancel(): void {
    if (!this.options.onCancel) return;

    this.teardownView();
    this.options.onCancel();
    this.stack.remove(this);
  }

  /** Close without running any callback. */
  remove(): void {
    this.teardownView();
    this.stack.remove(this);
  }

  /** Release tooltips and listeners. Call when discarding an embedded form. */
  destroy(): void {
    this.remove();
    this.tooltips.destroy();
    this.scheduler.reset();
    for (const field of this.fieldList) field.destroy();
  }

  private teardownView(): void {
    this.view?.remove();
    this.view = undefined;
  }

  // -------------------------------------------------------- keyboard (stack)

  requestCancel(): void {
    this.cancel();
  }

  /**
   * Enter pressed while this dialog is on top.
   *
   * Inside a textarea that allows newlines, Enter inserts one. Otherwise it
   * confirms — unless the confirm button is disabled.
   */
  requestConfirm(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const field = target?.getAttribute?.('name')
      ? this.fieldsByName.get(target.getAttribute('name') as string)
      : undefined;

    if (field instanceof TextAreaField) {
      // Suppress the newline, but do not confirm either.
      if (!field.allowsNewlines) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (this.buttonBar.primaryDisabled) return;
    this.buttonBar.primary?.click();
  }

  // ---------------------------------------------------------------- tooltips

  setTooltip(fieldName: string, text: string, icon?: string, className?: string): void {
    this.tooltips.set(fieldName, text, icon, className);
  }

  setTooltipSuccess(fieldName: string, text: string): void {
    this.tooltips.setSuccess(fieldName, text);
  }

  setTooltipWarning(fieldName: string, text: string): void {
    this.tooltips.setWarning(fieldName, text);
  }

  setTooltipError(fieldName: string, text: string): void {
    this.tooltips.setError(fieldName, text);
  }

  setTooltipLoading(fieldName: string, text: string): void {
    this.tooltips.setLoading(fieldName, text);
  }

  resetTooltip(fieldName: string): void {
    this.tooltips.reset(fieldName);
  }

  resetTooltips(fieldNames: Iterable<string>): void {
    this.tooltips.resetAll(fieldNames);
  }
}

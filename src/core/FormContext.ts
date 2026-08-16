import type { FieldContext, FieldDescriptor, FormValues } from '../types/descriptors.js';
import type { ButtonMap } from '../types/options.js';
import type { IdGenerator } from './IdGenerator.js';
import type { TooltipController } from '../ui/tooltip/TooltipController.js';
import type { UpdateScheduler } from './UpdateScheduler.js';
import type { FieldHandle } from '../fields/Field.js';

/**
 * The slice of the owning form a field is allowed to see.
 *
 * Fields depend on this narrow interface rather than on `DeclarativeForm`
 * itself, which keeps the dependency one-directional and makes fields testable
 * against a stub.
 */
export interface FormContext {
  readonly ids: IdGenerator;
  readonly tooltips: TooltipController;
  readonly scheduler: UpdateScheduler;
  /** Values of the enclosing form, when this form is nested. */
  readonly parentData: FormValues | undefined;
  /** Values of every form on the modal stack, outermost first. */
  readonly stackData: readonly FormValues[];
  /** True while this form is an "edit existing array entry" dialog. */
  readonly isEditingArrayEntry: boolean;

  /** Build the context object passed to a descriptor callback. */
  contextFor(descriptor: FieldDescriptor): FieldContext;
  /** Re-run the update cycle because `source` changed. */
  requestUpdate(source: FieldHandle | undefined, force?: boolean): void;
  /** Persist a picked file, returning the URL to store as the value. */
  persistFile(file: File): Promise<string>;
  /**
   * Build a nested form that knows this form as its parent.
   *
   * Lets `ArrayField` open entry dialogs without importing `DeclarativeForm`,
   * keeping the field layer free of a cycle back into the core.
   */
  createSubForm(options: SubFormOptions): SubForm;
}

export interface SubFormOptions {
  fields: readonly FieldDescriptor[];
  classNames?: readonly string[];
  buttons: ButtonMap;
  /** Mark the dialog as editing an existing array entry. */
  isEditingArrayEntry?: boolean;
}

/** The slice of a nested form its opener needs. */
export interface SubForm {
  openInModal(): HTMLElement;
  getValues(): FormValues;
}

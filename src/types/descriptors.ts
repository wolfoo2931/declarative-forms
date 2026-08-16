import type { TextOrHtml } from '../util/html.js';
import type { DeclarativeForm } from '../core/DeclarativeForm.js';
import type { FieldHandle } from '../fields/Field.js';

/** A snapshot of a form's values. Always carries the active tab under `activeTab`. */
export type FormValues = Record<string, unknown>;

/**
 * Everything a descriptor callback is given.
 *
 * v1 passed these as a different positional argument list per callback
 * (`isActive(formData, stack, field, parentData)` vs `tab(field)` vs
 * `defaultValue(formData)`). One context object makes them uniform, typed, and
 * extensible without another breaking change.
 */
export interface FieldContext {
  /** Current values of this form. */
  readonly data: FormValues;
  /** The form the field belongs to. */
  readonly form: DeclarativeForm;
  /** The descriptor being evaluated. */
  readonly field: FieldDescriptor;
  /** Values of the enclosing form, when this form is nested (array entry or sub-dialog). */
  readonly parentData: FormValues | undefined;
  /** Values of every form currently on the modal stack, outermost first. */
  readonly stackData: readonly FormValues[];
  /** True while the field is rendered inside an "edit existing array entry" dialog. */
  readonly isEditingArrayEntry: boolean;
}

/** Context for `onFormChange`, which also knows what triggered the update. */
export interface FormChangeContext extends FieldContext {
  /** The field whose input triggered this update, if any. */
  readonly trigger: FieldHandle | undefined;
}

/** Context handed to a `custom` field's `render`. */
export interface RenderContext extends FieldContext {
  /** The element to render into. Owned by the field; safe to replace its children. */
  readonly element: HTMLElement;
  /** Re-run the form update cycle, e.g. after mutating a value from custom UI. */
  requestUpdate(force?: boolean): void;
  /** Set this field's value and trigger an update. */
  setValue(value: unknown): void;
}

/** Context for an options loader that rejected. */
export interface OptionsErrorContext extends FieldContext {
  readonly error: unknown;
}

/** A message to surface on a field's tooltip. */
export interface FieldMessage {
  level: 'info' | 'warning' | 'error';
  text: string;
}

/** A value that may be provided directly, or computed from the form context. */
export type Reactive<T> = T | ((ctx: FieldContext) => T);

/** A tab name, or several — a field may appear in more than one tab. */
export type TabSpec = string | readonly string[];

export interface TooltipDescriptor {
  text: TextOrHtml;
  /** Render the tooltip marker inside the input rather than next to the label. */
  inInput?: boolean;
}

/**
 * A select option.
 *
 * - `'JavaScript'` — value and label are the same
 * - `{ value: 'js', label: 'JavaScript' }`
 * - `{ value: 'js', label: 'JavaScript', displayWhenSelected: 'Lang: JS' }`
 */
export type SelectOption =
  | string
  | {
      value: string;
      label: TextOrHtml;
      /** Shown in the closed input / multi-select tag instead of `label`. */
      displayWhenSelected?: string;
    };

/** Properties shared by every field kind. */
export interface BaseFieldDescriptor {
  /** Key this field's value appears under in `getValues()`. Must be unique per form. */
  name: string;
  /** Label text. Omit to render the field without a label (adds `.withoutLabel`). */
  displayName?: TextOrHtml;
  /** Extra class names for the field wrapper, space separated. */
  className?: string;
  /** Tab(s) this field belongs to. */
  tab?: Reactive<TabSpec | undefined>;
  /** Help marker rendered next to the label, or inside the input. */
  tooltip?: TextOrHtml | TooltipDescriptor;
  /** Return false to hide the field and drop it from `getValues()`. */
  isActive?: (ctx: FieldContext) => boolean;
  /** Called on every form update, after values settle. */
  onFormChange?: (ctx: FormChangeContext) => void;
  /** Names of fields whose change should re-run this field's async work. */
  reloadOnChangeOf?: readonly string[];
  /** Initial value, or a function of the form context. */
  defaultValue?: Reactive<unknown>;
}

export interface TextFieldDescriptor extends BaseFieldDescriptor {
  kind?: 'text';
  /** Maps to the `type` attribute — `'text'`, `'password'`, `'number'`, `'email'`, … */
  type?: string;
  placeholder?: Reactive<string | undefined>;
  /** Maps to the `autocomplete` attribute. Defaults to off at the form level. */
  autocomplete?: string;
}

export interface TextAreaFieldDescriptor extends BaseFieldDescriptor {
  kind: 'textarea';
  placeholder?: Reactive<string | undefined>;
  /** When false (the default), Enter confirms the dialog instead of inserting a newline. */
  allowNewlines?: boolean;
}

export interface SelectFieldDescriptor extends BaseFieldDescriptor {
  kind: 'select';
  /** Options, or a sync/async function of the form context. */
  options: Reactive<
    readonly SelectOption[] | Promise<readonly SelectOption[]> | undefined
  >;
  /** Allow selecting several options. The value becomes a `string[]`. */
  multiple?: boolean;
  placeholder?: Reactive<string | undefined>;
  /** Turn a rejected `options` promise into a tooltip message. */
  onOptionsError?: (ctx: OptionsErrorContext) => FieldMessage | undefined;
}

export interface CheckboxFieldDescriptor extends BaseFieldDescriptor {
  kind: 'checkbox';
  /** Caption rendered next to the box. Wrap in `html()` for links. */
  label: TextOrHtml;
}

export interface MessageFieldDescriptor extends BaseFieldDescriptor {
  kind: 'message';
  /** Static text, or a function of the form context. Wrap in `html()` for markup. */
  message: Reactive<TextOrHtml>;
}

export interface FileFieldDescriptor extends BaseFieldDescriptor {
  kind: 'file';
  /** Maps to the `accept` attribute, e.g. `'image/png, image/jpeg'`. */
  accept?: string;
}

export interface ComputedFieldDescriptor extends BaseFieldDescriptor {
  kind: 'computed';
  /** Derives the value. May be async; runs before the form is confirmed. */
  compute: (ctx: FieldContext) => unknown;
}

export interface CardsFieldDescriptor extends BaseFieldDescriptor {
  kind: 'cards';
  cards: readonly { value: string; content: TextOrHtml }[];
}

export interface CustomFieldDescriptor extends BaseFieldDescriptor {
  kind: 'custom';
  /** Render into `ctx.element`. Called on mount and on every form update. */
  render: (ctx: RenderContext) => void;
}

export interface ArrayFieldDescriptor extends BaseFieldDescriptor {
  kind: 'array';
  /** Field descriptors for one entry. */
  of: readonly FieldDescriptor[];
  /** Label for the add button. Defaults to `'Add'`. */
  newButtonLabel?: string;
  /** One-line summary of an entry. Defaults to joining its non-empty string values. */
  renderEntry?: (entry: FormValues) => TextOrHtml;
  /** Gate the entry dialog's confirm button. */
  isValidRecord?: (entry: FormValues, ctx: FieldContext) => boolean | Promise<boolean>;
  /** Adjust the entry fields when editing an existing entry rather than adding one. */
  mapFieldsOnEdit?: (
    fields: readonly FieldDescriptor[],
    entry: FormValues,
  ) => readonly FieldDescriptor[];
  /** Entries offered as opt-in checkboxes above the list. */
  suggested?: Reactive<readonly FormValues[] | undefined>;
  /** Called after an entry is added, edited or removed. */
  onChange?: (values: FormValues) => void;
}

/** Any built-in field. */
export type FieldDescriptor =
  | TextFieldDescriptor
  | TextAreaFieldDescriptor
  | SelectFieldDescriptor
  | CheckboxFieldDescriptor
  | MessageFieldDescriptor
  | FileFieldDescriptor
  | ComputedFieldDescriptor
  | CardsFieldDescriptor
  | CustomFieldDescriptor
  | ArrayFieldDescriptor;

/** The `kind` discriminant of a built-in field. */
export type FieldKind = NonNullable<FieldDescriptor['kind']>;

import type { FieldDescriptor, FormValues } from './descriptors.js';
import type { TooltipProvider } from '../ui/tooltip/TooltipProvider.js';

/** Predicate context for button state, mirroring {@link FieldContext}. */
export interface ButtonContext {
  readonly data: FormValues;
  readonly parentData: FormValues | undefined;
  readonly stackData: readonly FormValues[];
}

export interface ButtonDescriptor {
  /** Invoked with the form values when the button is pressed. May be async. */
  action?: (values: FormValues) => unknown;
  /**
   * DOM id for the button element.
   *
   * Required for `isActive` / `isVisible` to be wired up — a button without an
   * id is rendered but never state-managed.
   */
  id?: string;
  /** Extra class names, space separated. `'secondary'` is styled by the default CSS. */
  class?: string;
  /** Enable/disable the button. Async predicates are supported. */
  isActive?: (ctx: ButtonContext) => boolean | Promise<boolean>;
  /** Show/hide the button. */
  isVisible?: (ctx: ButtonContext) => boolean | Promise<boolean>;
  /** Run `action` without closing the dialog — for wizard "Next"/"Back" buttons. */
  doNotCloseModal?: boolean;
}

/** Buttons keyed by their visible label. */
export type ButtonMap = Record<string, ButtonDescriptor>;

export interface DeclarativeFormOptions {
  fields: readonly FieldDescriptor[];
  /**
   * Buttons for the dialog's lower bar, keyed by label.
   * Defaults to a single `OK` button running {@link onConfirm}.
   */
  buttons?: ButtonMap;
  /** Label for the default confirm button. Ignored when `buttons` is given. */
  confirmLabel?: string;
  /** Run when the dialog is confirmed. May be async. */
  onConfirm?: (values: FormValues) => unknown;
  /**
   * Run when the dialog is dismissed via Esc or the close button.
   * Omit to make the dialog non-dismissable — no close button is rendered.
   */
  onCancel?: () => void;
  /** Extra class names added to the inner `<form>` element. */
  classNames?: readonly string[];
  /** Persist a picked file and resolve to the URL to store as the field's value. */
  persistFile?: (file: File) => Promise<URL | string>;
  /** Swap the tooltip implementation. Defaults to a native, zero-dependency one. */
  tooltipProvider?: TooltipProvider;
}

export interface OpenInModalOptions {
  /** Class names added to the inner `.modal` element. */
  classNames?: readonly string[];
  /** Class names added to the outer `.dl-modal` wrapper. */
  wrapperClassNames?: readonly string[];
}

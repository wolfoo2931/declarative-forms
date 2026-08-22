import { DeclarativeForm } from './DeclarativeForm.js';
import type { FieldDescriptor, FormValues } from '../types/descriptors.js';
import type {
  ButtonMap,
  DeclarativeFormOptions,
  OpenInModalOptions,
} from '../types/options.js';

/**
 * Everything {@link DeclarativeForm} accepts, minus the three things `ask`
 * owns: the fields it is given, and the two callbacks it turns into a promise.
 */
export interface AskOptions extends Omit<
  DeclarativeFormOptions,
  'fields' | 'onConfirm' | 'onCancel'
> {
  /** Class names for the dialog chrome, as passed to `openInModal`. */
  modal?: OpenInModalOptions;
  /**
   * Whether the dialog can be dismissed with Esc or the close button.
   *
   * Defaults to `true`. When `false` no close button is rendered and the
   * promise can only settle with values — so only turn it off when a button of
   * yours is guaranteed to close the dialog.
   */
  dismissable?: boolean;
}

/**
 * Ask the user for a record, the way `prompt()` asks for a string.
 *
 * Opens the fields as a modal dialog and resolves with its values, or with
 * `undefined` when the user dismisses it.
 *
 * ```ts
 * const release = await ask([
 *   { name: 'title', displayName: 'Release title' },
 *   { name: 'notes', kind: 'textarea', displayName: 'What changed' },
 * ]);
 *
 * if (release) publish(release);
 * ```
 *
 * With custom {@link AskOptions.buttons | buttons}, the promise resolves when
 * any button that closes the dialog has run its action; a `doNotCloseModal`
 * button (a wizard's "Next") leaves it pending, as it leaves the dialog open.
 *
 * Use `new DeclarativeForm(…)` directly when you need the form object itself —
 * to embed it in a page, subscribe to its values, or close it from elsewhere.
 */
export function ask(
  fields: readonly FieldDescriptor[],
  options: AskOptions = {},
): Promise<FormValues | undefined> {
  return askWith(DeclarativeForm, fields, options);
}

/**
 * {@link ask}, against a given form class.
 *
 * Not part of the public API — the seam exists so the documentation site can
 * run the real `ask` against an instrumented `DeclarativeForm` subclass, rather
 * than a copy of this function that could drift from it.
 */
export function askWith(
  FormClass: typeof DeclarativeForm,
  fields: readonly FieldDescriptor[],
  options: AskOptions = {},
): Promise<FormValues | undefined> {
  const { modal, dismissable = true, buttons, ...formOptions } = options;

  return new Promise((resolve) => {
    let settled = false;

    /**
     * Settle after the dialog is gone.
     *
     * `close()` awaits the confirm callback and only then tears the view down
     * and pops the modal stack, so resolving inline would hand control back to
     * the caller while the dialog is still mounted — and a `while` loop that
     * asks again immediately would push its next dialog onto a stack that still
     * holds this one, which renders it as a stacked dialog over nothing. A
     * macrotask runs after all of that settling work, which is microtasks.
     */
    const settle = (values: FormValues | undefined): void => {
      if (settled) return;
      settled = true;
      setTimeout(() => resolve(values), 0);
    };

    new FormClass({
      ...formOptions,
      fields,
      buttons: buttons && settleOnClose(buttons, settle),
      onConfirm: (values) => settle(values),
      onCancel: dismissable ? () => settle(undefined) : undefined,
    }).openInModal(modal);
  });
}

/** Resolve the promise after any dialog-closing button has run its action. */
function settleOnClose(
  buttons: ButtonMap,
  settle: (values: FormValues) => void,
): ButtonMap {
  return Object.fromEntries(
    Object.entries(buttons).map(([label, descriptor]) => [
      label,
      descriptor.doNotCloseModal
        ? descriptor
        : {
            ...descriptor,
            action: async (values: FormValues) => {
              const result = await descriptor.action?.(values);
              settle(values);
              return result;
            },
          },
    ]),
  );
}

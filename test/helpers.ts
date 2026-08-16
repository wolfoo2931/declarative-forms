import { DeclarativeForm } from '../src/core/DeclarativeForm.js';
import { ModalStack } from '../src/ui/ModalStack.js';
import type { DeclarativeFormOptions } from '../src/types/options.js';

const openForms = new Set<DeclarativeForm>();

/** Register a form for teardown. Also used by tests that build forms directly. */
export function trackForm<T extends DeclarativeForm>(form: T): T {
  openForms.add(form);
  return form;
}

/**
 * Tear down every form built during a test.
 *
 * A `ModalStack` keeps a `document` keydown listener for as long as it has an
 * open dialog. Without this, a dialog left open by one test keeps intercepting
 * key events in later ones.
 */
export function cleanupForms(): void {
  for (const form of openForms) form.destroy();
  openForms.clear();
}

/**
 * Build a form on its own modal stack and wait for its async setup.
 *
 * The form is attached to the document, because `<dl-select>` is a custom
 * element and only builds its internals once connected — an unattached form
 * would leave the combobox half-initialised. `openInModal()` simply moves it.
 *
 * Every test gets an isolated stack so dialogs cannot interfere across tests.
 */
export async function makeForm(
  options: DeclarativeFormOptions,
): Promise<DeclarativeForm> {
  const form = trackForm(new DeclarativeForm(options, { stack: new ModalStack() }));
  document.body.appendChild(form.dom);
  await form.whenReady();
  return form;
}

/** Type into an input or textarea and fire the events a real user would. */
export function type(el: HTMLElement, value: string): void {
  (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function click(el: Element | null | undefined): void {
  (el as HTMLElement | undefined)?.click();
}

/** Let queued microtasks and zero-delay timers run. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function press(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

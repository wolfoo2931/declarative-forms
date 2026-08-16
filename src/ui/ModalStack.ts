import type { FormValues } from '../types/descriptors.js';

/** What the stack needs from a form on it. */
export interface StackableDialog {
  getValues(): FormValues;
  hide(): void;
  show(): void;
  /** Re-apply the active tab after being revealed again. */
  refreshTabs(): void;
  /** Handle Esc. No-op when the dialog is not dismissable. */
  requestCancel(): void;
  /** Handle Enter. Only called when the dialog has exactly one button. */
  requestConfirm(event: KeyboardEvent): void;
  /** Number of buttons in the lower bar. */
  readonly buttonCount: number;
}

/**
 * The stack of open modal dialogs.
 *
 * v1 kept this in a module-level `var` and registered its `keydown` handler as
 * an import side effect, which ran even in Node and could not be torn down.
 * Here the listener is attached when the first dialog opens and removed when
 * the last one closes, so importing the library does nothing observable.
 */
export class ModalStack {
  private readonly dialogs: StackableDialog[] = [];
  private listening = false;

  get size(): number {
    return this.dialogs.length;
  }

  /** Values of every dialog on the stack, outermost first. */
  values(): FormValues[] {
    return this.dialogs.map((dialog) => dialog.getValues());
  }

  /** The dialog currently on top, if any. */
  get top(): StackableDialog | undefined {
    return this.dialogs[this.dialogs.length - 1];
  }

  push(dialog: StackableDialog): void {
    this.dialogs.push(dialog);
    this.startListening();

    // Only the topmost dialog stays visible.
    if (this.dialogs.length >= 2) {
      this.dialogs[this.dialogs.length - 2]?.hide();
    }
  }

  /** Remove a dialog and reveal whatever it was covering. */
  remove(dialog: StackableDialog): void {
    const index = this.dialogs.indexOf(dialog);
    if (index < 0) return;

    this.dialogs.splice(index, 1);

    const top = this.top;
    if (top) {
      top.show();
      top.refreshTabs();
    } else {
      this.stopListening();
    }
  }

  contains(dialog: StackableDialog): boolean {
    return this.dialogs.includes(dialog);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const top = this.top;
    if (!top) return;

    if (event.key === 'Escape') {
      top.requestCancel();
    } else if (event.key === 'Enter' && top.buttonCount === 1) {
      top.requestConfirm(event);
    }
  };

  private startListening(): void {
    if (this.listening || typeof document === 'undefined') return;
    document.addEventListener('keydown', this.onKeyDown);
    this.listening = true;
  }

  private stopListening(): void {
    if (!this.listening) return;
    document.removeEventListener('keydown', this.onKeyDown);
    this.listening = false;
  }
}

/** The stack shared by all forms that do not opt into their own. */
export const globalModalStack = new ModalStack();

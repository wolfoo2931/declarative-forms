import { deepEqual } from '../util/deepEqual.js';
import type { FormValues } from '../types/descriptors.js';

export type InputSubscriber = (values: FormValues) => void;

/**
 * Change detection and input subscribers for one form.
 *
 * Tracks two baselines — one including the active tab and one excluding it — so
 * that switching tabs can be treated as a change or not depending on the caller.
 */
export class FormModel {
  private last: FormValues | undefined;
  private lastWithoutTab: FormValues | undefined;
  private readonly subscribers: InputSubscriber[] = [];

  /**
   * Report whether `values` differ from the last seen snapshot, and adopt it as
   * the new baseline.
   *
   * @param includeTab compare `activeTab` as well as the field values
   */
  hasChanged(values: FormValues, includeTab = false): boolean {
    const snapshot = { ...values };
    const withoutTab = { ...values };
    delete withoutTab['activeTab'];

    if (this.last === undefined) {
      this.last = snapshot;
      this.lastWithoutTab = withoutTab;
      return true;
    }

    const baseline = includeTab ? this.last : this.lastWithoutTab;
    const candidate = includeTab ? snapshot : withoutTab;

    if (deepEqual(baseline, candidate)) return false;

    this.last = snapshot;
    this.lastWithoutTab = withoutTab;
    return true;
  }

  subscribe(subscriber: InputSubscriber): () => void {
    this.subscribers.push(subscriber);
    return () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index >= 0) this.subscribers.splice(index, 1);
    };
  }

  notify(values: FormValues): void {
    for (const subscriber of [...this.subscribers]) {
      subscriber(values);
    }
  }

  /** Forget the baseline so the next comparison reports a change. */
  reset(): void {
    this.last = undefined;
    this.lastWithoutTab = undefined;
  }
}

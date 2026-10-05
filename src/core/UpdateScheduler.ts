/**
 * Tracks the form's in-flight async work.
 *
 * v1 pushed every promise onto a `this.allPromises` array that was never
 * cleared, so each `Promise.allSettled(allPromises)` re-awaited the entire
 * history of the form and the array grew without bound. This tracks only what
 * is actually pending, and hands out generation tokens so a slow async result
 * from an earlier keystroke cannot overwrite a newer one.
 */
export class UpdateScheduler {
  private pending = new Set<Promise<unknown>>();
  private updates = new Set<Promise<unknown>>();
  private generations = new Map<string, number>();

  /** Register async work and drop it from the set once it settles. */
  track<T>(work: Promise<T>): Promise<T> {
    this.pending.add(work);
    const forget = (): void => {
      this.pending.delete(work);
    };
    work.then(forget, forget);
    return work;
  }

  /**
   * Register an `update()` pass.
   *
   * Update passes are tracked separately from field work because `update()`
   * waits for field work *as part of* running, so a single set would make it
   * wait for itself. `whenSettled` drains both; `whenFieldWorkSettled`, which
   * is what `update()` itself calls, drains only `pending`.
   *
   * Tracking these at all is the point: `requestUpdate` fires an update and
   * returns, so before this existed `whenSettled()` could resolve with an
   * update still running and the button bar not yet refreshed. `ButtonBar`
   * awaits `whenSettled()` and then re-reads the primary button's `disabled`
   * class to decide whether to accept a confirm -- against a stale class, that
   * check passes and an invalid record is confirmed.
   */
  trackUpdate<T>(work: Promise<T>): Promise<T> {
    this.updates.add(work);
    const forget = (): void => {
      this.updates.delete(work);
    };
    work.then(forget, forget);
    return work;
  }

  /** Number of currently in-flight operations. Test/diagnostics only. */
  get pendingCount(): number {
    return this.pending.size + this.updates.size;
  }

  /**
   * Resolve once nothing is in flight: no field work, and no update pass that
   * might still be about to act on it.
   */
  async whenSettled(): Promise<void> {
    await this.drain(() => [...this.pending, ...this.updates]);
  }

  /**
   * Resolve once field work is done, ignoring update passes.
   *
   * For `update()`'s own use. It cannot wait on `whenSettled`, because it is
   * itself one of the update passes that would be waited for.
   */
  async whenFieldWorkSettled(): Promise<void> {
    await this.drain(() => [...this.pending]);
  }

  /**
   * Loops because settling one batch may schedule another (an options load
   * whose completion triggers a dependent field's reload).
   */
  private async drain(snapshot: () => Promise<unknown>[]): Promise<void> {
    let guard = 0;
    let outstanding = snapshot();

    while (outstanding.length > 0) {
      if (++guard > 100) {
        throw new Error(
          'declarative-forms: form updates did not settle after 100 rounds — ' +
            'a field callback is most likely scheduling work on every update.',
        );
      }
      // Only the snapshot's own promises. Awaiting both sets here would make
      // `whenFieldWorkSettled` wait on the update that called it.
      await Promise.allSettled(outstanding);
      outstanding = snapshot();
    }
  }

  /**
   * Claim the next generation for `key` and return a predicate that reports
   * whether that claim is still the newest.
   *
   * ```ts
   * const isCurrent = scheduler.claim(`options:${field.name}`);
   * const values = await load();
   * if (!isCurrent()) return; // a newer load superseded this one
   * ```
   */
  claim(key: string): () => boolean {
    const generation = (this.generations.get(key) ?? 0) + 1;
    this.generations.set(key, generation);
    return () => this.generations.get(key) === generation;
  }

  /** Invalidate every outstanding claim and forget all pending work. */
  reset(): void {
    this.pending.clear();
    this.updates.clear();
    for (const key of this.generations.keys()) {
      this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    }
  }
}

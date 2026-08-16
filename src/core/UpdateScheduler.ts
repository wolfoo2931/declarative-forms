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

  /** Number of currently in-flight operations. Test/diagnostics only. */
  get pendingCount(): number {
    return this.pending.size;
  }

  /**
   * Resolve once nothing is in flight.
   *
   * Loops because settling one batch may schedule another (an options load
   * whose completion triggers a dependent field's reload).
   */
  async whenSettled(): Promise<void> {
    let guard = 0;
    while (this.pending.size > 0) {
      if (++guard > 100) {
        throw new Error(
          'declarativ-forms: form updates did not settle after 100 rounds — ' +
            'a field callback is most likely scheduling work on every update.',
        );
      }
      await Promise.allSettled([...this.pending]);
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
    for (const key of this.generations.keys()) {
      this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    }
  }
}

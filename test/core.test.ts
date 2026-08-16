import { describe, expect, it, vi } from 'vitest';
import { FormModel } from '../src/core/FormModel.js';
import { UpdateScheduler } from '../src/core/UpdateScheduler.js';
import { IdGenerator } from '../src/core/IdGenerator.js';
import { FieldRegistry, defaultFieldRegistry } from '../src/core/FieldRegistry.js';
import { TabBar } from '../src/ui/TabBar.js';

describe('FormModel', () => {
  it('reports the first snapshot as a change', () => {
    const model = new FormModel();
    expect(model.hasChanged({ a: 1 })).toBe(true);
  });

  it('reports no change for an equal snapshot', () => {
    const model = new FormModel();
    model.hasChanged({ a: 1, b: [1, 2] });
    expect(model.hasChanged({ a: 1, b: [1, 2] })).toBe(false);
  });

  it('ignores activeTab unless asked to include it', () => {
    const model = new FormModel();
    model.hasChanged({ a: 1, activeTab: 'One' });

    expect(model.hasChanged({ a: 1, activeTab: 'Two' })).toBe(false);
    expect(model.hasChanged({ a: 1, activeTab: 'Three' }, true)).toBe(true);
  });

  it('notifies subscribers and supports unsubscribing', () => {
    const model = new FormModel();
    const seen: unknown[] = [];
    const off = model.subscribe((values) => seen.push(values));

    model.notify({ a: 1 });
    off();
    model.notify({ a: 2 });

    expect(seen).toEqual([{ a: 1 }]);
  });
});

describe('UpdateScheduler', () => {
  it('drops settled work instead of accumulating it', async () => {
    const scheduler = new UpdateScheduler();

    for (let i = 0; i < 50; i++) void scheduler.track(Promise.resolve(i));
    await scheduler.whenSettled();

    // v1 pushed onto an array that was never cleared, so this grew without bound.
    expect(scheduler.pendingCount).toBe(0);
  });

  it('waits for work scheduled while settling', async () => {
    const scheduler = new UpdateScheduler();
    let secondDone = false;

    void scheduler.track(
      Promise.resolve().then(() => {
        void scheduler.track(
          new Promise<void>((resolve) =>
            setTimeout(() => {
              secondDone = true;
              resolve();
            }, 5),
          ),
        );
      }),
    );

    await scheduler.whenSettled();
    expect(secondDone).toBe(true);
  });

  it('still settles when tracked work rejects', async () => {
    const scheduler = new UpdateScheduler();
    void scheduler.track(Promise.reject(new Error('nope')));
    await expect(scheduler.whenSettled()).resolves.toBeUndefined();
  });

  it('invalidates an older claim once a newer one is made', () => {
    const scheduler = new UpdateScheduler();

    const first = scheduler.claim('options:lang');
    expect(first()).toBe(true);

    const second = scheduler.claim('options:lang');
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it('keeps claims for different keys independent', () => {
    const scheduler = new UpdateScheduler();
    const a = scheduler.claim('a');
    scheduler.claim('b');
    expect(a()).toBe(true);
  });
});

describe('IdGenerator', () => {
  it('produces ids that do not collide between two generators', () => {
    const a = new IdGenerator();
    const b = new IdGenerator();
    expect(a.for('check', 'agree')).not.toBe(b.for('check', 'agree'));
  });

  it('is stable for the same kind and name within one generator', () => {
    const ids = new IdGenerator();
    expect(ids.for('check', 'agree')).toBe(ids.for('check', 'agree'));
  });

  it('increments for anonymous ids', () => {
    const ids = new IdGenerator('x');
    expect(ids.next()).toBe('x-field-1');
    expect(ids.next()).toBe('x-field-2');
  });
});

describe('FieldRegistry', () => {
  it('knows every built-in kind', () => {
    for (const kind of [
      'text',
      'textarea',
      'select',
      'checkbox',
      'message',
      'file',
      'computed',
      'cards',
      'custom',
      'array',
    ]) {
      expect(defaultFieldRegistry.has(kind)).toBe(true);
    }
  });

  it('names the offending field and the known kinds when a kind is unknown', () => {
    expect(() =>
      defaultFieldRegistry.create({ name: 'oops', kind: 'nope' } as never, {} as never),
    ).toThrow(/unknown field kind "nope" on field "oops"/);
  });

  it('clones without mutating the shared default', () => {
    const custom = defaultFieldRegistry.clone();
    custom.register('rating', class {} as never);

    expect(custom.has('rating')).toBe(true);
    expect(defaultFieldRegistry.has('rating')).toBe(false);
  });

  it('starts empty when constructed without entries', () => {
    expect(new FieldRegistry().has('text')).toBe(false);
  });
});

describe('TabBar', () => {
  it('renders clickable siblings inside .tabWrapper', () => {
    const bar = new TabBar(() => {});
    bar.render(['Find Citation', 'Add Citation']);

    const buttons = [...bar.element.children];
    expect(bar.element.className).toBe('tabWrapper');
    expect(buttons.map((b) => b.className.split(' ')[0])).toEqual([
      'dl-tab-btn',
      'dl-tab-btn',
    ]);
    // monsterwriter's wizard walks these with nextSibling.
    expect(buttons[0]?.nextSibling).toBe(buttons[1]);
  });

  it('derives the class from the label with whitespace stripped', () => {
    const bar = new TabBar(() => {});
    bar.render(['Find Citation']);
    expect(bar.element.querySelector('.dl-tab-btn.FindCitation')).not.toBeNull();
  });

  it('activates the first tab and reports the active one', () => {
    const bar = new TabBar(() => {});
    bar.render(['One', 'Two']);
    expect(bar.activeTab).toBe('One');
    expect(bar.element.querySelector('.dl-tab-btn.One')?.className).toContain('active');
  });

  it('keeps the active tab across a re-render that still contains it', () => {
    const bar = new TabBar(() => {});
    bar.render(['One', 'Two']);
    bar.select('Two');
    bar.render(['One', 'Two', 'Three']);
    expect(bar.activeTab).toBe('Two');
  });

  it('falls back to the first tab when the active one disappears', () => {
    const bar = new TabBar(() => {});
    bar.render(['One', 'Two']);
    bar.select('Two');
    bar.render(['One']);
    expect(bar.activeTab).toBe('One');
  });

  it('marks visited tabs as seen and keeps the mark after a re-render', () => {
    const bar = new TabBar(() => {});
    bar.render(['One', 'Two']);
    bar.select('Two');
    bar.render(['One', 'Two']);
    expect(bar.element.querySelector('.dl-tab-btn.Two')?.className).toContain('seen');
  });

  it('reports failure rather than throwing for a tab it does not render', () => {
    const bar = new TabBar(() => {});
    bar.render(['One']);
    expect(bar.select('Nope')).toBe(false);
    expect(bar.activeTab).toBe('One');
  });

  it('notifies on click', () => {
    const onSelect = vi.fn();
    const bar = new TabBar(onSelect);
    bar.render(['One', 'Two']);

    (bar.element.querySelector('.dl-tab-btn.Two') as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith('Two');
  });
});

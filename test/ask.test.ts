import { describe, expect, it, vi } from 'vitest';
import { ask } from '../src/core/ask.js';
import { click, flush, press, type } from './helpers.js';

/** The dialog `ask` opened, or the topmost one when several are open. */
function modal(): HTMLElement | null {
  const modals = document.querySelectorAll<HTMLElement>('.dl-modal');
  return modals[modals.length - 1] ?? null;
}

function buttons(): HTMLElement[] {
  return [...(modal()?.querySelectorAll<HTMLElement>('.low-bar .btn') ?? [])];
}

function input(name: string): HTMLElement {
  return modal()!.querySelector<HTMLElement>(`[name="${name}"]`)!;
}

/** Resolve to `'pending'` when the promise has not settled by the next tick. */
function settledOr<T>(promise: Promise<T>): Promise<T | 'pending'> {
  return Promise.race([promise, flush().then(() => 'pending' as const)]);
}

describe('ask', () => {
  it('resolves with the values when the dialog is confirmed', async () => {
    const answer = ask([{ name: 'title' }, { name: 'notes', kind: 'textarea' }]);
    await flush();

    type(input('title'), 'Sunrise 2.0');
    click(buttons()[0]);

    expect(await answer).toMatchObject({ title: 'Sunrise 2.0', notes: '' });
  });

  it('resolves with undefined when the dialog is dismissed', async () => {
    const answer = ask([{ name: 'title' }]);
    await flush();

    click(modal()!.querySelector('.cancelBtn'));

    expect(await answer).toBeUndefined();
  });

  it('resolves with undefined when Esc dismisses the dialog', async () => {
    const answer = ask([{ name: 'title' }]);
    await flush();

    press(document, 'Escape');

    expect(await answer).toBeUndefined();
  });

  it('waits for async options before the user sees the dialog', async () => {
    const answer = ask([
      {
        name: 'reviewer',
        kind: 'select',
        options: async () => ['Ada Lovelace', 'Grace Hopper'],
        defaultValue: 'Grace Hopper',
      },
    ]);
    await flush();

    click(buttons()[0]);

    expect(await answer).toMatchObject({ reviewer: 'Grace Hopper' });
  });

  it('labels the confirm button from confirmLabel', async () => {
    const answer = ask([{ name: 'title' }], { confirmLabel: 'Publish' });
    await flush();

    expect(buttons()[0]!.textContent).toBe('Publish');

    click(buttons()[0]);
    await answer;
  });

  it('forwards modal class names to openInModal', async () => {
    const answer = ask([{ name: 'title' }], {
      modal: { classNames: ['wide'], wrapperClassNames: ['dark'] },
    });
    await flush();

    expect(modal()!.classList.contains('dark')).toBe(true);
    expect(modal()!.querySelector('.modal')!.classList.contains('wide')).toBe(true);

    click(buttons()[0]);
    await answer;
  });

  it('settles only after the dialog is gone, so the next ask starts clean', async () => {
    const first = ask([{ name: 'title' }]);
    await flush();
    click(buttons()[0]);
    await first;

    // The dialog that resolved has been torn down and popped off the stack.
    expect(document.querySelectorAll('.dl-modal')).toHaveLength(0);

    const second = ask([{ name: 'title' }]);
    await flush();

    // A dialog opened over an empty stack must not be rendered as a stacked one.
    expect(modal()!.classList.contains('dl-modal-stacked')).toBe(false);

    click(buttons()[0]);
    await second;
  });

  describe('dismissable: false', () => {
    it('renders no close button and ignores Esc', async () => {
      const answer = ask([{ name: 'title' }], { dismissable: false });
      await flush();

      expect(modal()!.querySelector('.cancelBtn')).toBeNull();

      press(document, 'Escape');
      expect(await settledOr(answer)).toBe('pending');

      click(buttons()[0]);
      expect(await answer).toMatchObject({ title: '' });
    });
  });

  describe('with custom buttons', () => {
    it('resolves after a closing button has run its action', async () => {
      const action = vi.fn();
      const answer = ask([{ name: 'title' }], {
        buttons: { Save: { id: 'save', action } },
      });
      await flush();

      type(input('title'), 'Sunrise 2.0');
      click(buttons()[0]);

      expect(await answer).toMatchObject({ title: 'Sunrise 2.0' });
      expect(action).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Sunrise 2.0' }),
      );
    });

    it('waits for an async action before resolving', async () => {
      const order: string[] = [];
      const answer = ask([{ name: 'title' }], {
        buttons: {
          Save: {
            id: 'save',
            action: async () => {
              await flush();
              order.push('action');
            },
          },
        },
      });
      await flush();

      click(buttons()[0]);
      await answer;
      order.push('resolved');

      expect(order).toEqual(['action', 'resolved']);
    });

    it('stays pending while a doNotCloseModal button runs', async () => {
      const answer = ask([{ name: 'title' }], {
        buttons: {
          Next: { id: 'next', doNotCloseModal: true, action: () => {} },
          Done: { id: 'done' },
        },
      });
      await flush();

      click(buttons()[0]);
      expect(await settledOr(answer)).toBe('pending');
      expect(modal()).not.toBeNull();

      click(buttons()[1]);
      expect(await answer).toMatchObject({ title: '' });
    });
  });
});

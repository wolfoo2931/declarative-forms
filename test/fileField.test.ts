import { describe, expect, it, vi } from 'vitest';
import { flush, makeForm } from './helpers.js';

/**
 * Simulate a user picking a file.
 *
 * `HTMLInputElement.files` cannot be assigned, so stub the property on this one
 * instance and fire the same `input` event the browser would.
 */
function pick(input: HTMLInputElement, ...files: File[]): void {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: Object.assign(files, { item: (i: number) => files[i] ?? null }),
  });
  input.dispatchEvent(new Event('input'));
}

const fileInput = (form: Awaited<ReturnType<typeof makeForm>>, name: string) =>
  form.field(name)!.element.querySelector('input[type=file]') as HTMLInputElement;

describe('file field picking', () => {
  it('stores the URL returned by persistFile', async () => {
    const persistFile = vi.fn(async () => 'https://cdn.example.com/logo.png');
    const form = await makeForm({
      fields: [{ name: 'logo', kind: 'file' }],
      persistFile,
    });

    const file = new File(['data'], 'logo.png', { type: 'image/png' });
    pick(fileInput(form, 'logo'), file);
    await flush();

    expect(persistFile).toHaveBeenCalledWith(file);
    expect(form.getValues()['logo']).toBe('https://cdn.example.com/logo.png');
  });

  it('accepts a URL object from persistFile', async () => {
    const form = await makeForm({
      fields: [{ name: 'logo', kind: 'file' }],
      persistFile: async () => new URL('https://cdn.example.com/a.png'),
    });

    pick(fileInput(form, 'logo'), new File([''], 'a.png'));
    await flush();

    expect(form.getValues()['logo']).toBe('https://cdn.example.com/a.png');
  });

  it('renders a preview image pointing at the stored URL', async () => {
    const form = await makeForm({
      fields: [{ name: 'logo', kind: 'file' }],
      persistFile: async () => 'https://cdn.example.com/logo.png',
    });

    pick(fileInput(form, 'logo'), new File([''], 'logo.png'));
    await flush();

    const image = form.field('logo')!.element.querySelector('img');
    expect(image?.getAttribute('src')).toBe('https://cdn.example.com/logo.png');
    // Decorative: the field's own label names it.
    expect(image?.getAttribute('alt')).toBe('');
  });

  it('shows the loading state only while persisting', async () => {
    let release!: () => void;
    const form = await makeForm({
      fields: [{ name: 'logo', kind: 'file' }],
      persistFile: () =>
        new Promise<string>((resolve) => {
          release = () => resolve('https://cdn.example.com/logo.png');
        }),
    });

    const preview = form.field('logo')!.element.querySelector('.file-preview')!;
    pick(fileInput(form, 'logo'), new File([''], 'logo.png'));

    expect(preview.classList.contains('loading')).toBe(true);
    release();
    await flush();
    expect(preview.classList.contains('loading')).toBe(false);
  });

  it('uploads the same File only once', async () => {
    const persistFile = vi.fn(async () => 'https://cdn.example.com/logo.png');
    const form = await makeForm({
      fields: [{ name: 'a', kind: 'file' }, { name: 'b', kind: 'file' }],
      persistFile,
    });

    const file = new File(['data'], 'logo.png');
    pick(fileInput(form, 'a'), file);
    await flush();
    pick(fileInput(form, 'b'), file);
    await flush();

    expect(persistFile).toHaveBeenCalledTimes(1);
    expect(form.getValues()['b']).toBe('https://cdn.example.com/logo.png');
  });

  it('reports an upload failure as a cancelable dl-error event', async () => {
    const form = await makeForm({
      fields: [{ name: 'logo', kind: 'file' }],
      persistFile: async () => {
        throw new Error('network');
      },
    });

    const seen: unknown[] = [];
    form.dom.addEventListener('dl-error', (event) => {
      seen.push((event as CustomEvent).detail);
      event.preventDefault(); // suppress the console fallback
    });

    pick(fileInput(form, 'logo'), new File([''], 'logo.png'));
    await flush();

    expect(seen).toEqual([
      { field: 'logo', error: expect.objectContaining({ message: 'network' }) },
    ]);
    expect(form.getValues()['logo']).toBe('');
  });

  it('retries after a failed upload rather than caching the failure', async () => {
    let attempt = 0;
    const form = await makeForm({
      fields: [{ name: 'logo', kind: 'file' }],
      persistFile: async () => {
        if (++attempt === 1) throw new Error('network');
        return 'https://cdn.example.com/logo.png';
      },
    });

    const file = new File(['data'], 'logo.png');
    const input = fileInput(form, 'logo');

    form.dom.addEventListener('dl-error', (event) => event.preventDefault());

    pick(input, file);
    await flush();
    expect(form.getValues()['logo']).toBe('');

    pick(input, file);
    await flush();
    expect(form.getValues()['logo']).toBe('https://cdn.example.com/logo.png');
    expect(attempt).toBe(2);
  });

  it('clears back to empty when the picker is cancelled', async () => {
    const form = await makeForm({
      fields: [{ name: 'logo', kind: 'file' }],
      persistFile: async () => 'https://cdn.example.com/logo.png',
    });

    const input = fileInput(form, 'logo');
    pick(input, new File([''], 'logo.png'));
    await flush();

    pick(input);
    await flush();

    expect(form.getValues()['logo']).toBe('');
    expect(
      form.field('logo')!.element.querySelector('.file-preview')?.classList.contains('empty'),
    ).toBe(true);
  });
});

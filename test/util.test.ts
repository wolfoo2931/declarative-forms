import { describe, expect, it } from 'vitest';
import { deepEqual } from '../src/util/deepEqual.js';
import { escapeHtml, html, isSafeHtml, SafeHtml } from '../src/util/html.js';
import { findByAttribute, setContent, tabClassName } from '../src/util/dom.js';

describe('deepEqual', () => {
  it('compares primitives, including the falsy ones', () => {
    expect(deepEqual('', '')).toBe(true);
    expect(deepEqual(0, 0)).toBe(true);
    expect(deepEqual(false, false)).toBe(true);
    expect(deepEqual(0, '')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  it('compares nested objects and arrays structurally', () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('does not treat a missing key as equal to an undefined one', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
  });

  it('compares dates by value and blobs by identity', () => {
    expect(deepEqual(new Date(5), new Date(5))).toBe(true);
    expect(deepEqual(new Date(5), new Date(6))).toBe(false);

    const blob = new Blob(['x']);
    expect(deepEqual(blob, blob)).toBe(true);
    expect(deepEqual(new Blob(['x']), new Blob(['x']))).toBe(false);
  });

  it('compares maps and sets', () => {
    expect(deepEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(true);
    expect(deepEqual(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(deepEqual(new Set([1]), new Set([2]))).toBe(false);
  });
});

describe('html', () => {
  it('marks a plain string as trusted in full', () => {
    const value = html('<b>bold</b>');
    expect(isSafeHtml(value)).toBe(true);
    expect(value.value).toBe('<b>bold</b>');
  });

  it('escapes interpolations in the tagged-template form', () => {
    const evil = '<img src=x onerror=alert(1)>';
    expect(html`<b>${evil}</b>`.value).toBe('<b>&lt;img src=x onerror=alert(1)&gt;</b>');
  });

  it('passes nested SafeHtml through unescaped', () => {
    expect(html`<p>${html('<b>x</b>')}</p>`.value).toBe('<p><b>x</b></p>');
  });

  it('escapes every dangerous character', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('recognises SafeHtml across module instances via a global symbol', () => {
    const foreign = { [Symbol.for('declarative-forms.SafeHtml')]: true, value: 'x' };
    expect(isSafeHtml(foreign)).toBe(true);
    expect(isSafeHtml(new SafeHtml('x'))).toBe(true);
    expect(isSafeHtml('<b>x</b>')).toBe(false);
  });
});

describe('setContent', () => {
  it('renders a plain string as text, never as markup', () => {
    const el = document.createElement('div');
    setContent(el, '<script>alert(1)</script>');
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toBe('<script>alert(1)</script>');
  });

  it('renders SafeHtml as markup', () => {
    const el = document.createElement('div');
    setContent(el, html('<b>bold</b>'));
    expect(el.querySelector('b')?.textContent).toBe('bold');
  });
});

describe('findByAttribute', () => {
  it('matches values containing quotes and backslashes', () => {
    const root = document.createElement('div');
    for (const value of ['he said "hi"', 'back\\slash', 'plain']) {
      const span = document.createElement('span');
      span.setAttribute('data-v', value);
      root.appendChild(span);
    }

    expect(findByAttribute(root, 'span', 'data-v', 'he said "hi"')).toHaveLength(1);
    expect(findByAttribute(root, 'span', 'data-v', 'back\\slash')).toHaveLength(1);
    expect(findByAttribute(root, 'span', 'data-v', 'missing')).toHaveLength(0);
  });

  it('returns every element sharing the value', () => {
    const root = document.createElement('div');
    root.innerHTML = '<i data-v="a"></i><i data-v="a"></i><i data-v="b"></i>';
    expect(findByAttribute(root, 'i', 'data-v', 'a')).toHaveLength(2);
  });
});

describe('tabClassName', () => {
  it('strips whitespace, matching the frozen DOM contract', () => {
    expect(tabClassName('Find Citation')).toBe('FindCitation');
    expect(tabClassName('General  Settings')).toBe('GeneralSettings');
  });
});

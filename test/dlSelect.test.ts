import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineDlSelect, type DlOption, type DlSelect } from '../src/components/DlSelect.js';
import { press } from './helpers.js';

defineDlSelect();

function makeSelect(
  values: (string | [value: string, label: string, display?: string])[],
  attrs: Record<string, string> = {},
): DlSelect {
  const select = document.createElement('dl-select');
  for (const [key, value] of Object.entries(attrs)) select.setAttribute(key, value);

  for (const entry of values) {
    const option = document.createElement('dl-option');
    if (typeof entry === 'string') {
      option.textContent = entry;
    } else {
      option.setAttribute('value', entry[0]);
      option.textContent = entry[1];
      if (entry[2]) option.setAttribute('displayWhenSelected', entry[2]);
    }
    select.appendChild(option);
  }

  document.body.appendChild(select);
  return select;
}

describe('dl-select', () => {
  let select: DlSelect;

  beforeEach(() => {
    select = makeSelect(['JavaScript', 'Java', 'C++', 'Python']);
  });

  it('registers both custom elements', () => {
    expect(customElements.get('dl-select')).toBeDefined();
    // v1 never registered dl-option, leaving it an HTMLUnknownElement.
    expect(customElements.get('dl-option')).toBeDefined();
  });

  it('moves the options into an .options-wrapper tagged with the field name', () => {
    const named = makeSelect(['a'], { name: 'lang' });
    expect(named.optionsWrapper.className).toBe('options-wrapper');
    expect(named.optionsWrapper.getAttribute('data-for-dl-select')).toBe('lang');
    expect(named.optionsWrapper.querySelectorAll('dl-option')).toHaveLength(1);
  });

  it('keeps the options hidden until focused', () => {
    expect(select.optionsWrapper.style.display).toBe('none');
    select.open();
    expect(select.optionsWrapper.style.display).toBe('inline-block');
    select.close();
    expect(select.optionsWrapper.style.display).toBe('none');
  });

  it('reparents the popup to the body while open so it escapes scroll containers', () => {
    select.open();
    expect(select.optionsWrapper.parentElement).toBe(document.body);
    select.close();
    expect(select.optionsWrapper.parentElement).toBe(select);
  });

  it('marks itself focused with a class', () => {
    select.open();
    expect(select.classList.contains('dl-focused')).toBe(true);
    select.close();
    expect(select.classList.contains('dl-focused')).toBe(false);
  });

  describe('filtering', () => {
    it('shows only options matching every typed term', () => {
      select.filterOptions('ja');
      const visible = select.options.filter((o) => o.style.display !== 'none');
      expect(visible.map((o) => o.textContent)).toEqual(['JavaScript', 'Java']);
    });

    it('is case-insensitive and matches on all space-separated terms', () => {
      const s = makeSelect(['Hello World', 'Hello There']);
      s.filterOptions('hello world');
      const visible = s.options.filter((o) => o.style.display !== 'none');
      expect(visible).toHaveLength(1);
    });

    it('shows a hint when nothing matches', () => {
      select.filterOptions('zzz');
      expect(select.noMatchesHint.style.display).toBe('block');
      expect(select.noMatchesHint.textContent).toBe('No Matches');

      select.filterOptions('');
      expect(select.noMatchesHint.style.display).toBe('none');
    });
  });

  describe('keyboard navigation', () => {
    it('moves down and up through the options', () => {
      select.open();

      press(select, 'ArrowDown');
      expect(select.options[0]?.classList.contains('dl-focused')).toBe(true);

      press(select, 'ArrowDown');
      expect(select.options[1]?.classList.contains('dl-focused')).toBe(true);

      press(select, 'ArrowUp');
      expect(select.options[0]?.classList.contains('dl-focused')).toBe(true);
    });

    it('selects the focused option with Enter', () => {
      select.open();
      press(select, 'ArrowDown');
      press(select, 'ArrowDown');
      press(select, 'Enter');

      expect(select.getValue()).toBe('Java');
    });

    it('only steps through options that survived the filter', () => {
      select.open();
      select.filterOptions('java');

      press(select, 'ArrowDown');
      press(select, 'ArrowDown');
      press(select, 'Enter');

      expect(select.getValue()).toBe('Java');
    });

    it('stops at the ends rather than wrapping', () => {
      select.open();
      press(select, 'ArrowUp');
      expect(select.options.at(-1)?.classList.contains('dl-focused')).toBe(true);
    });

    it('consumes the keys it handles and ignores the rest', () => {
      select.open();
      expect(press(select, 'ArrowDown').defaultPrevented).toBe(true);
      expect(press(select, 'a').defaultPrevented).toBe(false);
    });
  });

  describe('single selection', () => {
    it('reports the option text when there is no value attribute', () => {
      select.setValue('Python');
      expect(select.getValue()).toBe('Python');
      expect(select.getAttribute('value')).toBe('Python');
    });

    it('reports the value attribute rather than the label', () => {
      const s = makeSelect([['en', 'English'], ['de', 'German']]);
      s.setValue('en');
      expect(s.getValue()).toBe('en');
    });

    it('shows displayWhenSelected in the input instead of the label', () => {
      const s = makeSelect([['bk', 'Book', 'Type: Book']]);
      s.setValue('bk');
      s.close();
      expect(s.inputField.value).toBe('Type: Book');
    });

    it('emits a change event on selection', () => {
      const onChange = vi.fn();
      select.addEventListener('change', onChange);
      select.setValue('Java');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('ignores a value with no matching option', () => {
      select.setValue('Rust');
      expect(select.getValue()).toBeUndefined();
    });

    it('handles values containing quotes and backslashes', () => {
      // v1 concatenated these into an attribute selector and threw.
      const tricky = 'say "hi"\\now';
      const s = makeSelect([[tricky, 'Tricky']]);
      expect(() => s.setValue(tricky)).not.toThrow();
      expect(s.getValue()).toBe(tricky);
    });

    it('restores the selected text when focus is lost after typing', () => {
      select.setValue('Java');
      select.open();
      select.inputField.value = 'nonsense';
      select.close();
      expect(select.inputField.value).toBe('Java');
    });

    it('clears the input on focus so typing starts fresh', () => {
      select.setValue('Java');
      select.open();
      expect(select.inputField.value).toBe('');
    });
  });

  describe('multiple selection', () => {
    it('collects values into a JSON array', () => {
      const s = makeSelect([['a', 'Alpha'], ['b', 'Beta']], { multiple: '' });
      s.setValue(['a', 'b']);
      expect(s.getValue()).toEqual(['a', 'b']);
    });

    it('renders a tag per selection, using displayWhenSelected', () => {
      const s = makeSelect([['a', 'Alpha', 'A!']], { multiple: '' });
      s.setValue(['a']);

      const tag = s.selectedContainer.querySelector('.multiselect-tag');
      expect(tag?.textContent).toContain('A!');
      // The "muliselect" typo is frozen: consumers style these class names.
      expect(tag?.querySelector('.dl-muliselect-selected-remove')).not.toBeNull();
      expect(
        tag?.querySelector('.dl-muliselect-selected-remove-container'),
      ).not.toBeNull();
    });

    it('removes a value when its tag is dismissed', () => {
      const s = makeSelect([['a', 'Alpha'], ['b', 'Beta']], { multiple: '' });
      s.setValue(['a', 'b']);

      const remove = s.selectedContainer.querySelector(
        '.dl-muliselect-selected-remove',
      ) as HTMLElement;
      remove.click();

      expect(s.getValue()).toEqual(['b']);
      expect(s.selectedContainer.querySelectorAll('.multiselect-tag')).toHaveLength(1);
    });

    it('marks chosen options selected and ignores a repeat selection', () => {
      const s = makeSelect([['a', 'Alpha']], { multiple: '' });
      s.setValue(['a']);
      s.setValue(['a']);

      expect(s.getValue()).toEqual(['a']);
      expect(s.options[0]?.getAttribute('selected')).toBe('true');
    });
  });

  describe('options management', () => {
    it('reports having no options with a class', () => {
      const empty = makeSelect([]);
      expect(empty.classList.contains('dl-select-no-options-available')).toBe(true);
      expect(empty.inputField.placeholder).toBe('No Options Available');
    });

    it('clears the flag once options are added', () => {
      const empty = makeSelect([]);
      const option = document.createElement('dl-option') as DlOption;
      option.textContent = 'One';
      empty.addOption(option);

      expect(empty.classList.contains('dl-select-no-options-available')).toBe(false);
      expect(empty.options).toHaveLength(1);
    });

    it('removes every option', () => {
      select.removeAllOptions();
      expect(select.options).toHaveLength(0);
      expect(select.classList.contains('dl-select-no-options-available')).toBe(true);
    });

    it('uses the placeholder attribute when nothing is selected', () => {
      const s = makeSelect(['a'], { placeholder: 'Pick one' });
      expect(s.inputField.placeholder).toBe('Pick one');
    });
  });

  describe('loading state', () => {
    it('does not show the skeleton for a load that finishes quickly', async () => {
      select.setLoadingStatus();
      select.unsetLoadingStatus();
      await new Promise((r) => setTimeout(r, 150));

      expect(select.classList.contains('dl-select-loading')).toBe(false);
      expect(select.isLoading).toBe(false);
    });

    it('tolerates being called twice, as structured-text-editor does', () => {
      expect(() => {
        select.setLoadingStatus();
        select.setLoadingStatus();
        select.unsetLoadingStatus();
      }).not.toThrow();
    });

    it('replays a value that was set while loading', async () => {
      select.setLoadingStatus();
      select.setValue('Python');
      expect(select.getValue()).toBeUndefined();

      select.unsetLoadingStatus();
      await new Promise((r) => setTimeout(r, 0));
      expect(select.getValue()).toBe('Python');
    });
  });

  it('injects its stylesheet once, lazily', () => {
    makeSelect(['a']);
    makeSelect(['b']);
    expect(document.querySelectorAll('style[data-declarative-forms]')).toHaveLength(1);
  });
});

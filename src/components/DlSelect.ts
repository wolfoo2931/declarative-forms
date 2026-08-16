import { findByAttribute } from '../util/dom.js';
import { asText } from '../util/value.js';
import { injectStyles } from './styles.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ARROW_PATH =
  'M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 ' +
  '1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 ' +
  '4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-' +
  '4.695-4.502s-0.436-1.17 0-1.615z';

/** Minimum time the loading skeleton stays up, so it does not flash. */
const MIN_LOADING_MS = 1500;
/** Delay before the skeleton appears, so fast loads never show it at all. */
const LOADING_DELAY_MS = 100;

/**
 * Base class for the custom elements.
 *
 * `class X extends HTMLElement` is evaluated as soon as the module loads, which
 * throws outright in Node — breaking any server-rendered or prerendered app
 * that so much as imports the package. Falling back to an empty class keeps the
 * module importable; the stand-in is never instantiated, because custom
 * elements are only registered when `customElements` exists.
 */
const CustomElementBase: typeof HTMLElement =
  typeof HTMLElement === 'undefined'
    ? (class {} as unknown as typeof HTMLElement)
    : HTMLElement;

/**
 * An option inside a {@link DlSelect}.
 *
 * v1 never registered this element, leaving it an `HTMLUnknownElement`.
 * Registering it gives it a stable prototype and somewhere to hang the option
 * semantics the accessibility work needs.
 */
export class DlOption extends CustomElementBase {
  /** The value this option contributes, falling back to its text. */
  get optionValue(): string {
    return this.getAttribute('value') ?? this.innerText;
  }

  /** Text shown once selected, which may differ from the option's own label. */
  get displayText(): string {
    return this.getAttribute('displayWhenSelected') ?? this.innerText;
  }
}

/**
 * A filterable combobox that supports async options and multi-select.
 *
 * Deliberately light-DOM: consumers style its internals (`.input-wrapper`,
 * `.options-wrapper`, `dl-option`) and the options popup is reparented to
 * `document.body` while open so it can escape a scrolling container.
 */
export class DlSelect extends CustomElementBase {
  readonly optionsWrapper: HTMLDivElement;
  readonly inputWrapper: HTMLSpanElement;
  readonly noMatchesHint: HTMLSpanElement;
  readonly selectedContainer: HTMLSpanElement;
  readonly inputField: HTMLInputElement;
  readonly arrow: SVGSVGElement;

  multiple = false;
  isLoading = false;

  private initialized = false;
  private loadingTimeouts: ReturnType<typeof setTimeout>[] = [];
  private loadingStartedAt: number | undefined;
  private pendingValue: unknown;
  private selectedOption: DlOption | undefined;
  private focusedOption: DlOption | undefined;
  private repositionListener: (() => void) | undefined;
  private scrollTargets: EventTarget[] = [];

  constructor() {
    super();
    this.optionsWrapper = document.createElement('div');
    this.inputWrapper = document.createElement('span');
    this.noMatchesHint = document.createElement('span');
    this.selectedContainer = document.createElement('span');
    this.inputField = document.createElement('input');
    this.arrow = document.createElementNS(SVG_NS, 'svg');
  }

  connectedCallback(): void {
    if (this.initialized) return;
    this.initialized = true;

    injectStyles();

    this.inputWrapper.classList.add('input-wrapper');
    this.optionsWrapper.classList.add('options-wrapper');
    this.optionsWrapper.setAttribute(
      'data-for-dl-select',
      this.getAttribute('name') ?? '',
    );
    this.selectedContainer.classList.add('selected-container');
    this.optionsWrapper.style.display = 'none';

    this.noMatchesHint.classList.add('noMatchesHint');
    this.noMatchesHint.textContent = 'No Matches';
    this.noMatchesHint.style.display = 'none';
    this.optionsWrapper.appendChild(this.noMatchesHint);

    this.multiple = this.getAttribute('multiple') !== null;
    this.inputField.placeholder = this.getAttribute('placeholder') ?? 'Select ...';
    this.inputField.onfocus = () => this.open();
    this.inputField.onblur = () => this.close();
    this.inputField.oninput = () => this.filterOptions(this.inputField.value);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ARROW_PATH);
    this.arrow.appendChild(path);
    this.arrow.onclick = () => this.inputField.focus();

    this.classList.add('dl-select-no-options-available');
    this.addEventListener('keydown', this.onKeyDown);

    this.mount();
  }

  disconnectedCallback(): void {
    this.detachRepositionListeners();
    for (const timeout of this.loadingTimeouts) clearTimeout(timeout);
    this.loadingTimeouts = [];
  }

  /** Move any author-provided `<dl-option>` children into the popup. */
  private mount(): void {
    while (this.firstElementChild) {
      this.adoptOption(this.firstElementChild as DlOption);
    }

    this.inputWrapper.appendChild(this.selectedContainer);
    this.inputWrapper.appendChild(this.inputField);
    this.inputWrapper.appendChild(this.arrow);
    this.appendChild(this.inputWrapper);
    this.appendChild(this.optionsWrapper);

    this.setValue(this.getValue());
    this.updatePlaceholder();
  }

  private adoptOption(option: DlOption): void {
    option.onmousedown = () => this.selectOption(option);
    option.onmouseover = () => this.clearFocusedOption();
    this.optionsWrapper.appendChild(option);
  }

  addOption(option: DlOption | HTMLElement): void {
    this.adoptOption(option as DlOption);
    this.classList.remove('dl-select-no-options-available');
    this.updatePlaceholder();
  }

  removeAllOptions(): void {
    this.classList.add('dl-select-no-options-available');
    for (const option of this.optionsWrapper.querySelectorAll('dl-option')) {
      option.remove();
    }
    this.selectedOption = undefined;
    this.updatePlaceholder();
  }

  /** All options currently in the popup. */
  get options(): DlOption[] {
    return [...this.optionsWrapper.querySelectorAll('dl-option')] as DlOption[];
  }

  // ---------------------------------------------------------------- loading

  /**
   * Enter the loading state.
   *
   * The skeleton only appears after a short delay, so options that resolve
   * quickly never flash one. Repeated calls are safe.
   */
  setLoadingStatus(): void {
    this.isLoading = true;
    this.loadingTimeouts.push(
      setTimeout(() => {
        this.classList.add('dl-select-loading');
        this.optionsWrapper.remove();
        this.loadingStartedAt = Date.now();
      }, LOADING_DELAY_MS),
    );
  }

  unsetLoadingStatus(): void {
    for (const timeout of this.loadingTimeouts) clearTimeout(timeout);
    this.loadingTimeouts = [];

    const elapsed = this.loadingStartedAt ? Date.now() - this.loadingStartedAt : 0;
    const delay = this.loadingStartedAt ? Math.max(0, MIN_LOADING_MS - elapsed) : 0;

    const finish = (): void => {
      this.appendChild(this.optionsWrapper);
      this.classList.remove('dl-select-loading');
      this.isLoading = false;
      this.loadingStartedAt = undefined;

      if (this.pendingValue !== undefined) {
        const value = this.pendingValue;
        this.pendingValue = undefined;
        this.setValue(value);
      }
    };

    if (delay === 0) finish();
    else this.loadingTimeouts.push(setTimeout(finish, delay));
  }

  // ------------------------------------------------------------ value access

  getValue(): string | string[] | undefined {
    const raw = this.getAttribute('value');

    if (raw) {
      if (!this.multiple) return raw;
      try {
        return JSON.parse(raw) as string[];
      } catch {
        return undefined;
      }
    }

    // Fall back to a value set before the matching option existed.
    const pending = this.getAttribute('tmp-value');
    if (!pending) return undefined;

    if (this.multiple) {
      try {
        return (JSON.parse(pending) as string[]).filter((v) => this.findOption(v));
      } catch {
        return undefined;
      }
    }

    return this.findOption(pending) ? pending : undefined;
  }

  setValue(value: unknown): void {
    if (value === undefined || value === null || value === '') return;

    // Options are not in the DOM while loading; replay once they arrive.
    if (this.isLoading) {
      this.pendingValue = value;
      return;
    }

    if (this.multiple) {
      const next = (Array.isArray(value) ? value : [value]).map(asText);
      for (const current of (this.getValue() as string[] | undefined) ?? []) {
        const option = this.findOption(current);
        if (option) this.deselectOption(option);
      }
      for (const entry of next) {
        const option = this.findOption(entry);
        if (option) this.selectOption(option);
      }
      return;
    }

    const single = asText(value);
    this.setAttribute('tmp-value', single);
    const option = this.findOption(single);
    if (option) this.selectOption(option);
  }

  /**
   * Find an option by its `value` attribute, falling back to its text.
   *
   * v1 concatenated the value straight into an attribute selector, which threw
   * on any value containing a quote or a backslash.
   */
  private findOption(value: string): DlOption | undefined {
    return (
      this.options.find((option) => option.getAttribute('value') === value) ??
      this.options.find((option) => option.innerText === value)
    );
  }

  // ------------------------------------------------------------- selection

  private selectOption(option: DlOption | undefined): void {
    if (!option) return;

    const value = option.optionValue;

    if (this.multiple) {
      const current = (this.getValue() as string[] | undefined) ?? [];
      if (current.includes(value)) return;

      this.selectedContainer.appendChild(this.createTag(option));
      this.markSelected(option, true);
      this.setAttribute('value', JSON.stringify([...current, value]));
    } else {
      this.selectedOption = option;
      this.inputField.value = option.displayText;
      this.setAttribute('value', value);
    }

    this.emitChange();
  }

  private deselectOption(option: DlOption): void {
    const value = option.optionValue;
    const current = (this.getValue() as string[] | undefined) ?? [];

    this.tagFor(value)?.remove();
    this.markSelected(option, false);
    this.setAttribute('value', JSON.stringify(current.filter((v) => v !== value)));

    this.emitChange();
  }

  /** Mark every option carrying this value, since duplicates are allowed. */
  private markSelected(option: DlOption, selected: boolean): void {
    const attribute = option.getAttribute('value');
    const matches = attribute
      ? findByAttribute(this, 'dl-option', 'value', attribute)
      : [option];

    for (const match of matches) match.setAttribute('selected', String(selected));
  }

  private createTag(option: DlOption): HTMLElement {
    const tag = document.createElement('span');
    tag.classList.add('multiselect-tag');
    tag.dataset['value'] = option.optionValue;
    tag.innerText = option.displayText;

    // Class names carry v1's "muliselect" typo: consumers style them.
    const removeContainer = document.createElement('span');
    removeContainer.classList.add('dl-muliselect-selected-remove-container');

    const remove = document.createElement('span');
    remove.classList.add('dl-muliselect-selected-remove');
    remove.onclick = () => this.deselectOption(option);

    removeContainer.appendChild(remove);
    tag.appendChild(removeContainer);
    return tag;
  }

  private tagFor(value: string): HTMLElement | undefined {
    return findByAttribute<HTMLElement>(
      this.selectedContainer,
      '.multiselect-tag',
      'data-value',
      value,
    )[0];
  }

  private emitChange(): void {
    this.dispatchEvent(new CustomEvent('change', { bubbles: false, cancelable: true }));
  }

  // -------------------------------------------------------------- filtering

  filterOptions(query: string): void {
    const terms = query.toLowerCase().split(' ').filter(Boolean);
    let matched = false;

    for (const option of this.options) {
      const text = option.innerText.toLowerCase();
      const visible = terms.length === 0 || terms.every((term) => text.includes(term));
      option.style.display = visible ? 'block' : 'none';
      matched ||= visible;
    }

    this.noMatchesHint.style.display = matched ? 'none' : 'block';
  }

  private visibleOptions(): DlOption[] {
    return this.options.filter((option) => option.style.display !== 'none');
  }

  private clearFocusedOption(): void {
    this.focusedOption = undefined;
    for (const option of this.options) option.classList.remove('dl-focused');
  }

  private focusOption(option: DlOption | undefined): void {
    this.clearFocusedOption();
    if (!option) return;
    this.focusedOption = option;
    option.classList.add('dl-focused');
    option.scrollIntoView?.({ block: 'nearest' });
  }

  private step(delta: 1 | -1): void {
    const visible = this.visibleOptions();
    if (visible.length === 0) return;

    const current = this.focusedOption ? visible.indexOf(this.focusedOption) : -1;
    const next = current < 0 ? (delta === 1 ? 0 : visible.length - 1) : current + delta;

    if (next < 0 || next >= visible.length) return;
    this.focusOption(visible[next]);
  }

  private readonly onKeyDown = (event: Event): void => {
    const key = (event as KeyboardEvent).key;

    if (key === 'ArrowDown') this.step(1);
    else if (key === 'ArrowUp') this.step(-1);
    else if (key === 'Enter') {
      this.selectOption(this.focusedOption);
      this.close();
    } else return;

    event.preventDefault();
    event.stopPropagation();
  };

  // ------------------------------------------------------------ open / close

  private get placeholderText(): string {
    if (this.options.length === 0) return 'No Options Available';
    if (this.selectedOption) return this.selectedOption.innerText;
    return this.getAttribute('placeholder') ?? 'Select ...';
  }

  private updatePlaceholder(): void {
    this.inputField.placeholder = this.placeholderText;
  }

  /** Open the popup. Named `open` because `focus()` is `HTMLElement`'s. */
  open(): void {
    this.classList.add('dl-focused');
    this.updatePlaceholder();
    this.inputField.value = '';
    this.optionsWrapper.style.display = 'inline-block';
    this.filterOptions('');

    // Reparented to the body so a scrolling ancestor cannot clip the popup.
    document.body.appendChild(this.optionsWrapper);
    this.reposition();
    this.attachRepositionListeners();
  }

  close(): void {
    this.classList.remove('dl-focused');
    this.optionsWrapper.style.display = 'none';
    this.inputField.value = this.selectedOption?.displayText ?? '';
    this.inputField.blur();
    this.clearFocusedOption();
    this.appendChild(this.optionsWrapper);
    this.detachRepositionListeners();
  }

  private reposition(): void {
    const anchor = this.inputWrapper.getBoundingClientRect();
    const style = this.optionsWrapper.style;
    style.position = 'absolute';
    style.top = `${anchor.bottom + window.scrollY + 2}px`;
    style.left = `${anchor.left + window.scrollX}px`;
    style.width = `${anchor.width}px`;
  }

  private attachRepositionListeners(): void {
    const listener = (): void => this.reposition();
    this.repositionListener = listener;
    this.scrollTargets = [];

    for (let el: Element | null = this.inputWrapper; el; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight) {
        el.addEventListener('scroll', listener);
        this.scrollTargets.push(el);
      }
    }

    document.addEventListener('scroll', listener);
    window.addEventListener('resize', listener);
    this.scrollTargets.push(document, window);
  }

  private detachRepositionListeners(): void {
    const listener = this.repositionListener;
    if (!listener) return;

    for (const target of this.scrollTargets) {
      target.removeEventListener('scroll', listener);
      target.removeEventListener('resize', listener);
    }

    this.scrollTargets = [];
    this.repositionListener = undefined;
  }
}

/**
 * Register `<dl-select>` and `<dl-option>`.
 *
 * Idempotent, and a no-op outside a browser. Called automatically whenever a
 * form builds a select field.
 */
export function defineDlSelect(): void {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get('dl-option')) customElements.define('dl-option', DlOption);
  if (!customElements.get('dl-select')) customElements.define('dl-select', DlSelect);
}

declare global {
  interface HTMLElementTagNameMap {
    'dl-select': DlSelect;
    'dl-option': DlOption;
  }
}

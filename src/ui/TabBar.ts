import { createEl, tabClassName } from '../util/dom.js';

/**
 * The dialog's tab strip.
 *
 * v1 resolved tabs with `document.querySelector('.dl-tab-btn.active')`, so two
 * open forms fought over each other's active tab. This owns its buttons and
 * never queries the document.
 *
 * The rendered shape is part of the frozen contract: `.dl-tab-btn` elements are
 * direct, clickable siblings inside `.tabWrapper`, each carrying the tab label
 * with whitespace stripped as a class (`'Find Citation'` → `.FindCitation`), and
 * a `seen` class once visited.
 */
export class TabBar {
  readonly element: HTMLElement;

  private buttons = new Map<string, HTMLElement>();
  private seen = new Set<string>();
  private active: string | undefined;

  constructor(private readonly onSelect: (tab: string) => void) {
    this.element = createEl('div', { classNames: ['tabWrapper'] });
  }

  get activeTab(): string | undefined {
    return this.active;
  }

  /** Rebuild the strip from the tabs that currently have at least one visible field. */
  render(tabs: readonly string[]): void {
    this.element.replaceChildren();
    this.buttons = new Map();

    for (const tab of tabs) {
      const button = createEl('div', {
        classNames: ['dl-tab-btn', tabClassName(tab), this.seen.has(tab) && 'seen'],
        content: tab,
      });

      button.onclick = () => this.onSelect(tab);

      this.buttons.set(tab, button);
      this.element.appendChild(button);
    }

    // Keep the current tab if it survived the rebuild, otherwise fall back.
    const next = this.active && this.buttons.has(this.active) ? this.active : tabs[0];
    if (next) this.select(next);
    else this.active = undefined;
  }

  /**
   * Mark a tab active.
   *
   * Selecting a tab that is not currently rendered is a no-op rather than an
   * error — a tab can disappear when the fields in it all become inactive.
   */
  select(tab: string): boolean {
    const button = this.buttons.get(tab);
    if (!button) return false;

    for (const other of this.buttons.values()) other.classList.remove('active');

    button.classList.add('active');
    button.classList.add('seen');
    this.seen.add(tab);
    this.active = tab;

    return true;
  }

  get tabs(): string[] {
    return [...this.buttons.keys()];
  }

  get isEmpty(): boolean {
    return this.buttons.size === 0;
  }
}

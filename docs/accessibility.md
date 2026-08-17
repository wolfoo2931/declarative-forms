# Accessibility

**Current status: partial.** Some real problems were fixed in v2; several
significant gaps remain. This page is deliberately explicit about both, so you
can judge whether the library is suitable for your context rather than
discovering the gaps later.

If you need WCAG conformance today, treat the "Known gaps" section as a
blocker list.

## Fixed in v2

### Labels actually work

In v1, `<label for>` pointed at the field's _name_, while the control was only
ever given a `name` attribute — never a matching `id`. **No field in the
library was ever labelled** for assistive technology.

v2 gives each control a real `id` and points the label at it:

```html
<label for="dlf1-control-title">Title</label>
<input name="title" id="dlf1-control-title" />
```

Checkbox and file fields point the label at the actual input rather than the
wrapper element.

### Ids no longer collide

v1 numbered checkboxes `field-0`, `field-1` from a module-global counter, so two
forms on a page — and _always_ a parent form and its array sub-form — produced
duplicate ids, silently breaking label association.

v2 scopes ids per form (`dlf1-…`, `dlf2-…`), so they cannot collide.

### Buttons are buttons

Dialog buttons were `<div class="btn">` with a click handler: not focusable, not
keyboard-operable, not announced as controls. They are now
`<button type="button">`, keeping the `.btn` class so styling is unaffected.

The same applies to array Edit/Remove/Add buttons and the file-preview remove
button, which also gained an `aria-label`.

### Tooltips respond to focus

The default tooltip provider shows on `focus` as well as `mouseenter`, so
tooltip content is reachable without a pointer. The bubble carries
`role="tooltip"`.

### Keyboard navigation in the combobox

<kbd>↑</kbd> / <kbd>↓</kbd> / <kbd>Enter</kbd> work in `<dl-select>`, filtering
as you type, with focus following the highlighted option.

### Keyboard-reachable checkboxes

Only under the **default** stylesheet, and the reason it became the default.

The classic stylesheet hides `.dl-form form .check input` with
`visibility: hidden` and paints the visible box with an
`input[type=checkbox]:before` pseudo-element that re-asserts
`visibility: visible`. A hidden input is removed from **both** the tab order and
the accessibility tree: clicking the label works, but the field cannot be
reached or toggled by keyboard, and a screen reader will not announce it.

`declarative-forms/styles.css` styles the input directly with
`appearance: none`, so the checkbox is a real focusable control. If you are
[staying on the classic look](/guide/theme#staying-on-the-classic-look) this gap
still applies; for a keyboard-critical yes/no there, use a two-option
[`select`](/guide/fields/select) or [`cards`](/guide/fields/cards).

## Known gaps

These are **not fixed**. They are scheduled as a dedicated accessibility
milestone.

### Dialogs lack dialog semantics

`ModalView` renders plain `<div>`s. Missing:

- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` pointing at a title
- a focus trap — focus can leave the dialog into the page behind it
- focus restoration to the triggering element on close
- inert/`aria-hidden` treatment of the covered content when dialogs stack

Escape-to-dismiss **does** work, on the topmost dialog.

### Tabs lack tab semantics

The tab strip is `<div>`s with click handlers. Missing: `role="tablist"`,
`role="tab"`, `role="tabpanel"`, `aria-selected`, roving tabindex, and
arrow-key navigation. Tabs are currently mouse-only.

### The combobox lacks ARIA

`<dl-select>` has no `role="combobox"`, `aria-expanded`, `aria-controls` or
`aria-activedescendant`, and `<dl-option>` has no `role="option"` or
`aria-selected`. Keyboard operation works; a screen reader will not describe
what is happening.

The popup being [reparented to `document.body`](/reference/dl-select#the-popup-is-reparented)
makes this more important, not less — without `aria-controls` there is nothing
tying the popup back to its input.

### Multi-select tag removal

The ✕ on a multi-select tag is a bare `<span>` with an `onclick`: not focusable,
no accessible name.

### No validation semantics

There is no `aria-invalid`, no error-message association, and no live region.
Tooltip state changes (`setTooltipError`) are visual only and are not announced,
so a screen-reader user gets no notice that a field they just left is in an
error state. This is the main accessibility caveat on
[Validation](/guide/validation).

### Unaudited

- Colour contrast of neither stylesheet has been formally checked.
- No `prefers-reduced-motion` handling for the loading shimmer or spinner. The
  dialog animations of the default stylesheet do respect it.
- No automated axe run in CI yet.

## What the milestone will do

1. `ModalView`: dialog role, `aria-modal`, focus trap, focus restore,
   `aria-labelledby`.
2. `TabBar`: full tablist semantics, roving tabindex, arrow keys.
3. `DlSelect` / `DlOption`: combobox and option roles plus the ARIA state
   attributes.
4. Tooltip trigger as a focusable `<button>` with `aria-describedby`;
   `aria-invalid` and a live region for messages.
5. Automated axe checks in the Playwright suite, plus keyboard-only
   walkthroughs.

All of this is **additive** — adding attributes does not break the
[DOM contract](/dom-contract), which is why the v2 architecture was arranged to
make it a wiring job rather than another rewrite. The one item that genuinely
touched frozen CSS, the checkbox, is why the modern stylesheet exists at all.

## Reporting

If you hit an accessibility problem not listed here, please
[open an issue](https://github.com/wolfoo2931/declarative-forms/issues) — gaps
we know about are tracked, and ones we do not are more valuable to hear about.

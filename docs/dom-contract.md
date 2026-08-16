# DOM contract

The **rendered DOM is part of the public API.** Class names, element structure,
id conventions and sibling ordering are all stable and will not change without a
major version.

This is unusual for a form library, and deliberate. v2 rewrote the entire
authoring API but kept the output byte-compatible, because real consumers style
these class names, select on these ids, and navigate the tab strip by DOM
position. Freezing the output is what let the JavaScript API be redesigned
freely.

::: tip Enforced by tests
`test/domContract.test.ts` asserts everything on this page. **A failure there is
a contract change, not a test to update.**
:::

## Form scaffolding

```html
<div class="dl-form">
  <form autocomplete="off">
    <div class="dl-form-field-wrapper" id="dl-form-field-wrapper-for-title">
      <label for="…">Title</label>
      <input name="title" id="…" />
    </div>
  </form>
</div>
```

- Every field wrapper carries **`#dl-form-field-wrapper-for-<name>`** and
  `.dl-form-field-wrapper`.
- Fields appear in **declaration order**.
- The control carries both the `name` **property** and the `name`
  **attribute**, so `[name=…]` selectors work.
- Labels are genuinely associated: `for` points at the control's real `id`.

### Wrapper state classes

| Class                  | Meaning                                              |
| ---------------------- | ---------------------------------------------------- |
| `inactive`             | Hidden by `isActive`; also absent from `getValues()` |
| `notInTab`             | Not in the active tab                                |
| `withoutLabel`         | No `displayName` was given                           |
| `dl-form-hidden-field` | The control is `type="hidden"` (computed fields)     |
| `dl-select-wrapper`    | Contains a combobox                                  |
| _tab name_             | A statically declared tab, whitespace stripped       |

A statically declared `tab: 'Reference Sources'` adds `.ReferenceSources`.
Computed tabs cannot contribute a class, since it is stamped at construction.

## Control element per kind

| Kind               | Element       | Class              |
| ------------------ | ------------- | ------------------ |
| `text`, `computed` | `<input>`     | —                  |
| `textarea`         | `<textarea>`  | —                  |
| `select`           | `<dl-select>` | —                  |
| `checkbox`         | `<span>`      | `check`            |
| `message`          | `<p>`         | `message`          |
| `file`             | `<div>`       | `file-field`       |
| `cards`            | `<div>`       | `detailed-options` |
| `custom`           | `<p>`         | `render`           |
| `array`            | `<div>`       | `array-of`         |

## Modal chrome

```html
<div class="dl-modal">
  <div class="modal">
    <div class="up-bar"><button class="cancelBtn secondary"></button></div>
    <div class="tabWrapper">…</div>
    <div class="modal-content">…the .dl-form…</div>
    <div class="low-bar">…buttons…</div>
  </div>
</div>
```

Those four children are always present, in that order.

::: warning The `up-bar` quirk
The first child element always exists, but only carries the `up-bar` class when
the dialog is **dismissable** (has an `onCancel`). Consumer CSS relies on this
to reserve — or not reserve — the header strip.
:::

Other wrapper classes: `noModalDialog` when embedded, `dl-modal-hidden` when
covered by another dialog, `dl-modal-stacked` when opened on top of another one,
and `dl-modal-restored` once revealed again after being covered. The last two
exist so a theme can suppress the backdrop's entrance animation when the
backdrop is already on screen. `openInModal()` returns this outer `div.dl-modal`
element.

## Tab strip

```html
<div class="tabWrapper">
  <div class="dl-tab-btn FindCitation active seen">Find Citation</div>
  <div class="dl-tab-btn AddCitation">Add Citation</div>
</div>
```

- Tab buttons are **direct, clickable siblings** inside `.tabWrapper`. Wizard
  code that walks `nextSibling` / `previousSibling` depends on this.
- Each carries its label with whitespace stripped as a class
  (`'Find Citation'` → `.FindCitation`).
- The current tab has `.active`; any visited tab keeps `.seen`.

## Buttons

Buttons are `<button type="button">` carrying `.btn`. In v1 they were
`<div class="btn">`; the class is unchanged so existing CSS matches, and the
shipped stylesheet normalises `font-size`, `line-height` and background so the
rendering is identical.

State classes: `.disabled`, `.invisible`, `.loading-btn`. Style hook:
`.secondary`. The dismiss control is `.cancelBtn`.

## `<dl-select>`

```html
<dl-select name="template" value="a">
  <span class="input-wrapper">…</span>
  <div class="options-wrapper" data-for-dl-select="template">
    <dl-option value="a">Alpha</dl-option>
  </div>
</dl-select>
```

- `dl-select[name=…]` and `dl-option[value=…]` are stable selectors.
- The popup carries `data-for-dl-select="<field name>"`.
- **The popup is reparented to `document.body` while open**, so options leave
  the `<dl-select>` subtree. This is required so a scrolling ancestor cannot
  clip them — and it is why scoped `--dl-options-*` tokens must also be
  declared on `dl-option`.

## Arrays

```html
<div class="array-of">
  <div class="dl-form-array-suggested-container">
    <span class="check dl-form-array-of-suggestion" value="false">
      <input type="checkbox" id="…" /><label for="…">Ada, Lovelace</label>
    </span>
  </div>
  <div class="dl-form-array-of-entry" data-el-index="0">
    <span>Grace, Hopper</span>
    <button type="button" class="edit-array-of-btn" data-el-index="0">Edit</button>
    <button type="button" class="delete-array-of-btn" data-el-index="0">Remove</button>
  </div>
  <button type="button" class="dl-form-array-of-add-entry">Add</button>
</div>
```

Each entry dialog's `<form>` also carries `form-for-array-of-<field name>`.

## Tooltips

```html
<span class="dl-tooltip" data-tippy-content="Where from?" data-initial-tippy-content="…"
  >?</span
>
```

The `data-tippy-content` attribute name is retained from the v1 tippy.js
integration and is now simply the content store. State classes:
`.tooltip-success`, `.tooltip-warning`, `.tooltip-error`, `.tooltip-loading`,
plus `.dl-tooltip-in-input` when positioned inside the input (which also adds
`.dl-tooltip-inside` to the control).

The bubble rendered by the default provider is `.dl-tooltip-bubble`.

## Retained typos

These class names are misspelled. They are **frozen** because consumers style
them:

| Class                                     | Correct spelling would be |
| ----------------------------------------- | ------------------------- |
| `dl-muliselect-selected-remove`           | `multiselect`             |
| `dl-muliselect-selected-remove-container` | `multiselect`             |

## Values

`getValues()` always includes an **`activeTab`** key, holding the current tab or
`undefined`.

## What is _not_ frozen

- The internal class structure and module layout of the TypeScript source.
- The `--dl-*` token set, which may **gain** tokens in minor versions.
- Anything under `src/` not re-exported from the package entry point.
- Additive ARIA attributes, which the
  [accessibility work](/accessibility) will introduce. Adding attributes does
  not break selectors.

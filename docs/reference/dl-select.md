# `<dl-select>`

The combobox behind the [`select`](/guide/fields/select) field kind: a
filterable, optionally multi-select dropdown that supports asynchronously
loaded options. It exists because a native `<select>` does none of that.

Most of the time you never touch it directly — you declare a `select` field and
the library builds it. This page is for the cases where you do.

## Standalone use

Register the elements, then use them as markup:

```ts
import { defineDlSelect } from 'declarative-forms';

defineDlSelect();
```

```html
<dl-select name="language">
  <dl-option value="en">English</dl-option>
  <dl-option value="de">German</dl-option>
</dl-select>
```

`defineDlSelect()` is idempotent and a no-op outside a browser. A `select`
field calls it for you.

## Attributes

| Attribute     | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `name`        | Field name. Also mirrored onto the popup as `data-for-dl-select` |
| `multiple`    | Presence enables multi-select; the value becomes a JSON array    |
| `placeholder` | Input placeholder when nothing is selected                       |
| `value`       | Current value. A JSON array when `multiple`                      |
| `tmp-value`   | A value set before its option existed, replayed once it does     |

On `<dl-option>`:

| Attribute             | Meaning                                                |
| --------------------- | ------------------------------------------------------ |
| `value`               | The value contributed. Falls back to the option's text |
| `displayWhenSelected` | Text shown once selected, instead of the label         |
| `selected`            | Set by the component on chosen options                 |

## Methods

```ts
const select = document.querySelector('dl-select[name=language]');

select.getValue(); // string | string[] | undefined
select.setValue('de');
select.addOption(optionEl);
select.removeAllOptions();
select.setLoadingStatus();
select.unsetLoadingStatus();
select.filterOptions('ger');
select.open();
select.close();
select.options; // DlOption[]
```

::: tip Prefer the field handle
From a form, use `form.field('language')` — `setValue`, `getValue`,
`setLoading` and `focus` are all there, and the handle survives internal
changes. See [the API reference](/reference/api#field-name-fieldhandle-undefined).
:::

## Events

Fires a `change` event on selection and deselection:

```ts
select.addEventListener('change', () => console.log(select.getValue()));
```

## Loading state

```ts
select.setLoadingStatus();
// … fetch …
select.unsetLoadingStatus();
```

Two timing details keep it from flickering:

- The skeleton appears only after **~100 ms**, so fast loads never show one.
- Once shown, it stays for a **minimum of 1.5 s** rather than blinking out.

A value set while loading is stored and replayed when loading ends, so a
default never races the fetch. Repeated `setLoadingStatus()` calls are safe.

## Filtering

Typing filters options by substring, case-insensitively, requiring **every
space-separated term** to match. When nothing matches, a "No Matches" hint is
shown.

Keyboard: <kbd>↓</kbd> / <kbd>↑</kbd> move through _visible_ options,
<kbd>Enter</kbd> selects and closes. Navigation stops at the ends rather than
wrapping.

## The popup is reparented

While open, the options wrapper is moved to `document.body` and positioned
absolutely, so a scrolling or clipping ancestor cannot cut it off. It is
repositioned on scroll and resize, and returned to the component on close.

::: warning Consequence for theming
Options are outside the `<dl-select>` subtree while open. If you scope
`--dl-options-*` tokens to anything narrower than `:root`, declare them on
`dl-option` too. See [Theming](/guide/theming).
:::

## Styling

Structural CSS is injected once, lazily, the first time a combobox connects —
the component does not work without it. It reads the same
[`--dl-*` tokens](/guide/theming#combobox) as the main stylesheet.

Internal hooks: `.input-wrapper`, `.options-wrapper`, `.selected-container`,
`.noMatchesHint`, `.multiselect-tag`, `.dl-muliselect-selected-remove`,
`.dl-option-tag`. State classes: `.dl-focused`, `.dl-select-loading`,
`.dl-select-no-options-available`.

To inject the styles yourself — server-rendered pages, say:

```ts
import { injectStyles, DL_SELECT_STYLES } from 'declarative-forms';

injectStyles(); // once per document, safe to repeat
DL_SELECT_STYLES; // the raw CSS string
```

## Accessibility

The combobox currently lacks `role="combobox"`, `aria-expanded`,
`aria-controls` and `aria-activedescendant`, and `<dl-option>` has no
`role="option"`. Keyboard navigation works; screen-reader semantics do not yet.
See [Accessibility](/accessibility).

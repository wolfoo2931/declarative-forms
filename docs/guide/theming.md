# Theming

```ts
import 'declarative-forms/styles.css';
```

The stylesheet is built on a `--dl-*` custom-property layer. Retheme by setting
tokens rather than overriding rules.

## Setting tokens

Tokens are declared at **zero specificity** via `:where(:root)`, so anything you
write wins — no `!important` needed:

```css
:root {
  --dl-accent: #6d4aff;
  --dl-radius: 8px;
  --dl-font-family: 'Inter', system-ui, sans-serif;
}
```

Scope them to retheme one dialog:

```css
.myOverlay {
  --dl-accent: #c0392b;
}
```

```ts
form.openInModal({ wrapperClassNames: ['myOverlay'] });
```

## The tokens

### Typography

| Token              | Default               |
| ------------------ | --------------------- |
| `--dl-font-family` | `'Rubik', sans-serif` |
| `--dl-font-size`   | `0.9em`               |

### Palette

| Token                     | Default           | Used for                                       |
| ------------------------- | ----------------- | ---------------------------------------------- |
| `--dl-accent`             | `#1ea6a3`         | Buttons, active tab, checked box, focused card |
| `--dl-accent-hover`       | `#22bb8b`         | Button hover border                            |
| `--dl-danger`             | `#fe070b`         | Remove buttons                                 |
| `--dl-surface`            | `#fff`            | Dialog background                              |
| `--dl-surface-muted`      | `#f8f8f8`         | Lower bar, cards, list rows                    |
| `--dl-surface-sunken`     | `#eee`            | Multi-select tags                              |
| `--dl-overlay`            | `rgba(0,0,0,0.6)` | Modal backdrop                                 |
| `--dl-text-color`         | `#545454`         | Body text                                      |
| `--dl-label-color`        | `#58565c`         | Field labels                                   |
| `--dl-line-color`         | `#ddd`            | Input borders                                  |
| `--dl-focused-line-color` | `#bbb`            | Focused input borders                          |
| `--dl-border-muted`       | `#e7e6e6`         | List row borders                               |

### Metrics

| Token                    | Default |
| ------------------------ | ------- |
| `--dl-radius`            | `4px`   |
| `--dl-field-width`       | `400px` |
| `--dl-modal-width`       | `416px` |
| `--dl-large-modal-width` | `800px` |

### Tooltips

| Token                                        | Default               |
| -------------------------------------------- | --------------------- |
| `--dl-tooltip-background`                    | `#e6e6e6`             |
| `--dl-tooltip-color`                         | `#88858e`             |
| `--dl-tooltip-bubble-background`             | `#413e48`             |
| `--dl-tooltip-bubble-color`                  | `#d1cfd8`             |
| `--dl-tooltip-success-background` / `-color` | `#d1e7dd` / `#12b568` |
| `--dl-tooltip-warning-background` / `-color` | `#ffecb5` / `#664d03` |
| `--dl-tooltip-error-background` / `-color`   | `#f8d7da` / `#842029` |

### Combobox

Read by both the stylesheet and the CSS `<dl-select>` injects itself:

| Token                                                       | Default                   |
| ----------------------------------------------------------- | ------------------------- |
| `--dl-options-background`                                   | follows `--dl-surface`    |
| `--dl-options-text-color`                                   | follows `--dl-text-color` |
| `--dl-options-inactive-text-color`                          | follows `--dl-text-color` |
| `--dl-options-option-hover-color`                           | `rgba(224,240,227,0.4)`   |
| `--dl-options-padding-top` / `-right` / `-bottom` / `-left` | `5px`                     |
| `--dl-select-input-width`                                   | `370px`                   |
| `--dl-drop-down-icon-margin-top`                            | `5px`                     |
| `--dl-select-loading-col1` / `-col2`                        | `#eee` / `#ddd`           |

## Dark mode

The stylesheet ships a `body.dark-theme` block that redefines the palette:

```html
<body class="dark-theme"></body>
```

To drive it from the OS preference instead, re-declare the same tokens:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --dl-surface: #282727;
    --dl-surface-muted: #322f2f;
    --dl-text-color: #d1cfd8;
    --dl-line-color: #4a4747;
    --dl-focused-line-color: #6d6a6a;
    --dl-border-muted: #e7e6e6;
    --dl-select-loading-col1: #282727;
    --dl-select-loading-col2: #505656;
  }
}
```

::: tip Also set the combobox tokens on `dl-option`
`<dl-select>` moves its options into a popup attached to `document.body` while
open, so they leave the subtree your tokens may be scoped to. If you scope
tokens to anything narrower than `:root`, declare the `--dl-options-*` ones on
`dl-option` as well. See the [DOM contract](/dom-contract#dl-select).
:::

## Where the combobox CSS lives

The form and modal chrome ship in `styles.css`. The **structural** styles for
`<dl-select>` — absolute positioning of the popup, show/hide — are injected from
JavaScript the first time a combobox connects, because the component does not
function without them. They read the same tokens, so theming is uniform.

That injection is lazy and happens once; importing the library on its own adds
nothing to the page.

## Going beyond tokens

Every class name is a documented, [frozen](/dom-contract) part of the API, so
targeted overrides are safe:

```css
.dl-modal .modal {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
.dl-form label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

Per-field hooks are available too: every wrapper carries
`#dl-form-field-wrapper-for-<name>`, and `className` on a descriptor adds your
own classes.

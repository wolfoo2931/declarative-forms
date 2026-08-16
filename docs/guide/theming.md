# Theming

```ts
import 'declarative-forms/styles.css';
```

::: tip Two stylesheets
The tokens below are the ones the **default** stylesheet declares, with its
values. The [classic stylesheet](#the-classic-stylesheet) reads the same core
tokens with the v1 values and a smaller set; both are listed here.
:::

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

If you add colours of your own, redeclare them under
`:root[data-dl-theme='dark']` as well — see [Themes](/guide/theme#customising).

## The tokens

### Typography

| Token               | Default         |
| ------------------- | --------------- |
| `--dl-font-family`  | system UI stack |
| `--dl-font-size`    | `0.9375rem`     |
| `--dl-font-size-sm` | `0.8125rem`     |
| `--dl-line-height`  | `1.5`           |

### Neutrals

| Token                 | Light     | Used for                                    |
| --------------------- | --------- | ------------------------------------------- |
| `--dl-surface`        | `#ffffff` | Dialog background                           |
| `--dl-surface-muted`  | `#f6f7f9` | Lower bar, cards, list rows                 |
| `--dl-surface-sunken` | `#eef0f4` | Multi-select pills                          |
| `--dl-surface-raised` | `#ffffff` | Inputs and popups, distinct from the dialog |
| `--dl-text-color`     | `#1b1f27` | Body text                                   |
| `--dl-label-color`    | `#39414f` | Field labels                                |
| `--dl-text-muted`     | `#6b7484` | Secondary text, placeholders, help          |
| `--dl-line-color`     | `#e0e4ea` | Input borders                               |
| `--dl-line-strong`    | `#cbd2dc` | Borders that need more presence             |

### Accent and danger

| Token                  | Light                   | Used for                                |
| ---------------------- | ----------------------- | --------------------------------------- |
| `--dl-accent`          | `#12968f`               | Filled buttons, active tab, checked box |
| `--dl-accent-hover`    | `#0e807a`               | Hover state of the above                |
| `--dl-accent-contrast` | `#ffffff`               | Text on a filled accent button          |
| `--dl-accent-soft`     | `rgba(18,150,143,0.1)`  | Tinted hover and selected states        |
| `--dl-accent-ring`     | `rgba(18,150,143,0.28)` | Focus-ring colour                       |
| `--dl-danger`          | `#d1394b`               | Remove buttons                          |
| `--dl-danger-soft`     | `rgba(209,57,75,0.1)`   | Their hover tint                        |

Every colour above is redefined for dark mode. See
[Themes](/guide/theme#switching-light-and-dark).

### Shape and elevation

| Token                                 | Default               |
| ------------------------------------- | --------------------- |
| `--dl-overlay`                        | `rgba(17,22,29,0.42)` |
| `--dl-overlay-blur`                   | `4px`                 |
| `--dl-radius-sm` / `--dl-radius`      | `6px` / `9px`         |
| `--dl-radius-lg` / `--dl-radius-pill` | `14px` / `999px`      |
| `--dl-shadow-sm`                      | Cards and inputs      |
| `--dl-shadow-modal`                   | The dialog            |
| `--dl-shadow-popup`                   | The combobox popup    |

### Metrics

| Token                                  | Default                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `--dl-gap`                             | `1.125rem` (vertical rhythm)                                                      |
| `--dl-field-width`                     | `100%` (fluid)                                                                    |
| `--dl-modal-width`                     | `30rem`                                                                           |
| `--dl-large-modal-width`               | `52rem`                                                                           |
| `--dl-modal-padding`                   | `1.5rem`                                                                          |
| `--dl-control-padding-y` / `-x`        | `0.55rem` / `0.75rem`                                                             |
| `--dl-stack-peek` / `--dl-stack-inset` | `8px` / `12px` — the card edges behind a [stacked](/guide/modals#stacking) dialog |
| `--dl-transition`                      | `140ms cubic-bezier(0.4,0,0.2,1)`                                                 |

### Tooltips

| Token                                        | Light                 |
| -------------------------------------------- | --------------------- |
| `--dl-tooltip-background`                    | `#eef0f4`             |
| `--dl-tooltip-color`                         | `#5b6473`             |
| `--dl-tooltip-bubble-background`             | `#22272f`             |
| `--dl-tooltip-bubble-color`                  | `#eceef2`             |
| `--dl-tooltip-success-background` / `-color` | `#dcf5e7` / `#11794b` |
| `--dl-tooltip-warning-background` / `-color` | `#fdf0cd` / `#7a5407` |
| `--dl-tooltip-error-background` / `-color`   | `#fbe0e3` / `#96222f` |

### Combobox

Read by both the stylesheet and the CSS `<dl-select>` injects itself:

| Token                                  | Default                       |
| -------------------------------------- | ----------------------------- |
| `--dl-options-background`              | follows `--dl-surface-raised` |
| `--dl-options-text-color`              | follows `--dl-text-color`     |
| `--dl-options-inactive-text-color`     | follows `--dl-text-muted`     |
| `--dl-options-option-hover-color`      | follows `--dl-accent-soft`    |
| `--dl-options-padding-top` / `-bottom` | `0.5rem`                      |
| `--dl-options-padding-right` / `-left` | `0.75rem`                     |
| `--dl-focused-line-color`              | follows `--dl-accent`         |
| `--dl-drop-down-icon-margin-top`       | `7px`                         |
| `--dl-select-loading-col1` / `-col2`   | `#eef0f4` / `#e2e6ec`         |

::: tip Also set the combobox tokens on `dl-option`
`<dl-select>` moves its options into a popup attached to `document.body` while
open, so they leave the subtree your tokens may be scoped to. If you scope
tokens to anything narrower than `:root`, declare the `--dl-options-*` ones on
`dl-option` as well. See the [DOM contract](/dom-contract#dl-select).
:::

## The classic stylesheet

```ts
import 'declarative-forms/classic.css';
```

The [classic look](/guide/theme#staying-on-the-classic-look) is tokenised too —
it is the v1 stylesheet with every hardcoded value lifted into a `--dl-*`
property, each `var()` carrying the v1 value as its fallback. It declares a
smaller set, with these values:

| Token                     | Classic default       | Used for                                       |
| ------------------------- | --------------------- | ---------------------------------------------- |
| `--dl-font-family`        | `'Rubik', sans-serif` | —                                              |
| `--dl-font-size`          | `0.9em`               | —                                              |
| `--dl-accent`             | `#1ea6a3`             | Buttons, active tab, checked box, focused card |
| `--dl-accent-hover`       | `#22bb8b`             | Button hover border                            |
| `--dl-danger`             | `#fe070b`             | Remove buttons                                 |
| `--dl-surface`            | `#fff`                | Dialog background                              |
| `--dl-surface-muted`      | `#f8f8f8`             | Lower bar, cards, list rows                    |
| `--dl-surface-sunken`     | `#eee`                | Multi-select tags                              |
| `--dl-overlay`            | `rgba(0,0,0,0.6)`     | Modal backdrop                                 |
| `--dl-text-color`         | `#545454`             | Body text                                      |
| `--dl-label-color`        | `#58565c`             | Field labels                                   |
| `--dl-line-color`         | `#ddd`                | Input borders                                  |
| `--dl-focused-line-color` | `#bbb`                | Focused input borders                          |
| `--dl-border-muted`       | `#e7e6e6`             | List row borders                               |
| `--dl-radius`             | `4px`                 | —                                              |
| `--dl-field-width`        | `400px`               | —                                              |
| `--dl-modal-width`        | `416px`               | —                                              |
| `--dl-large-modal-width`  | `800px`               | —                                              |

Its tooltip and combobox tokens carry the same names as above with the v1
values; the `-soft`, `-ring`, `-raised`, `-muted`, `-strong`, shadow, stack and
transition tokens are specific to the default stylesheet and have no effect
here.

### Dark mode in the classic stylesheet

There is no automatic switch. The stylesheet ships a `body.dark-theme` block
that redefines the palette:

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

The default stylesheet does this for you — that is
[`data-dl-theme`](/guide/theme#switching-light-and-dark).

## Where the combobox CSS lives

The form and modal chrome ship in the stylesheet you import. The **structural**
styles for `<dl-select>` — absolute positioning of the popup, show/hide — are
injected from JavaScript the first time a combobox connects, because the
component does not function without them. They read the same tokens, so theming
is uniform.

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

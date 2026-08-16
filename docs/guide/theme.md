# The modern theme

The package ships **two stylesheets**. They render the same DOM; they only look
different.

| Import                         | What it is                                                          |
| ------------------------------ | ------------------------------------------------------------------- |
| `declarative-forms/styles.css` | The classic default. Byte-compatible with v1's `assets/default.css` |
| `declarative-forms/theme.css`  | A modern redesign with automatic light and dark mode                |

```ts
import 'declarative-forms/theme.css';
```

Import **one or the other**, not both. Everything on this documentation site is
rendered with the modern theme, so the live demos throughout the guide are what
it actually looks like — try the light/dark switch in the navigation bar.

## What you get

- A refined neutral palette, softer radii and layered shadows.
- **Automatic dark mode** from `prefers-color-scheme`, with an explicit
  override.
- Visible focus rings on every control, using `:focus-visible` so they appear
  for keyboard users and not on mouse clicks.
- Tabs as a segmented control, filled primary buttons, and a quieter
  `.secondary` variant for cancel and back.
- Fluid widths. The default theme pins fields to 400px and dialogs to 416px;
  this one adapts to its container, so embedded forms fit narrow panels.
- A blurred backdrop and a short entrance animation, both suppressed under
  `prefers-reduced-motion`.
- Multi-select values as inline pills rather than stacked blocks.

### One accessibility fix

The default stylesheet hides the checkbox input with `visibility: hidden` and
paints a pseudo-element in its place, which takes the control out of the tab
order and out of the accessibility tree.

The modern theme styles the input directly with `appearance: none`, so
**checkboxes are focusable and operable by keyboard**. This is the one place
where the two stylesheets differ behaviourally rather than cosmetically, and it
is why the fix could ship without touching the frozen default. The remaining
gaps in [Accessibility](/accessibility) apply to both.

## Switching light and dark

By default the theme follows the operating system. To force a mode, set
`data-dl-theme` on any ancestor — usually `<html>`:

```html
<html data-dl-theme="dark"></html>
```

```ts
document.documentElement.dataset.dlTheme = isDark ? 'dark' : 'light';
```

Because it is an ordinary attribute selector, it also works per-subtree — a
single dialog can be pinned dark inside an otherwise light page:

```ts
form.openInModal({ wrapperClassNames: ['my-dialog'] });
```

```html
<div data-dl-theme="dark">…</div>
```

## Customising

Every value is a `--dl-*` custom property declared at zero specificity, so
setting one anywhere wins without `!important`:

```css
:root {
  --dl-accent: #6d4aff;
  --dl-radius: 12px;
  --dl-font-family: 'Inter', system-ui, sans-serif;
}
```

The modern theme adds these on top of the
[shared token set](/guide/theming#the-tokens):

| Token                                  | Purpose                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `--dl-accent-contrast`                 | Text colour on a filled accent button                                    |
| `--dl-accent-soft`                     | Tinted background for hover and selected states                          |
| `--dl-accent-ring`                     | Focus-ring colour                                                        |
| `--dl-surface-raised`                  | Inputs and popups, distinct from the dialog surface                      |
| `--dl-text-muted`                      | Secondary text, placeholders, help                                       |
| `--dl-line-strong`                     | Borders that need more presence than `--dl-line-color`                   |
| `--dl-radius-sm` / `-lg` / `-pill`     | The rest of the radius scale                                             |
| `--dl-shadow-sm` / `-modal` / `-popup` | The elevation scale                                                      |
| `--dl-overlay-blur`                    | Backdrop blur radius                                                     |
| `--dl-stack-peek` / `--dl-stack-inset` | Size of the card edges behind a [stacked](/guide/modals#stacking) dialog |
| `--dl-gap`                             | Vertical rhythm between fields                                           |
| `--dl-control-padding-y` / `-x`        | Input padding                                                            |
| `--dl-transition`                      | Shared transition timing                                                 |

Redefine them under your own dark rules too, if you add tokens of your own:

```css
:root[data-dl-theme='dark'] {
  --dl-accent: #a78bfa;
}
```

## Compatibility

The theme was written to be a safe swap for an existing installation:

- **Same DOM.** No markup, class name or id changes. The
  [DOM contract](/dom-contract) is untouched.
- **Same selectors, same specificity.** Rules mirror the default stylesheet's,
  so overrides you wrote against the default keep winning with exactly the
  force they needed before.
- **The default stylesheet is unchanged.** Nothing about the classic look moved,
  so consumers who do not opt in see no difference at all.

Two caveats worth knowing:

- Overrides that assumed **fixed pixel widths** — the 400px field, the 416px
  dialog — will look different, because this theme is fluid. Set
  `--dl-field-width` and `--dl-modal-width` if you need the old geometry back.
- The combobox popup is portalled to `<body>`, outside any scoped selector, so
  a handful of its rules use a doubled class (`.options-wrapper.options-wrapper`)
  to win against the structural CSS the component injects at runtime. If you
  override the popup, match that specificity.

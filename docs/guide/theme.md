# Themes

The package ships **two stylesheets**. They render the same DOM; they only look
different.

| Import                          | What it is                                                        |
| ------------------------------- | ----------------------------------------------------------------- |
| `declarative-forms/styles.css`  | **The default.** A modern look with automatic light and dark mode |
| `declarative-forms/classic.css` | The v1 look, for installations with overrides written against it  |

```ts
import 'declarative-forms/styles.css';
```

Import **one or the other**, not both. Everything on this documentation site is
rendered with the default, so the live demos throughout the guide are what you
get out of the box — try the light/dark switch in the navigation bar.

::: tip Coming from 2.0?
In 2.0 this look was an opt-in second stylesheet at
`declarative-forms/theme.css`, and `styles.css` was the classic one. In 3.0 they
swapped: `styles.css` is this stylesheet, and the classic look moved to
`classic.css`. The `theme.css` path still resolves here, so an existing opt-in
import keeps working — but **an unchanged `styles.css` import now renders the
new look**. See [Staying on the classic look](#staying-on-the-classic-look).
:::

## What you get

- A refined neutral palette, softer radii and layered shadows.
- **Automatic dark mode** from `prefers-color-scheme`, with an explicit
  override.
- Visible focus rings on every control, using `:focus-visible` so they appear
  for keyboard users and not on mouse clicks.
- Tabs as a segmented control, filled primary buttons, and a quieter
  `.secondary` variant for cancel and back.
- Fluid widths. The classic stylesheet pins fields to 400px and dialogs to
  416px; this one adapts to its container, so embedded forms fit narrow panels.
- A blurred backdrop and a short entrance animation, both suppressed under
  `prefers-reduced-motion`.
- Multi-select values as inline pills rather than stacked blocks.
- Stacked dialogs that **show the stack**: the dialogs underneath are drawn as
  card edges peeking out above the one on top.

### One accessibility fix

The classic stylesheet hides the checkbox input with `visibility: hidden` and
paints a pseudo-element in its place, which takes the control out of the tab
order and out of the accessibility tree.

The default styles the input directly with `appearance: none`, so **checkboxes
are focusable and operable by keyboard**. This is the one place where the two
stylesheets differ behaviourally rather than cosmetically. The remaining gaps in
[Accessibility](/accessibility) apply to both.

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

The full list is in [Theming tokens](/guide/theming). Redefine them under your
own dark rules too, if you add tokens of your own:

```css
:root[data-dl-theme='dark'] {
  --dl-accent: #a78bfa;
}
```

## Staying on the classic look

The v1 look is unchanged and still shipped. One import gets it back:

```ts
import 'declarative-forms/classic.css';
```

v1's `declarative-forms/assets/default.css` also still maps to it, so a
migration that kept that path is already on the classic look and is unaffected
by the swap.

The classic stylesheet has no light/dark switch; it ships a `body.dark-theme`
block instead. See [Theming tokens](/guide/theming#the-classic-stylesheet).

## Moving from classic to the default

The default was written as a safe swap for an existing installation:

- **Same DOM.** No markup, class name or id changes. The
  [DOM contract](/dom-contract) is untouched.
- **Same selectors, same specificity.** Rules mirror the classic stylesheet's,
  so overrides you wrote against it keep winning with exactly the force they
  needed before.

Three caveats worth knowing:

- Overrides that assumed **fixed pixel widths** — the 400px field, the 416px
  dialog — will look different, because the default is fluid. Set
  `--dl-field-width` and `--dl-modal-width` if you need the old geometry back.
- Overrides that targeted the **checkbox pseudo-element**
  (`input[type=checkbox]:before`) have nothing to paint any more; the input
  itself is the visible box.
- The combobox popup is portalled to `<body>`, outside any scoped selector, so
  a handful of its rules use a doubled class (`.options-wrapper.options-wrapper`)
  to win against the structural CSS the component injects at runtime. If you
  override the popup, match that specificity.

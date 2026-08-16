# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A second stylesheet, `declarative-forms/theme.css`: a modern redesign with
  automatic light and dark mode (`prefers-color-scheme`, overridable with
  `data-dl-theme`), focus rings, fluid widths and a fuller token set. It is a
  standalone alternative to `styles.css`, renders the identical DOM, and mirrors
  the default stylesheet's selectors and specificity so existing overrides keep
  winning. The default stylesheet is unchanged.
- Under the modern theme, checkboxes are **keyboard-reachable**: the input is
  styled directly with `appearance: none` rather than hidden behind a
  pseudo-element. The default stylesheet keeps its existing behaviour.
- Two wrapper classes for stacked dialogs: `dl-modal-stacked` on a dialog opened
  on top of another, and `dl-modal-restored` on one revealed again after being
  covered. Both mark a backdrop that is already on screen, so a theme can skip
  its entrance animation.

### Fixed

- Opening or closing a stacked dialog no longer flashes the page under the
  backdrop. The covered dialog was hidden in the same frame the new one started
  fading in, leaving nothing over the page for the length of the animation; the
  modern theme now skips that animation for stacked and restored dialogs. The
  default stylesheet was never affected — it has no animations.

## [2.0.0-alpha.0]

Complete rewrite in TypeScript with an object-oriented design.

**The JavaScript API is a clean break; the rendered DOM is deliberately
unchanged.** Stylesheets and DOM-based end-to-end selectors written against v1
keep working. See the [migration guide](https://wolfoo2931.github.io/declarative-forms/migration-v1).

### Added

- Discriminated `kind` on field descriptors, making them fully typable.
- `form.field(name)` — a typed handle with `getValue`, `setValue`, `focus`,
  `setLoading`, `element` and `wrapper`.
- `FieldRegistry`, so applications can register their own field kinds.
- Pluggable `TooltipProvider`, with a native zero-dependency default.
- `html()` / `escapeHtml()` for explicit, opt-in markup.
- `whenReady()`, `destroy()`, and an unsubscribe return from
  `subscribeOnInput()`.
- `dl-error` event on file-upload failure.
- A `--dl-*` design-token layer and a dark theme.
- Documentation site, and a live example playground under `examples/`.

### Changed

- Package renamed to `declarative-forms`; the export is now named
  (`import { DeclarativeForm }`).
- Constructor takes a single options object instead of five positional
  arguments.
- Descriptor callbacks receive one context object instead of per-callback
  positional argument lists.
- Renamed: `mapFiledsOnEdit` → `mapFieldsOnEdit`,
  `onValuesCalculationFailedMessage` → `onOptionsError`,
  `closeModalIfOpen` → `close`, `updateCalculatedFields` →
  `updateComputedFields`, `mulitple-allowed` → `multiple`.
- `descriptor.domElement` replaced by `form.field(name)`; the library no longer
  mutates caller-supplied descriptors.
- Dialog buttons are `<button type="button">` rather than `<div>`, keeping the
  `.btn` class.
- Content is rendered as text by default; markup requires `html()`.
- `message` fields no longer appear in `getValues()`.
- `buttons` and `onConfirm` are independent — a single-button map no longer
  silently replaces `onConfirm`.
- Test tooling replaced with Vitest, Playwright and tsup.

### Removed

- All runtime dependencies: `tippy.js`, `@popperjs/core`,
  `@react-hookz/deep-equal`, and the unused `uuid`.
- The v1 Karma/Jasmine/wdio/Browserify setup, which could not run — its
  packages were referenced by scripts but absent from `devDependencies`.

### Fixed

- `<label for>` pointed at a field name that was never an element id, so no
  field was ever labelled for assistive technology.
- Checkbox ids collided between a parent form and its array sub-form.
- `getValues()` could not represent `''`, `0` or `false`.
- The internal promise list grew without bound and was never cleared.
- Tabs and tooltips were resolved with `document.querySelector`, so two open
  forms fought over each other's state.
- A slow options load could overwrite a newer one; loads are now
  generation-guarded.
- Caller data was interpolated as HTML in 21 places.
- Option values containing a quote threw a `DOMException`.
- A keydown listener and a stylesheet were installed as import side effects,
  breaking server-side rendering.
- `class DlSelect extends HTMLElement` was evaluated at module load, so simply
  importing the package threw `HTMLElement is not defined` in Node and broke
  any server-rendered or prerendered app.
- `classList.remove` was written as `Element.remove()`, deleting the confirm
  button whenever it showed its loading state.
- `<dl-option>` was never registered as a custom element.
- Buttons flashed disabled on every keystroke, and a well-timed click could be
  dropped.

[Unreleased]: https://github.com/wolfoo2931/declarative-forms/compare/v2.0.0-alpha.0...HEAD
[2.0.0-alpha.0]: https://github.com/wolfoo2931/declarative-forms/releases/tag/v2.0.0-alpha.0

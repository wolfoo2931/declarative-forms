# Migrating from v1

v2 is a **clean break in the JavaScript API** and a **deliberate freeze of the
rendered DOM**. Understanding that split makes the upgrade far smaller than it
first looks.

## Your CSS and your DOM selectors keep working

::: tip Read this before estimating the work
Class names, element structure, `#dl-form-field-wrapper-for-<name>` ids, tab
class derivation, `.dl-tab-btn` sibling ordering, `dl-select[name=…]`
selectors — **all unchanged**, including misspelled classes like
`.dl-muliselect-selected-remove`. Stylesheets need no changes. End-to-end suites
that select on rendered output need no changes. See the
[DOM contract](/dom-contract).
:::

What changes is how you _write_ the form.

## Package and imports

```diff
- import DeclarativForm from 'declarativ_forms';
+ import { DeclarativeForm } from 'declarative-forms';
```

The package is renamed (`declarative-forms`), the export is now **named**
rather than default, and the class name gains its missing `e`.

Stylesheet:

```diff
- @import "declarativ_forms/assets/default.css";
+ @import "declarative-forms/classic.css";
```

`declarative-forms/assets/default.css` is still a valid export path mapped to
the same file, so that import can stay if you prefer a one-word diff.

::: warning `styles.css` is not the v1 look
The v1 stylesheet is `classic.css`. `declarative-forms/styles.css` is the
package's own default — a [modern light/dark theme](/guide/theme) that renders
the identical DOM but looks different. Import it deliberately, not as part of
the rename.
:::

## Constructor

Positional arguments become a single options object:

```diff
- new DeclarativForm(attrs, onChange, onCancel, confirmCaption, parentForm)
+ new DeclarativeForm({ fields, buttons, onConfirm, onCancel, confirmLabel })
```

```ts
// v1
new DeclarativForm({ fields }, save, () => {}, 'Back to References');

// v2
new DeclarativeForm({
  fields,
  onConfirm: save,
  onCancel: () => {},
  confirmLabel: 'Back to References',
});
```

`parentForm` is gone — nesting is handled internally, and child forms read
outward via `ctx.parentData` / `ctx.stackData`.

## Prefilling from an object

The v1 idiom for editing a record was to walk the descriptors and write the
object onto them before constructing:

```js
fields.forEach((field) => {
  field.defaultValue = ref[field.name] || field.defaultValue;
});
```

**This still works unchanged in v2.** `defaultValue` is read from the descriptor
you pass in, so seeding it yourself has the same effect it always had — and
because v2 never writes back onto your descriptors, doing it on a copy is now
the safer spelling:

```js
const seeded = fields.map((field) => ({
  ...field,
  defaultValue: ref[field.name] ?? field.defaultValue,
}));
```

v2 also makes it a first-class option, so the loop is no longer needed at all:

```js
new DeclarativeForm({ fields, defaultValues: ref, onConfirm: save });
await ask(fields, { defaultValues: ref });
```

Extra keys on `ref` are ignored, so the whole record can go in as-is. See
[Editing an object](/guide/editing).

`mapFieldsOnEdit` on an `array` field is untouched: entry dialogs are still
seeded by copying the entry onto the entry fields' `defaultValue` before your
hook runs, exactly as in v1.

## Field descriptors gain `kind`

v1 inferred the field type from _which optional key happened to be present_.
v2 uses an explicit discriminant, which is what makes the descriptors typable.

| v1                      | v2                                           |
| ----------------------- | -------------------------------------------- |
| _(no marker)_           | `kind: 'text'` (or omit — it is the default) |
| `largetext: true`       | `kind: 'textarea'`                           |
| `allowedValues`         | `kind: 'select'`, key renamed to `options`   |
| `check: 'caption'`      | `kind: 'checkbox'`, `label: 'caption'`       |
| `message`               | `kind: 'message'`                            |
| `inputType: 'file'`     | `kind: 'file'`                               |
| `acceptFileType`        | `accept`                                     |
| `calculate`             | `kind: 'computed'`, key renamed to `compute` |
| `detailedOptions`       | `kind: 'cards'`, key renamed to `cards`      |
| `render`                | `kind: 'custom'`                             |
| `arrayOf`               | `kind: 'array'`, key renamed to `of`         |
| `inputType: 'password'` | `type: 'password'`                           |

```diff
- { name: 'note', largetext: true, allowNewlines: true }
+ { name: 'note', kind: 'textarea', allowNewlines: true }

- { name: 'lang', allowedValues: [['en', 'English']] }
+ { name: 'lang', kind: 'select', options: [{ value: 'en', label: 'English' }] }

- { name: 'agree', check: 'I agree' }
+ { name: 'agree', kind: 'checkbox', label: 'I agree' }
```

Select options also move from tuples to objects:

```diff
- allowedValues: [['bk', 'Book', 'Type: Book']]
+ options: [{ value: 'bk', label: 'Book', displayWhenSelected: 'Type: Book' }]
```

Plain string arrays still work unchanged.

## Renamed keys and methods

| v1                                    | v2                                                 |
| ------------------------------------- | -------------------------------------------------- |
| `mapFiledsOnEdit` _(typo)_            | `mapFieldsOnEdit`                                  |
| `onValuesCalculationFailedMessage`    | `onOptionsError`                                   |
| `newButtonLabel`                      | unchanged                                          |
| `descriptor.domElement`               | `form.field(name)`                                 |
| `dom.onChange(force)`                 | `ctx.requestUpdate(force)`                         |
| `field.editArrayOfEntryMode`          | `ctx.isEditingArrayEntry`                          |
| `closeModalIfOpen(cb?)`               | `close(cb?)`                                       |
| `updateCalculatedFields()`            | `updateComputedFields()`                           |
| `updateForm()`                        | `update()`                                         |
| `subscribeOnInput(cb)`                | unchanged, but now returns an unsubscribe function |
| `mulitple-allowed` attribute _(typo)_ | `multiple`                                         |

## Callbacks take one context object

The single largest ergonomic change. v1 gave each callback a different
positional argument list; v2 gives them all the same object.

```diff
- isActive: (formData, stackData, field, parentData) => …
+ isActive: ({ data, stackData, field, parentData }) => …

- tab: (field) => …
+ tab: ({ field, data }) => …

- defaultValue: (formData) => …
+ defaultValue: ({ data }) => …

- placeholder: (formData) => …
+ placeholder: ({ data }) => …

- allowedValues: (formData) => …
+ options: ({ data }) => …

- onFormChange: (formData, form, triggerElement) => …
+ onFormChange: ({ data, form, trigger }) => …
```

The context is `{ data, form, field, parentData, stackData, isEditingArrayEntry }`,
plus `trigger` on `onFormChange` and `element` / `requestUpdate` / `setValue`
on a `custom` field's `render`.

## Imperative field access

```diff
- fields.find((f) => f.name === 'lang').domElement.setValue('de');
+ form.field('lang')?.setValue('de');

- extRefField.domElement.setLoadingStatus();
+ form.field('extRef')?.setLoading(true);

- document.querySelector('dl-select[name=existing-ref]').setValue(id);
+ form.field('existing-ref')?.setValue(id);
```

v2 never writes back onto your descriptor objects, so they can be shared,
frozen or generated. `form.field(name)` returns a typed handle with
`getValue`, `setValue`, `focus`, `setLoading`, `element` and `wrapper`.

## The validation pattern carries over unchanged

The v1 idiom — one throttled `onFormChange` that switches on the trigger's name
and writes the verdict onto a tooltip — works in v2 as written, apart from the
context and `domElement` renames above:

```diff
- onFormChange: throttle(100, (formData, dFrom, triggerElement) => {
-   if (!triggerElement) return;
-   if (triggerElement.name === 'author') checkAuthor(formData, dFrom);
- })
+ onFormChange: throttle(100, ({ data, form, trigger }) => {
+   if (!trigger) return;
+   if (trigger.name === 'author') checkAuthor(data, form);
+ })
```

`setTooltip`, `setTooltipSuccess`, `setTooltipWarning`, `setTooltipError`,
`resetTooltip` and `setActiveTab` keep their names and signatures, and the class
names they apply (`tooltip-error`, `tooltip-warning`, `tooltip-success`,
`tooltip-loading`) are unchanged, so custom tooltip CSS keeps working.
`setTooltip(name, text, '', 'tooltip-loading')` now has a shorthand:
`setTooltipLoading(name, text)`.

Two things did change:

- Tooltips are **scoped per form**. v1 resolved the marker with
  `document.querySelector`, so a nested dialog could overwrite the message of a
  same-named field in the dialog underneath it. It no longer can.
- Values written from inside `onFormChange` — the "paste a DOI and the form
  fills itself in" flow — must keep their `formData[name] !== value` guard. v1
  tolerated a redundant write; v2 throws
  `form updates did not settle after 100 rounds` instead of looping forever.

See [Validation](/guide/validation) for the whole pattern written out.

## Behaviour changes

Five differences that are not just renames.

### 1. The single-button quirk is gone

v1 silently overwrote `onChangeCallback` when `buttons` had exactly one key.
Code commonly passed `() => {}` as the callback and put the real handler in the
sole button, relying on the overwrite.

In v2 `onConfirm` and `buttons` are independent: **declare `buttons` and
`onConfirm` is not used.**

```diff
- new DeclarativForm({ fields, buttons: { Save: { action: save } } }, () => {}, cancel);
+ new DeclarativeForm({ fields, buttons: { Save: { action: save } }, onCancel: cancel });
```

### 2. `message` fields leave `getValues()`

v1 emitted `''` for them. v2 omits them entirely. Code that iterates over all
value keys may need adjusting.

### 3. Buttons are `<button>`, not `<div>`

They keep the `.btn` class, and the stylesheet normalises the UA button styles,
so rendering is unchanged — but they are now focusable and keyboard-operable.

### 4. `openInModal()` still returns an element

Unchanged, and deliberately so. It returns the raw `div.dl-modal`. If your code
calls `.close()` on that return value, it was a **silent no-op in v1 and still
is** — the method does not exist. Replace it with `form.close()`.

### 5. Falsy values survive

v1 read values as
`getAttribute('data-value') || getAttribute('value') || _value || value`, so
`''`, `0` and `false` fell through to the next source. v2 returns them
faithfully — notably, an unchecked checkbox is now the boolean `false` rather
than an accidental string.

## Other fixes you inherit

No action needed, but worth knowing the behaviour changed for the better:

- **Stale async options are discarded.** A slow `options` load from an earlier
  keystroke can no longer overwrite newer results.
- **Two forms no longer fight.** Tabs and tooltips were resolved with
  `document.querySelector` in v1; they are now scoped per form.
- **Text is escaped by default.** Labels, messages and option content go
  through `textContent` unless wrapped in [`html()`](/guide/security) — if you
  passed markup in any of these, wrap it.
- **No import side effects.** The keydown listener and stylesheet are installed
  lazily, so importing the library is SSR-safe.
- **The confirm button no longer deletes itself** when showing its loading
  state (v1 called `Element.remove()` where `classList.remove()` was meant).

## Suggested order

Because dependencies are pinned per repository, migrate one at a time:

1. **`presspack`** — only user of `suggested` and `acceptFileType`. It receives
   the constructor as a function argument across a package boundary, which can
   now be typed. Its option labels contain raw HTML
   (`<span part="tag" class="dl-option-tag">`) and **must be wrapped in
   `html()`**.
2. **`structured-text-editor`** — mostly `reference_controller.js`. Sole user of
   `mapFiledsOnEdit`, `onValuesCalculationFailedMessage` and
   `editArrayOfEntryMode`. Convert `domElement` access to `form.field()`. Its
   ~193 `dl-select[name=…]` end-to-end selectors need **no change**.
3. **`monsterwriter2`** — largest surface: the React wrapper,
   `appendInElement`, `subscribeOnInput`, `updateComputedFields`,
   `setActiveTab(undefined)` as a resync, and `closeModalIfOpen()` called with
   no argument behind a `@ts-ignore` (v2's optional-callback `close()` removes
   the need). Its CSS overrides and dark-mode `--dl-*` declarations need no
   change. Then bump the `monsterwriter-electron` submodule.

## Staying on v1

v1 remains available at its existing commits. If you pin by git SHA, nothing
changes until you choose to move.

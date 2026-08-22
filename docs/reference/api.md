# API reference

```ts
import { ask, DeclarativeForm } from 'declarative-forms';
```

## `ask(fields, options?)`

```ts
function ask(
  fields: readonly FieldDescriptor[],
  options?: AskOptions,
): Promise<FormValues | undefined>;

interface AskOptions extends Omit<
  DeclarativeFormOptions,
  'fields' | 'onConfirm' | 'onCancel'
> {
  modal?: OpenInModalOptions;
  dismissable?: boolean; // default true
}
```

Opens the fields as a modal dialog and resolves with its values, or with
`undefined` when the user dismisses it. See
[Asking for data](/guide/asking-for-data).

| Option          | Notes                                                               |
| --------------- | ------------------------------------------------------------------- |
| `modal`         | Class names for the dialog chrome, as passed to `openInModal`       |
| `dismissable`   | `false` removes the ✕ and makes Escape a no-op                      |
| `buttons`       | Resolves after any button that closes the dialog has run its action |
| everything else | As on [`DeclarativeFormOptions`](#new-declarativeform-options)      |

The promise settles _after_ the dialog is torn down and popped off the modal
stack, so asking again immediately opens a clean, unstacked dialog.

A `doNotCloseModal` button leaves the promise pending, because it leaves the
dialog open. With `dismissable: false`, make sure some button closes the dialog
— nothing else will.

## `new DeclarativeForm(options)`

```ts
interface DeclarativeFormOptions {
  fields: readonly FieldDescriptor[];
  buttons?: ButtonMap;
  confirmLabel?: string;
  onConfirm?: (values: FormValues) => unknown;
  onCancel?: () => void;
  classNames?: readonly string[];
  persistFile?: (file: File) => Promise<URL | string>;
  tooltipProvider?: TooltipProvider;
}
```

| Option            | Notes                                                       |
| ----------------- | ----------------------------------------------------------- |
| `fields`          | Required. See [Field kinds](/guide/fields/)                 |
| `buttons`         | Keyed by visible label. Replaces the default OK button      |
| `confirmLabel`    | Renames the default button. Ignored when `buttons` is given |
| `onConfirm`       | Run on confirm. May be async                                |
| `onCancel`        | **Presence enables dismissal** — ✕ button and Escape        |
| `classNames`      | Added to the inner `<form>` element                         |
| `persistFile`     | Required by [`file`](/guide/fields/file) fields             |
| `tooltipProvider` | Swap the tooltip implementation                             |

Constructing does not display anything. Call `openInModal()` or
`appendInElement()`.

## Values

### `getValues(): FormValues`

Current values keyed by field name. Fields hidden by `isActive` are omitted;
`message` fields never appear; `activeTab` is always present.

### `subscribeOnInput(subscriber): () => void`

Called whenever values change. Returns an unsubscribe function.

```ts
const off = form.subscribeOnInput((values) => console.log(values));
off();
```

### `field(name): FieldHandle | undefined`

```ts
interface FieldHandle {
  readonly name: string;
  readonly element: HTMLElement; // the control
  readonly wrapper: HTMLElement; // .dl-form-field-wrapper
  getValue(): unknown;
  setValue(value: unknown): void;
  focus(): void;
  setLoading(loading: boolean): void;
}
```

Replaces v1's `descriptor.domElement`. Returns `undefined` for an unknown name.

### `fields: readonly FieldHandle[]`

Every field handle, in declaration order.

## Lifecycle

### `whenReady(): Promise<void>`

Resolves once initial options have loaded and defaults have been applied.

### `update(source?, force?, includeTab?): Promise<void>`

Manually run the [update cycle](/guide/reactivity#the-update-cycle). Rarely
needed — prefer `ctx.requestUpdate()` from inside a field.

### `updateComputedFields(): Promise<void>`

Re-run every [`computed`](/guide/fields/computed) field. Button actions do this
automatically.

## Display

### `openInModal(options?): HTMLElement`

```ts
interface OpenInModalOptions {
  classNames?: readonly string[]; // added to inner .modal
  wrapperClassNames?: readonly string[]; // added to outer .dl-modal
}
```

Returns the outer `div.dl-modal` element — **not** a controller object. See
[Modals](/guide/modals).

### `appendInElement(host, options?): HTMLElement`

Render inline. `options.classNames` are added to the wrapper.

### `modalElement: HTMLElement | undefined`

The outer element once displayed.

### `hide()` / `show()`

Toggle the `dl-modal-hidden` class without closing.

### `getHTML(): string`

The form's outer HTML. Intended for tests and snapshots.

### `dom` / `formElement`

The `.dl-form` wrapper, and the `<form>` the fields live in.

## Closing

| Method           | `onConfirm`      | `onCancel` | Removes                      |
| ---------------- | ---------------- | ---------- | ---------------------------- |
| `close(action?)` | yes, or `action` | no         | yes, unless embedded         |
| `cancel()`       | no               | yes        | yes                          |
| `remove()`       | no               | no         | yes                          |
| `destroy()`      | no               | no         | yes, plus releases resources |

`close()` returns a promise that resolves after your callback settles.
`cancel()` is a no-op when the form has no `onCancel`.

## Tabs

### `setActiveTab(tab?)`

Switch tabs. With no argument, re-applies the current tab as a resync.
Selecting a tab that is not rendered is a no-op.

### `refreshTabs()`

Re-apply tab visibility to fields. Called by the modal stack when a dialog is
revealed.

## Tooltips

```ts
form.setTooltip(name, text, icon?, className?);
form.setTooltipSuccess(name, text);
form.setTooltipWarning(name, text);
form.setTooltipError(name, text);
form.setTooltipLoading(name, text);
form.resetTooltip(name);
form.resetTooltips(['a', 'b']);
```

All are silent no-ops for a field that declares no `tooltip`. `resetTooltip`
restores the original text and the `?` icon.

Scoped to the form, so two forms with a same-named field do not collide.

These are the library's error-reporting channel: call them from a field's
`onFormChange` to validate input. They only display — they do not disable the
confirm button. See [Validation](/guide/validation).

## Buttons

```ts
interface ButtonDescriptor {
  action?: (values: FormValues) => unknown;
  id?: string;
  class?: string;
  isActive?: (ctx: ButtonContext) => boolean | Promise<boolean>;
  isVisible?: (ctx: ButtonContext) => boolean | Promise<boolean>;
  doNotCloseModal?: boolean;
}

interface ButtonContext {
  data: FormValues;
  parentData: FormValues | undefined;
  stackData: readonly FormValues[];
}
```

`isActive` / `isVisible` require an `id`. See [Buttons](/guide/buttons).

## Tooltip provider

```ts
interface TooltipProvider {
  attach(element: HTMLElement, content: string): void;
  detach(element: HTMLElement): void;
}
```

Default is `NativeTooltipProvider` (zero dependencies, shows on hover and
focus). Supply your own to use tippy.js or another library:

```ts
new DeclarativeForm({ fields, tooltipProvider: myProvider });
```

## Other exports

| Export                                                  | Purpose                                             |
| ------------------------------------------------------- | --------------------------------------------------- |
| `html`, `escapeHtml`, `SafeHtml`, `isSafeHtml`          | [Text & HTML safety](/guide/security)               |
| `Field`, `FieldRegistry`, `defaultFieldRegistry`        | [Custom field kinds](/guide/custom-fields)          |
| `DlSelect`, `DlOption`, `defineDlSelect`                | [`<dl-select>`](/reference/dl-select)               |
| `injectStyles`, `DL_SELECT_STYLES`                      | Manual combobox style injection                     |
| `ModalStack`, `globalModalStack`                        | Isolated modal stacks (useful in tests)             |
| `ModalView`, `TabBar`, `ButtonBar`, `TooltipController` | UI internals                                        |
| `FormModel`, `UpdateScheduler`, `IdGenerator`           | Core internals                                      |
| `deepEqual`                                             | The structural comparison used for change detection |

All descriptor and option types are exported as types.

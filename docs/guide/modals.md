# Modals & stacking

A form can be shown as a floating dialog, or placed directly into the page.
Every other demo on this site is placed in the page; this one is a real dialog.
Opening a second dialog from inside it shows how the stack works.

<LiveForm mode="modal" open="Open a stacked dialog">

```ts
{
  fields: [
    { name: 'title', displayName: 'Title', defaultValue: 'Parent dialog' },
    {
      name: 'people',
      kind: 'array',
      displayName: 'People (opens a second dialog)',
      of: [{ name: 'name', displayName: 'Name' }],
    },
  ],
}
```

</LiveForm>

## As a modal

```ts
const modal = form.openInModal();
```

The dialog is added to `document.body`, and its outer `div.dl-modal` element is
returned.

::: warning It returns an element, not a controller object
`openInModal()` returns the plain DOM element, and does so on purpose. Do not
call `.close()` on it — that method does not exist. Use `form.close()`,
`form.cancel()` or `form.remove()` instead. (The return type is
[frozen](/dom-contract) so that old code keeps working.)
:::

You can add classes when you open the dialog:

```ts
form.openInModal({
  classNames: ['largeModal'], // added to the inner .modal
  wrapperClassNames: ['myOverlay'], // added to the outer .dl-modal
});
```

Calling `openInModal()` a second time reuses the same element. It does not
create a second dialog.

## Embedded in the page

```ts
form.appendInElement(document.querySelector('#panel'));
```

The wrapper gets a `noModalDialog` class, which removes the backdrop and the
centred layout. The important difference in behaviour: **confirming a form that
is embedded in the page runs your callback, but does not remove the form**. A
panel inside a page should stay where it is.

Combine this with `subscribeOnInput` to get a panel that updates live:

```ts
form.appendInElement(host);
form.subscribeOnInput((values) => renderPreview(values));
```

## Closing

| Method           | Runs `onConfirm`? | Runs `onCancel`? | Removes the dialog?         |
| ---------------- | ----------------- | ---------------- | --------------------------- |
| `close(action?)` | yes (or `action`) | no               | yes, unless embedded        |
| `cancel()`       | no                | yes              | yes                         |
| `remove()`       | no                | no               | yes                         |
| `destroy()`      | no                | no               | yes, and releases listeners |

```ts
await form.close(); // confirm
await form.close(customAction); // confirm with a different callback
form.cancel(); // dismiss
```

`close()` is asynchronous because your callback may be. It waits for the
callback before it removes the dialog.

Use `destroy()` when you are finished with a form that is **embedded in the
page**. It also removes the tooltips and cancels work that is still running.

## Dismissable or not

Whether the dialog can be closed without finishing it depends on one thing: is
there an `onCancel`?

```ts
// Dismissable: renders a ✕ button, Escape works.
new DeclarativeForm({ fields, onConfirm, onCancel: () => {} });

// Not dismissable: no ✕, Escape is ignored.
new DeclarativeForm({ fields, onConfirm });
```

There is no separate option for this. Without a cancel handler there would be
nothing sensible to do when the user closes the dialog, so the library does not
offer that possibility at all.

## Stacking

If you open a dialog while another one is open, the two are **stacked**. The
dialog underneath is hidden — it gets the class `dl-modal-hidden` and is not
removed — and becomes visible again when the dialog above it closes.
<kbd>Escape</kbd> and <kbd>Enter</kbd> always apply to the topmost dialog only.

The dialog on top also gets `dl-modal-stacked` and `--dl-stack-depth`, the
number of dialogs underneath it. A dialog that becomes visible again gets
`dl-modal-restored`. Both classes mean the same thing: the backdrop was already
on the screen. If your own theme animates `.dl-modal` when it appears, skip that
animation for these two classes. Otherwise the page flashes while one backdrop
replaces the other.

With [the modern theme](/guide/theme), a stacked dialog shows the dialogs below
it as card edges that stick out above it: one edge when a single dialog is
below, two edges when there are more. Change their size with `--dl-stack-peek`
(how far they stick out, `8px`) and `--dl-stack-inset` (how much narrower each
edge is, `12px`), or remove them completely:

```css
.dl-modal-stacked .modal::before,
.dl-modal-stacked .modal::after {
  display: none;
}
```

The classic default stylesheet does not draw these edges at all.

Stacking is what makes [array entry dialogs](/guide/fields/array) work, and you
can use it directly:

```ts
const child = new DeclarativeForm({
  fields: [{ name: 'reason', displayName: 'Reason' }],
  onConfirm: (values) => applyReason(values['reason']),
  onCancel: () => {},
});

child.openInModal();
```

### Reading outward

A stacked dialog can read the values of the dialogs below it:

```ts
{
  name: 'detail',
  isActive: ({ stackData }) => stackData.some((d) => d['mode'] === 'expert'),
}
```

- **`ctx.stackData`** — the values of every open dialog, outermost first.
- **`ctx.parentData`** — the form directly around this one, for nested forms the
  library creates itself (array entries).

### Keyboard

- <kbd>Escape</kbd> closes the topmost dialog, if it has an `onCancel`.
- <kbd>Enter</kbd> confirms the topmost dialog **only if that dialog has exactly
  one button**. See [Buttons](/guide/buttons#the-enter-key).

The global key listener is added when the first dialog opens, and removed when
the last one closes. Simply importing the library registers nothing, which makes
it safe to use with server-side rendering.

## Hiding without closing

```ts
form.hide(); // adds dl-modal-hidden
form.show();
```

The stack uses this internally. It is occasionally useful when you need to give
the screen to something else for a moment.

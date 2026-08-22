# Asking for data

This is the one idea the rest of the library follows from. It is worth two
minutes before you read anything else.

## A form is a call, not a component

Every mainstream form library gives you a **component to mount**: React Hook
Form, Formik, VeeValidate, and every JSON-Schema renderer. The form becomes a
node in your tree. It needs a parent, a piece of `open` state, a close handler,
a submit handler, and a route from the answer back to the code that wanted it.

`declarative-forms` gives you a **function to call**:

```ts
const values = await ask(fields);
```

There is no component, no form state, no mount point, and no place in your tree
where the form has to live. You ask from wherever you are standing, and the
answer arrives where you asked.

### The API the browser already gave you

`window.prompt()` is the only form API with this shape, and it is the one every
developer finds obvious:

```ts
const name = prompt('Your name?');
```

You ask, the browser draws the dialog, you get the answer. No markup, no state,
no layout, no lifecycle, no cleanup. Its only flaw is that it asks for exactly
one string.

This library keeps that shape and removes the limit. Instead of a string, you
describe the **record** you want — its fields, their kinds, and the rules
between them — and you get a plain object back.

```ts
const name    = prompt('Your name?');                     // one string
const release = await ask([...]);                         // a whole record
```

## The `ask` function

`ask` ships with the library. Import it and call it:

```ts
import { ask } from 'declarative-forms';

const values = await ask(fields);
```

```ts
function ask(
  fields: readonly FieldDescriptor[],
  options?: AskOptions,
): Promise<FormValues | undefined>;
```

It opens the fields as a dialog and resolves with the values, or with
`undefined` if the user dismissed it. `options` is everything
[`DeclarativeForm`](/reference/api#new-declarativeform-options) accepts, minus
the three keys `ask` owns — `fields`, `onConfirm` and `onCancel` — plus two of
its own:

| Option        | Notes                                                         |
| ------------- | ------------------------------------------------------------- |
| `modal`       | Class names for the dialog chrome, as passed to `openInModal` |
| `dismissable` | `false` removes the ✕ and makes Escape a no-op                |

The promise settles only after the dialog is torn down and off the modal stack,
so the loop further down — ask, check, ask again — opens each new dialog on a
clean stack rather than stacking it on the one that just closed.

Declare your own `buttons` and the promise resolves once any button that closes
the dialog has finished its action. A `doNotCloseModal` button (a wizard's
"Next") leaves it pending, because it leaves the dialog open.

Try it. This runs the exact code shown:

<LiveForm mode="program" stage="top" open="Ask for a release">

```ts
import { ask } from 'declarative-forms';

// Pretend this is your API.
const fetchReviewers = async () => {
  await new Promise((r) => setTimeout(r, 400));
  return ['Ada Lovelace', 'Grace Hopper', 'Radia Perlman'];
};

// From here on it reads like any other async call.
const release = await ask(
  [
    { name: 'title', displayName: 'Release title', placeholder: 'Sunrise 2.0' },
    { name: 'notes', kind: 'textarea', displayName: 'What changed' },
    {
      name: 'reviewers',
      kind: 'select',
      multiple: true,
      displayName: 'Sign-off from',
      options: () => fetchReviewers(),
    },
  ],
  { confirmLabel: 'Publish' },
);

console.log(release ?? 'dismissed');
```

</LiveForm>

Nothing in that snippet describes rendering, layout, or state. The `options`
function is called for you, the dialog shows a loading state while it runs, and
the whole thing collapses to one `await`.

## Asking for a record you already have

Half the dialogs in an application are not asking for a new record but for a
changed one. `prompt()` took a second argument for exactly that, and so does
`ask`:

```ts
const updated = await ask(userFields, { defaultValues: user });
```

One field list serves both directions — see [Editing an object](/guide/editing)
for what gets seeded, and how to merge the answer back.

## Variations worth keeping

Once a form is a call, the useful shapes are just ordinary functions:

```ts
/** A yes/no that reads like `confirm()`. */
const confirmed = async (question: string) =>
  (await ask([{ name: 'ok', kind: 'message', message: question }])) !== undefined;

/** One value instead of a record. */
const askFor = async (field: FieldDescriptor) => (await ask([field]))?.[field.name];

const team = await askFor({
  name: 'team',
  kind: 'select',
  displayName: 'Team',
  options: () => fetchTeams(),
});
```

And they compose the way calls compose — loops, retries, early returns, all of
it plain control flow:

```ts
async function setUpProject() {
  const project = await ask(projectFields);
  if (!project) return; // user dismissed

  while (!(await isNameFree(project['name']))) {
    const retry = await ask(nameFields, { confirmLabel: 'Try again' });
    if (!retry) return;
    project['name'] = retry['name'];
  }

  return create(project);
}
```

Writing that against a mounted component means state for each step, an effect to
drive the sequence, and a way to pause the tree while the user thinks. Here it
is a function with a `while` loop.

## The payoff: dialogs that stack

This is what the call model gives you that a component model cannot without
work.

Because a form is a call and not a node, **opening one from inside another is
just calling it**. The library keeps the stack: the dialog underneath stays
open, dims behind the new one, and comes back when it closes.

And any field, in any dialog, can read the values of every dialog beneath it:

```ts
{
  name: 'recap',
  kind: 'message',
  // stackData[0] is the outermost dialog, still open behind this one.
  message: ({ data, stackData }) =>
    `Publishing ${stackData[0]['title']} ${data['when'] === 'now' ? 'now' : 'later'}.`,
}
```

No lifted state. No context provider. No prop drilling. There is no tree to
lift through — `stackData` is simply what the open dialogs currently hold.

- **`ctx.stackData`** — values of every open dialog, outermost first
- **`ctx.parentData`** — the form directly around this one, for nested forms the
  library creates itself ([array entries](/guide/fields/array))

The same mechanism is what makes list editing work: an
[`array` field](/guide/fields/array) opens one dialog per entry, which is the
natural shape for a record and an awkward one to build inline.

See [Modals & stacking](/guide/modals) for the full behaviour, including how
`Escape` and `Enter` pick their target.

## When to use the object API instead

`ask` throws away the form object, which is the right trade for a dialog you
open and forget. Keep the object when you need any of this:

| You need                                | Use                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| A form embedded in a page, not a dialog | [`appendInElement`](/guide/modals#embedded-in-the-page)                           |
| Live values as the user types           | [`subscribeOnInput`](/guide/getting-started#reading-values)                       |
| To set or read one field from code      | [`form.field(name)`](/guide/getting-started#controlling-a-single-field-from-code) |
| To close the form from elsewhere        | [`close` / `cancel` / `remove`](/guide/modals#closing)                            |
| Several buttons, or wizard steps        | [Buttons](/guide/buttons)                                                         |
| Values before the user does anything    | [`whenReady`](/guide/getting-started#waiting-for-setup)                           |

```ts
const form = new DeclarativeForm({ fields, onConfirm, onCancel });
form.openInModal();
```

Both styles are the same library. `ask` is the object API with the parts you
were not going to use folded away.

## Next

- [Getting started](/guide/getting-started) — install, and the object API in full
- [Field kinds](/guide/fields/) — the ten things you can put in `fields`
- [Reactivity](/guide/reactivity) — fields that depend on other fields
- [Modals & stacking](/guide/modals) — the stack in detail

# `computed`

A value derived from the rest of the form. It renders nothing visible — a
hidden input, with the wrapper marked `dl-form-hidden-field`.

```ts
{
  name: 'domain',
  kind: 'computed',
  compute: ({ data }) => String(data['email'] ?? '').split('@')[1] ?? '',
}
```

## Options

| Option    | Type               | Notes                  |
| --------- | ------------------ | ---------------------- |
| `compute` | `(ctx) => unknown` | Required. May be async |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## When it runs

`compute` runs **before a button action fires** — not on every keystroke. This
matters when the computation is expensive or hits the network: you get one run
per submission attempt rather than one per character.

```ts
{
  name: 'userId',
  kind: 'computed',
  compute: async ({ data }) => {
    const user = await User.findByEmail(String(data['email']));
    return user?.id ?? null;
  },
}
```

The button's loading state covers the wait, and the resolved value is present in
the values handed to your action.

To force a run yourself — before reading values outside a button, for
instance — call:

```ts
await form.updateComputedFields();
form.getValues()['domain'];
```

## Values keep their type

Unlike DOM-backed fields, a computed value is stored on the field rather than in
an attribute, so it is **not coerced to a string**:

```ts
{ name: 'count', kind: 'computed', compute: () => 0 }
form.getValues()['count']; // 0, the number — not '0'
```

It can be any type: a number, a boolean, `null`, an object. Before the first run
the value is `''`.

## Computed vs. custom vs. message

Three ways to derive something; pick by what you need:

| Need                                      | Use                                                |
| ----------------------------------------- | -------------------------------------------------- |
| A derived **value** in the submitted data | `computed`                                         |
| Derived **text shown** to the user        | [`message`](/guide/fields/message) with a function |
| Derived **UI** the user interacts with    | [`custom`](/guide/fields/custom)                   |

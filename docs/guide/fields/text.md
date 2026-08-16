# `text`

A single-line `<input>`. This is the **default kind** — omit `kind` entirely
and you get one.

<LiveForm>

```ts
{
  fields: [
    { name: 'title', displayName: 'Title' },
    { name: 'subtitle', displayName: 'Subtitle', placeholder: 'Optional' },
  ],
}
```

</LiveForm>

## Options

| Option         | Type               | Notes                                                                         |
| -------------- | ------------------ | ----------------------------------------------------------------------------- |
| `type`         | `string`           | Maps to the `type` attribute: `'password'`, `'number'`, `'email'`, `'url'`, … |
| `placeholder`  | `Reactive<string>` | Literal, or a function of the form context                                    |
| `autocomplete` | `string`           | Maps to the `autocomplete` attribute                                          |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## Input types

```ts
{ name: 'token', displayName: 'Access token', type: 'password' }
{ name: 'count', displayName: 'Copies', type: 'number' }
```

The value is always read back as a **string**, including for `type: 'number'`.
Convert at the boundary:

```ts
onConfirm: (values) => save({ copies: Number(values['count']) }),
```

## Reactive placeholders

A placeholder given as a function is recomputed on every form update, so it can
follow another field:

```ts
{
  name: 'locator',
  displayName: 'Locator',
  placeholder: ({ data }) =>
    data['locatorType'] === 'chapter' ? 'e.g. 4' : 'e.g. 12–18',
}
```

## Autocomplete

The `<form>` element is created with `autocomplete="off"`, so browser
autofill is disabled by default. Re-enable it per field when you actually want
it — for example on a genuine address or name field:

```ts
{ name: 'email', displayName: 'Email', autocomplete: 'email' }
```

## Values

`getValue()` returns the input's current string; the empty value is `''`.
Setting a non-string coerces it sensibly (`0` becomes `'0'`, `null` and
`undefined` become `''`, objects are JSON-encoded).

```ts
form.field('title')?.setValue('Field notes');
form.getValues()['title']; // 'Field notes'
```

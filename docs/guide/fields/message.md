# `message`

A paragraph of explanatory text. It is **presentational only** — it collects
nothing.

Type in the field below and watch the message follow it — then note that
`note` and `echo` never appear in the values.

<LiveForm>

```ts
{
  fields: [
    { name: 'pages', displayName: 'Pages', defaultValue: '12' },
    {
      name: 'note',
      kind: 'message',
      message: 'Changes take effect the next time the document is exported.',
    },
    {
      name: 'echo',
      kind: 'message',
      message: ({ data }) => `Exporting ${String(data['pages'] || 0)} pages.`,
    },
  ],
}
```

</LiveForm>

## Options

| Option    | Type                   | Notes                                                |
| --------- | ---------------------- | ---------------------------------------------------- |
| `message` | `Reactive<TextOrHtml>` | Required. Literal, or a function of the form context |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## It holds no value

::: warning Absent from `getValues()`
A `message` field does not appear in `getValues()` at all — not even as an
empty string. In v1 it contributed `''`, so code that iterated over form values
may need adjusting. See [Migrating from v1](/migration-v1).
:::

It still needs a `name`, because names are how fields are addressed
(`form.field('note')`) and must be unique.

## Reactive messages

Given a function, the message is re-rendered on every form update — useful for
live summaries and contextual warnings:

```ts
{
  name: 'costHint',
  kind: 'message',
  message: ({ data }) =>
    `Exporting ${String(data['pageCount'] ?? 0)} pages will use one credit.`,
}
```

Combine with `isActive` to show a warning only when it applies:

```ts
{
  name: 'warning',
  kind: 'message',
  message: 'This template ignores custom fonts.',
  isActive: ({ data }) => data['template'] === 'plain',
}
```

## Markup

Text by default; wrap in `html()` for markup:

```ts
import { html } from 'declarative-forms';

{
  name: 'help',
  kind: 'message',
  message: html('See the <a href="/docs">documentation</a> for details.'),
}
```

# `message`

A paragraph of explanatory text. It **only displays something**; it collects no
value.

Type in the field below and watch the message follow what you type. Note that
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

::: warning Not part of `getValues()`
A `message` field does not appear in `getValues()` at all — not even as an empty
string. In v1 it returned `''`, so code that loops over all values may need a
change. See [Migrating from v1](/migration-v1).
:::

It still needs a `name`, because the name is how you address a field
(`form.field('note')`), and names must be unique.

## Reactive messages

If the message is a function, it is rendered again on every form update. This is
useful for live summaries and for warnings that depend on the current values:

```ts
{
  name: 'costHint',
  kind: 'message',
  message: ({ data }) =>
    `Exporting ${String(data['pageCount'] ?? 0)} pages will use one credit.`,
}
```

Combine it with `isActive` to show a warning only when it applies:

```ts
{
  name: 'warning',
  kind: 'message',
  message: 'This template ignores custom fonts.',
  isActive: ({ data }) => data['template'] === 'plain',
}
```

## Markup

The message is plain text by default. Wrap it in `html()` if you need markup:

```ts
import { html } from 'declarative-forms';

{
  name: 'help',
  kind: 'message',
  message: html('See the <a href="/docs">documentation</a> for details.'),
}
```

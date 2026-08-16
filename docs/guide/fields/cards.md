# `cards`

A row of clickable option cards — a richer alternative to a
[`select`](/guide/fields/select) when there are few choices and each deserves a
description or an icon.

<LiveForm>

```ts
{
  fields: [
    {
      name: 'format',
      kind: 'cards',
      displayName: 'Export format',
      cards: [
        { value: 'pdf', content: html('<b>PDF</b><br>Print ready') },
        { value: 'html', content: html('<b>HTML</b><br>For the web') },
      ],
    },
  ],
}
```

</LiveForm>

::: tip Formerly `detailedOptions`
This kind was called `detailedOptions` in v1. The rendered DOM and CSS classes
are unchanged.
:::

## Options

| Option  | Type                                       | Notes    |
| ------- | ------------------------------------------ | -------- |
| `cards` | `{ value: string; content: TextOrHtml }[]` | Required |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## Card content

`content` is text by default. Since cards usually want a heading plus a line of
description, this is one of the places `html()` earns its keep:

```ts
cards: [
  {
    value: 'free',
    content: html('<b>Free</b><br>Up to 3 documents'),
  },
  {
    value: 'pro',
    content: html('<b>Pro</b><br>Unlimited documents and priority export'),
  },
];
```

Only wrap markup you control. See [Text & HTML safety](/guide/security).

## Selection

Clicking a card selects it: it gains an `active` class and any previous
selection loses it. Exactly one card can be selected.

```ts
form.field('format')?.setValue('pdf');
form.getValues()['format']; // 'pdf'
```

Setting a value that matches no card is ignored rather than throwing, so a
stale stored value cannot break the form.

## When to use cards over a select

| Situation                                 | Better choice                        |
| ----------------------------------------- | ------------------------------------ |
| 2–4 options, each needing explanation     | `cards`                              |
| Many options, or loaded async             | [`select`](/guide/fields/select)     |
| Options the user should be able to filter | [`select`](/guide/fields/select)     |
| A yes/no decision                         | [`checkbox`](/guide/fields/checkbox) |

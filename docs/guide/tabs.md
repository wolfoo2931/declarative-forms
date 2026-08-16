# Tabs

Give fields a `tab` and the dialog grows a tab strip. There is nothing else to
configure — tabs are derived from the fields, not declared separately.

```ts
new DeclarativeForm({
  fields: [
    { name: 'title', displayName: 'Title', tab: 'General' },
    { name: 'author', displayName: 'Author', tab: 'General' },
    { name: 'template', kind: 'select', options: templates, tab: 'Export' },
  ],
  onCancel: () => {},
}).openInModal();
```

## Ordering

Tabs appear in **field declaration order**: the first field mentioning a tab
fixes that tab's position. Reordering fields reorders the strip.

## Empty tabs disappear

A tab is only rendered if at least one of its fields is currently
[active](/guide/reactivity#isactive-conditional-fields). This is the main reason
tabs are derived rather than declared — a conditional section vanishes from the
strip instead of opening onto an empty panel.

```ts
{
  name: 'apiKey',
  tab: 'Advanced',
  isActive: ({ data }) => data['mode'] === 'expert',
}
// The "Advanced" tab only exists while mode === 'expert'.
```

If the active tab disappears, the form falls back to the first remaining tab.

## A field in several tabs

`tab` accepts an array:

```ts
{ name: 'note', displayName: 'Note', tab: ['General', 'Export'] }
```

The field is shown whenever either tab is active.

## Computed tabs

`tab` is [reactive](/guide/fields/#reactive-t-literal-or-function), so a field
can move between tabs:

```ts
{
  name: 'preview',
  tab: ({ data }) => (data['mode'] === 'edit' ? 'Edit' : 'Preview'),
}
```

::: tip Static tabs also become a CSS class
A statically declared `tab` puts its name — whitespace stripped — on the field
wrapper as a class, so `tab: 'Reference Sources'` yields
`.ReferenceSources`. This is stamped at construction, so a _computed_ tab
cannot contribute one. See the [DOM contract](/dom-contract).
:::

## Fields with no tab

A field without a `tab` is shown in **every** tab. That makes it the natural
place for a title field or a summary message that should stay visible as the
user moves around.

## Reading and setting the active tab

The active tab is always part of the form values:

```ts
form.getValues()['activeTab']; // 'General'
```

Switch programmatically:

```ts
form.setActiveTab('Export');
```

Called with **no argument**, `setActiveTab()` re-applies the current tab. That
is useful as a resync after you have changed things underneath the form:

```ts
form.setActiveTab();
```

Selecting a tab that is not currently rendered is a no-op rather than an error,
so a stale tab name cannot break the dialog.

## Wizards

Because tab buttons are ordinary sibling elements in `.tabWrapper`, a
Back/Next wizard is a few lines. This is the pattern used in `examples/main.ts`:

```ts
const modal = form.openInModal();

function step(delta: number): void {
  const tabs = [...modal.querySelectorAll('.dl-tab-btn')];
  const index = tabs.findIndex((t) => t.classList.contains('active'));
  (tabs[index + delta] as HTMLElement | undefined)?.click();
}
```

Wire it to buttons that do not close the dialog:

```ts
buttons: {
  Back: { id: 'backBtn', class: 'secondary', doNotCloseModal: true, action: () => step(-1) },
  Next: { id: 'nextBtn', doNotCloseModal: true, action: () => step(1) },
  Export: { id: 'exportBtn', isActive: async ({ data }) => isComplete(data), action: save },
}
```

See [Buttons](/guide/buttons).

## Styling

Tab buttons carry `.dl-tab-btn`, the active one adds `.active`, and any tab the
user has visited keeps `.seen` — handy for wizard progress indicators.

```css
.dl-tab-btn.seen:not(.active) {
  opacity: 0.7;
}
```

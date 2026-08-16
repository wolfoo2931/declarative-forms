# Tabs

Give your fields a `tab` and the dialog gets a tab bar. There is nothing else to
configure: the tabs come from the fields, and are not declared separately.

Tabs are only rendered in a dialog, so this demo opens one. Note that the third
tab appears only after you check the box: a tab whose fields are all inactive is
not shown.

<LiveForm mode="modal" open="Open a tabbed dialog">

```ts
{
  fields: [
    { name: 'title', displayName: 'Title', tab: 'General', defaultValue: 'Report' },
    { name: 'author', displayName: 'Author', tab: 'General' },
    {
      name: 'expert',
      kind: 'checkbox',
      label: 'Show advanced options',
      tab: 'General',
    },
    {
      name: 'template',
      kind: 'select',
      displayName: 'Template',
      options: ['Plain', 'Academic'],
      tab: 'Export',
    },
    {
      name: 'apiKey',
      displayName: 'API key',
      tab: 'Advanced',
      isActive: ({ data }) => data['expert'] === true,
    },
  ],
}
```

</LiveForm>

## Ordering

Tabs appear **in the order in which the fields are declared**. The first field
that names a tab decides that tab's position. If you reorder the fields, the tab
bar changes with them.

## Empty tabs disappear

A tab is only rendered when at least one of its fields is currently
[active](/guide/reactivity#isactive-conditional-fields). This is the main reason
why tabs come from the fields instead of being declared: a conditional section
disappears from the tab bar, instead of opening an empty page.

```ts
{
  name: 'apiKey',
  tab: 'Advanced',
  isActive: ({ data }) => data['mode'] === 'expert',
}
// The "Advanced" tab only exists while mode === 'expert'.
```

If the tab that is currently open disappears, the form switches to the first
tab that is left.

## A field in several tabs

`tab` accepts an array:

```ts
{ name: 'note', displayName: 'Note', tab: ['General', 'Export'] }
```

The field is then shown in both tabs.

## Computed tabs

`tab` is [reactive](/guide/fields/#reactive-t-literal-or-function), so a field
can move from one tab to another:

```ts
{
  name: 'preview',
  tab: ({ data }) => (data['mode'] === 'edit' ? 'Edit' : 'Preview'),
}
```

::: tip A fixed tab name also becomes a CSS class
If `tab` is a fixed string, its name — with the spaces removed — is added to the
field wrapper as a class. So `tab: 'Reference Sources'` gives you
`.ReferenceSources`. The class is written when the form is built, so a tab that
is _calculated_ by a function cannot add one. See the
[DOM contract](/dom-contract).
:::

## Fields with no tab

A field without a `tab` is shown in **every** tab. This is the right choice for
a title field, or for a summary message that should stay visible while the user
moves between tabs.

## Reading and setting the active tab

The active tab is always part of the form values:

```ts
form.getValues()['activeTab']; // 'General'
```

Switch programmatically:

```ts
form.setActiveTab('Export');
```

Called **without an argument**, `setActiveTab()` applies the current tab again.
This is useful to bring the form back in sync after you have changed something
behind its back:

```ts
form.setActiveTab();
```

Selecting a tab that is not currently rendered does nothing, and is not an
error, so an old tab name cannot break the dialog.

## Wizards

The tab buttons are ordinary sibling elements inside `.tabWrapper`, so a
Back/Next wizard takes only a few lines. This is the pattern used in
`examples/main.ts`:

```ts
const modal = form.openInModal();

function step(delta: number): void {
  const tabs = [...modal.querySelectorAll('.dl-tab-btn')];
  const index = tabs.findIndex((t) => t.classList.contains('active'));
  (tabs[index + delta] as HTMLElement | undefined)?.click();
}
```

Then connect it to buttons that do not close the dialog:

```ts
buttons: {
  Back: { id: 'backBtn', class: 'secondary', doNotCloseModal: true, action: () => step(-1) },
  Next: { id: 'nextBtn', doNotCloseModal: true, action: () => step(1) },
  Export: { id: 'exportBtn', isActive: async ({ data }) => isComplete(data), action: save },
}
```

See [Buttons](/guide/buttons).

## Styling

Every tab button has the class `.dl-tab-btn`. The current one also has
`.active`, and every tab the user has visited keeps `.seen`, which is useful for
showing progress in a wizard.

```css
.dl-tab-btn.seen:not(.active) {
  opacity: 0.7;
}
```

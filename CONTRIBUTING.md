# Contributing

Thanks for taking a look. Bug reports, documentation fixes and pull requests
are all welcome.

## Getting set up

```bash
git clone https://github.com/wolfoo2931/declarative-forms.git
cd declarative-forms
npm ci
npx playwright install chromium   # for the end-to-end suite
```

## The commands

| Command              | What it does                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `npm run example`    | Vite playground at `examples/` — the fastest way to see a change                          |
| `npm test`           | Unit and component tests (Vitest + happy-dom)                                             |
| `npm run test:watch` | The same, in watch mode                                                                   |
| `npm run test:e2e`   | Browser tests (Playwright): the library against the playground, plus every live docs demo |
| `npm run typecheck`  | `tsc --noEmit`, strict                                                                    |
| `npm run lint`       | ESLint, type-aware                                                                        |
| `npm run format`     | Prettier                                                                                  |
| `npm run build`      | ESM + CJS + type declarations, via tsup                                                   |
| `npm run docs:dev`   | The documentation site                                                                    |

Before opening a pull request:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Two things that are easy to get wrong

### The DOM is a public contract

Class names, element structure and `#dl-form-field-wrapper-for-<name>` ids are
**frozen**. Downstream projects style them and write end-to-end selectors
against them, so changing the rendered output breaks real users even when every
test passes.

`test/domContract.test.ts` enforces this. **If it fails, you have changed the
contract** — that is a deliberate decision requiring a major version, not a test
to update. See [`docs/dom-contract.md`](docs/dom-contract.md).

Adding attributes (ARIA, `data-*`) is fine; it does not break selectors.

### Fields are built in two phases

`Field` subclasses must assign DOM references inside `createControl()`, not in
class-field initialisers. Under ES2022 semantics, subclass initialisers run
_after_ `super()`, so anything assigned during construction would be reset to
`undefined`. This is why `FieldRegistry` calls `build()` as a separate step.

## Project layout

```
src/core/        DeclarativeForm, FormModel, UpdateScheduler, FieldRegistry
src/fields/      one class per field kind, all extending Field
src/ui/          ModalStack, ModalView, TabBar, ButtonBar, tooltips
src/components/  the <dl-select> web component
src/types/       descriptor and option types
styles/          declarative-forms.css (the default) and classic.css
test/            Vitest suites
e2e/             Playwright suites
examples/        the playground, also the e2e fixture
docs/            the VitePress site
```

## Adding a field kind

Built-in kinds each need: a descriptor interface in `src/types/descriptors.ts`,
a class in `src/fields/`, an entry in `defaultFieldRegistry`, an export from
`src/index.ts`, a docs page under `docs/guide/fields/`, and tests. See
[Custom field kinds](docs/guide/custom-fields.md) for the class shape.

## Tests

- **Unit and component** tests use Vitest with happy-dom. Prefer these.
- **End-to-end** tests are for behaviour a DOM emulator cannot check honestly:
  real focus and blur, layout-driven positioning, native click dispatch.
- Fixing a bug? **Add a regression test that fails without the fix.** Every
  defect carried over from v1 has one.

Documentation pages carry **live demos**: `<LiveForm>` evaluates the exact code
block shown on the page, so the snippet and the running form cannot drift apart.
The trade-off is that a broken snippet only fails in a browser — `e2e/docs.spec.ts`
loads every demo page and asserts each one compiles and mounts, so run
`npm run test:e2e` after editing a demo.

## Smoke-testing a published release

The suites above run against the sources. They say nothing about whether the
**tarball on npm** is usable: a missing file in `files`, a wrong path in
`exports` or a stylesheet that did not get packed all pass every test and still
break the first person who installs the package.

So after a release, install it the way a newcomer would. Everything below is
throwaway — a scratch directory outside the repo, deleted at the end.

```bash
mkdir /tmp/df-smoke && cd /tmp/df-smoke
npm init -y
npm pkg set type=module scripts.dev=vite
npm install declarative-forms@alpha   # @latest once 2.x is stable
npm install -D vite
```

Two files. `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>declarative-forms smoke test</title>
  </head>
  <body>
    <h1>declarative-forms smoke test</h1>
    <button id="open">Open the dialog</button>
    <pre id="out">values will appear here</pre>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

And `main.js`. It is deliberately not minimal: it touches the package's two
entry points, the web component, async options, reactivity and the values
subscription, so one run covers the parts a bad package would break.

```js
import { DeclarativeForm } from 'declarative-forms';
import 'declarative-forms/styles.css';

const out = document.querySelector('#out');

document.querySelector('#open').addEventListener('click', () => {
  const form = new DeclarativeForm({
    fields: [
      { name: 'name', displayName: 'Name', defaultValue: 'Ada' },
      {
        name: 'team',
        kind: 'select',
        displayName: 'Team',
        // Async options: exercises the loading path and <dl-select>.
        options: () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(['Platform', 'Design', 'Support']), 300),
          ),
        defaultValue: 'Platform',
      },
      { name: 'onCall', kind: 'checkbox', label: 'On call this week' },
      {
        name: 'phone',
        displayName: 'Phone',
        // Reactivity: appears only while the checkbox is ticked.
        isActive: ({ data }) => data.onCall === true,
      },
    ],
    onConfirm: (values) => console.log('confirmed', values),
    onCancel: () => console.log('cancelled'),
  });

  form.subscribeOnInput((values) => {
    out.textContent = JSON.stringify(values, null, 2);
  });

  form.openInModal();
});
```

Then:

```bash
npm run dev     # http://localhost:5173
```

Open the page with the console visible and check, in order:

1. **It loads.** No 404 and no "failed to resolve import" — that is `exports`
   and `files` doing their job.
2. **The dialog is styled.** Blurred backdrop, rounded card, filled teal `OK`
   button. Unstyled fields mean `declarative-forms/styles.css` did not ship.
3. **It follows the OS.** Flip the system appearance to dark and reload: the
   dialog follows. This is the default stylesheet — the one a newcomer gets —
   so a light-only dialog means `styles.css` resolved to `classic.css`.
4. **Defaults arrive.** `Name` shows `Ada`, `Team` settles on `Platform` after
   the fake 300 ms load.
5. **The select opens.** Clicking the chevron lists all three teams — the
   `<dl-select>` component injects its own CSS, so this is the one visual check
   the stylesheet cannot cover.
6. **The checkbox takes focus.** <kbd>Tab</kbd> to _On call this week_ and press
   <kbd>Space</kbd>. Only the default stylesheet makes the input focusable, so
   this is the second check that the right file is being served.
7. **Reactivity works.** Ticking _On call this week_ reveals `Phone`; unticking
   it removes the field _and_ drops `phone` from the panel.
8. **Values flow.** The `<pre>` updates as you type, and `OK` logs
   `confirmed {…}` to the console.

Then swap the import for the classic look and reload once, which is the only
check that the other two export paths still resolve:

```js
import 'declarative-forms/classic.css'; // and, once each, 'declarative-forms/assets/default.css'
```

The dialog should turn square-cornered, fixed-width and light-only. Put
`styles.css` back afterwards.

The CJS entry and the packed metadata are worth one line each:

```bash
node -e "console.log(typeof require('declarative-forms').DeclarativeForm)"  # function
node -p "require('declarative-forms/package.json').version"                 # the version you just released
```

Clean up with `cd .. && rm -rf df-smoke`.

## Commit messages

Conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) are
used but not enforced. Explain _why_ in the body; the diff already shows what.

## Reporting bugs

Please include the library version, a minimal field descriptor that reproduces
the problem, what you expected, and what happened. A failing test case is the
most useful thing you can attach.

Accessibility gaps are tracked in [`docs/accessibility.md`](docs/accessibility.md) —
please check there first, since the known ones are already scheduled.

## Licence

By contributing you agree that your contributions are licensed under the
project's [MIT licence](LICENSE).

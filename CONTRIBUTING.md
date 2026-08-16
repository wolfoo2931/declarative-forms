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

| Command              | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `npm run example`    | Vite playground at `examples/` — the fastest way to see a change |
| `npm test`           | Unit and component tests (Vitest + happy-dom)                    |
| `npm run test:watch` | The same, in watch mode                                          |
| `npm run test:e2e`   | Browser tests (Playwright), driven against the playground        |
| `npm run typecheck`  | `tsc --noEmit`, strict                                           |
| `npm run lint`       | ESLint, type-aware                                               |
| `npm run format`     | Prettier                                                         |
| `npm run build`      | ESM + CJS + type declarations, via tsup                          |
| `npm run docs:dev`   | The documentation site                                           |

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
styles/          the shipped stylesheet
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

Documentation examples should be lifted from `examples/main.ts` or the test
suite wherever possible, so published snippets are known to run.

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

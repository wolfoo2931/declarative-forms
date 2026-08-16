## What this changes

<!-- And why. The diff already shows the what; the why is the useful part. -->

## Checklist

- [ ] `npm run typecheck && npm run lint && npm test && npm run build` pass
- [ ] Tests added or updated (a regression test, if this fixes a bug)
- [ ] Documentation updated, if behaviour or the API changed

## DOM contract

- [ ] This does not change the rendered DOM, **or** `test/domContract.test.ts`
      was updated deliberately and the change is described below

<!--
Class names, element structure and ids are a frozen public contract — consumers
style them and select on them. Additive attributes (ARIA, data-*) are fine.
See docs/dom-contract.md.
-->

/**
 * Module shims for the documentation build.
 *
 * Vite resolves single-file components and stylesheet imports; plain `tsc`,
 * which is what `npm run typecheck` runs, needs to be told they exist.
 */

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}

declare module '*.css';

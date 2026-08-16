import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'declarative-forms',
  description:
    'Ask the user for an object, the way prompt() asks for a string. A form is a function you call, not a component you mount. Zero dependencies, framework agnostic, with async options, cross-field reactivity, tabs and stacked dialogs.',

  // Published to GitHub Pages under /declarative-forms/.
  base: process.env.DOCS_BASE ?? '/declarative-forms/',
  cleanUrls: true,
  lastUpdated: true,

  head: [['meta', { name: 'theme-color', content: '#12968f' }]],

  themeConfig: {
    nav: [
      { text: 'Asking for data', link: '/guide/asking-for-data' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Fields', link: '/guide/fields/' },
      { text: 'Reference', link: '/reference/api' },
      { text: 'Migrate from v1', link: '/migration-v1' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What it is', link: '/' },
          { text: 'Asking for data', link: '/guide/asking-for-data' },
          { text: 'Getting started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Fields',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/guide/fields/' },
          { text: 'text', link: '/guide/fields/text' },
          { text: 'textarea', link: '/guide/fields/textarea' },
          { text: 'select', link: '/guide/fields/select' },
          { text: 'checkbox', link: '/guide/fields/checkbox' },
          { text: 'message', link: '/guide/fields/message' },
          { text: 'file', link: '/guide/fields/file' },
          { text: 'computed', link: '/guide/fields/computed' },
          { text: 'cards', link: '/guide/fields/cards' },
          { text: 'custom', link: '/guide/fields/custom' },
          { text: 'array', link: '/guide/fields/array' },
        ],
      },
      {
        text: 'Guide',
        items: [
          { text: 'Reactivity', link: '/guide/reactivity' },
          { text: 'Tabs', link: '/guide/tabs' },
          { text: 'Modals & stacking', link: '/guide/modals' },
          { text: 'Buttons', link: '/guide/buttons' },
          { text: 'Arrays & suggestions', link: '/guide/arrays' },
          { text: 'Themes', link: '/guide/theme' },
          { text: 'Theming tokens', link: '/guide/theming' },
          { text: 'Text & HTML safety', link: '/guide/security' },
          { text: 'Custom field kinds', link: '/guide/custom-fields' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/reference/api' },
          // VitePress renders sidebar labels with `v-html`, so a literal
          // `<dl-select>` would be upgraded into an actual (empty) combobox.
          { text: '&lt;dl-select&gt;', link: '/reference/dl-select' },
          { text: 'DOM contract', link: '/dom-contract' },
          { text: 'Accessibility', link: '/accessibility' },
        ],
      },
      {
        text: 'Upgrading',
        items: [{ text: 'Migrating from v1', link: '/migration-v1' }],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/wolfoo2931/declarative-forms' },
    ],

    editLink: {
      pattern: 'https://github.com/wolfoo2931/declarative-forms/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: { provider: 'local' },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Oliver Wolf',
    },
  },
});

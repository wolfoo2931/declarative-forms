import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { watchEffect } from 'vue';
import type { Theme } from 'vitepress';

// The default stylesheet, so the demos show what the library looks like out of
// the box. Swap for `classic.css` to preview the classic look.
import '../../../styles/declarative-forms.css';
import './demo.css';

import LiveForm from './LiveForm.vue';

export default {
  extends: DefaultTheme,

  /**
   * Follow the site's own light/dark switch.
   *
   * The theme picks a mode from `prefers-color-scheme` on its own; mirroring
   * VitePress's toggle onto `data-dl-theme` is the documented way to override
   * that, and doubles as a demonstration of the escape hatch.
   */
  setup() {
    const { isDark } = useData();

    watchEffect(() => {
      if (typeof document === 'undefined') return;
      document.documentElement.dataset['dlTheme'] = isDark.value ? 'dark' : 'light';
    });
  },

  enhanceApp({ app }) {
    app.component('LiveForm', LiveForm);
  },
} satisfies Theme;

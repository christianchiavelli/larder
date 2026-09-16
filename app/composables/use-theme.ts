import { useDark, useToggle } from '@vueuse/core'

/**
 * The storage key is named explicitly because the inline script in app.vue reads
 * the same key before Vue exists.
 */
export const THEME_STORAGE_KEY = 'larder-theme'

export function useTheme() {
  const isDark = useDark({
    storageKey: THEME_STORAGE_KEY,
    selector: 'html',
    valueDark: 'dark',
    valueLight: '',
    // With no stored choice, follow the operating system. An explicit toggle
    // writes the key and takes precedence from then on.
    initialValue: 'auto',
  })

  return { isDark, toggle: useToggle(isDark) }
}

/**
 * Blocking script in `head`: the class lives on `<html>` and the server cannot
 * know the visitor's theme, so waiting for hydration means a white flash.
 * localStorage throws outright in a Safari private window, hence the try/catch.
 */
export const THEME_BOOTSTRAP_SCRIPT = `
(function(){try{
var s=localStorage.getItem('${THEME_STORAGE_KEY}');
var d=s==='dark'||((!s||s==='auto')&&matchMedia('(prefers-color-scheme: dark)').matches);
if(d)document.documentElement.classList.add('dark');
}catch(e){}})()
`
  .replace(/\n/g, '')
  .trim()

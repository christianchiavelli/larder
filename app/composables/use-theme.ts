import { useDark, useToggle } from '@vueuse/core'

/**
 * Light/dark preference.
 *
 * The storage key is named explicitly rather than left to the library default,
 * because the inline script in app.vue reads the same key before Vue exists.
 * A rename on one side and not the other would not break anything visibly, it
 * would just quietly bring the flash of the wrong theme back.
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
 * Applies the stored theme before first paint.
 *
 * Has to run as a blocking script in `head`. The class lives on `<html>`, and
 * the server cannot know which theme to render because the preference is in the
 * visitor's localStorage. Waiting for hydration means a dark-mode user gets a
 * full white page first, which is both unpleasant and, at night, briefly
 * blinding.
 *
 * Kept deliberately small and dependency-free: it runs on the critical path of
 * every page load. The try/catch is not defensive padding, localStorage throws
 * outright in a Safari private window.
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

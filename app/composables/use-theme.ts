import { useDark, useToggle } from '@vueuse/core'

export const THEME_STORAGE_KEY = 'larder-theme'

/**
 * Applies a theme with every transition held back, so the colours change at once rather than
 * each easing. VueUse does this with an inline <style>, which the Content-Security-Policy
 * refuses, so a class from the stylesheet does it here.
 */
export function switchAtOnce(apply: () => void): void {
  const root = document.documentElement
  root.classList.add('theme-switching')
  apply()
  // Reading a style settles the new colours before the transitions are let back.
  void getComputedStyle(root).color
  root.classList.remove('theme-switching')
}

export function useTheme() {
  const isDark = useDark({
    storageKey: THEME_STORAGE_KEY,
    selector: 'html',
    valueDark: 'dark',
    valueLight: '',
    initialValue: 'auto',
    disableTransition: false,
    onChanged: (_isDark, apply, mode) =>
      import.meta.client ? switchAtOnce(() => apply(mode)) : apply(mode),
  })

  return { isDark, toggle: useToggle(isDark) }
}

export const THEME_BOOTSTRAP_SCRIPT = `
(function(){try{
var s=localStorage.getItem('${THEME_STORAGE_KEY}');
var d=s==='dark'||((!s||s==='auto')&&matchMedia('(prefers-color-scheme: dark)').matches);
if(d)document.documentElement.classList.add('dark');
}catch(e){}})()
`
  .replace(/\n/g, '')
  .trim()

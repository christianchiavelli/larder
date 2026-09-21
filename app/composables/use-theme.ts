import { useDark, useToggle } from '@vueuse/core'

export const THEME_STORAGE_KEY = 'larder-theme'

export function useTheme() {
  const isDark = useDark({
    storageKey: THEME_STORAGE_KEY,
    selector: 'html',
    valueDark: 'dark',
    valueLight: '',
    initialValue: 'auto',
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

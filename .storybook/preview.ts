import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook-vue/nuxt'

/** The toolbar's themes, and the class `useTheme` sets on `<html>` for each. */
const THEMES = { Light: '', Dark: 'dark' }

const preview: Preview = {
  // A docs page for every component: its stories, their descriptions and its props.
  tags: ['autodocs'],
  decorators: [withThemeByClassName({ themes: THEMES, defaultTheme: 'Light' })],
  // The decorator switches the class in an effect, once the story has drawn in
  // the other theme. Switched first, no frame shows the wrong one, and axe never
  // measures text still on its way between the two.
  beforeEach: ({ globals }) => {
    document.documentElement.classList.toggle(THEMES.Dark, globals.theme === 'Dark')
  },
  parameters: {
    // An axe violation fails the story's check, in the Storybook UI and in CI alike.
    a11y: { test: 'error' },
    // The page colour comes from the theme, as it does in the app.
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
}

export default preview

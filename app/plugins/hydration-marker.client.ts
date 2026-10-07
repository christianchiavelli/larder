// Marks the page once it has hydrated. Until then a click or a keystroke reaches nothing, and
// the page then puts back what the server rendered, so the end-to-end tests wait for the mark.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hooks.hookOnce('app:suspense:resolve', () => {
    document.documentElement.dataset.hydrated = ''
  })
})

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return
  if (!to.meta.viewTransition) return
  if (!document.startViewTransition) return

  to.meta.pageTransition = false
})

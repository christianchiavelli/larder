/**
 * Connects to where the catalogue keeps its photos as soon as the page's head arrives, on the
 * pages that show them, instead of once the browser reaches the first photo in the body.
 */
export function usePhotoPreconnect() {
  const { imageOrigin } = useRuntimeConfig().public.openFoodFacts
  useHead({ link: [{ key: 'photo-origin', rel: 'preconnect', href: imageOrigin }] })
}

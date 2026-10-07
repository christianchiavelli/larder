import { compressResponse } from '~~/server/utils/compression'

// The app is served by this one Node process, with no proxy or CDN in front to compress for
// it. Put one there and this can go.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', compressResponse)
})

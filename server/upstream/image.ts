import type { ProductImage } from '#shared/domain/product'
import { looseString } from './coerce'

/**
 * Maps upstream's image URLs into the domain's image.
 *
 * Shared by both mappers because both upstream services publish the same six
 * fields, and the rule for reading them is the part worth stating once.
 */

/**
 * The six fields, as a schema fragment both upstream services spread into
 * their own object. Declaring them twice is how one service quietly stops
 * reading a width the other one does.
 */
export const upstreamImageFields = {
  image_front_thumb_url: looseString,
  image_front_small_url: looseString,
  image_front_url: looseString,
  image_thumb_url: looseString,
  image_small_url: looseString,
  image_url: looseString,
}

type UpstreamImageFields = {
  [K in keyof typeof upstreamImageFields]?: string | null
}

/** Upstream occasionally stores a bare path or a malformed entry. */
function asUrl(candidate: string | null | undefined): string | null {
  return candidate && URL.canParse(candidate) ? candidate : null
}

/**
 * The front photograph at each width upstream publishes.
 *
 * `image_front_*` is the packaging shot. `image_*` is whichever photograph
 * happens to be first, which on a community-edited catalogue is often a
 * barcode or an ingredients panel. So the front one leads and the other backs
 * it up, decided per width, because a product can have a front thumbnail and
 * no front original.
 *
 * Null when no width resolves at all, so a caller renders its placeholder
 * instead of an image element pointing at nothing.
 */
export function mapProductImage(raw: UpstreamImageFields): ProductImage {
  const image = {
    thumb: asUrl(raw.image_front_thumb_url ?? raw.image_thumb_url),
    small: asUrl(raw.image_front_small_url ?? raw.image_small_url),
    large: asUrl(raw.image_front_url ?? raw.image_url),
  }

  return image.thumb === null && image.small === null && image.large === null ? null : image
}

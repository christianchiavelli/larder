import type { ProductImage } from '#shared/domain/product'
import { looseString } from './coerce'

/**
 * Declared once and spread into both upstream schemas: declaring them twice is
 * how one service quietly stops reading a width the other does.
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
 * `image_front_*` is the packaging shot; `image_*` is whichever photograph is
 * first, often a barcode or an ingredients panel. Decided per width, since a
 * product can have a front thumbnail and no front original.
 *
 * The two services disagree about who has a photograph: a barcode can carry a
 * front image on the v2 API and no image field on the search index, so a row
 * falls back while the page it opens shows a picture. The URLs carry a revision
 * number, so they cannot be derived from a barcode.
 */
export function mapProductImage(raw: UpstreamImageFields): ProductImage {
  const image = {
    thumb: asUrl(raw.image_front_thumb_url ?? raw.image_thumb_url),
    small: asUrl(raw.image_front_small_url ?? raw.image_small_url),
    large: asUrl(raw.image_front_url ?? raw.image_url),
  }

  return image.thumb === null && image.small === null && image.large === null ? null : image
}

import type { ProductImage } from '#shared/domain/product'
import { looseString } from './coerce'

export const upstreamImageFields = {
  image_front_thumb_url: looseString,
  image_front_small_url: looseString,
  image_front_url: looseString,
  image_thumb_url: looseString,
  image_small_url: looseString,
  image_url: looseString,
}

export const IMAGE_FIELDS = Object.keys(upstreamImageFields)

type UpstreamImageFields = {
  [K in keyof typeof upstreamImageFields]?: string | null
}

function asUrl(candidate: string | null | undefined): string | null {
  return candidate && URL.canParse(candidate) ? candidate : null
}

export function mapProductImage(raw: UpstreamImageFields): ProductImage {
  const image = {
    thumb: asUrl(raw.image_front_thumb_url ?? raw.image_thumb_url),
    small: asUrl(raw.image_front_small_url ?? raw.image_small_url),
    large: asUrl(raw.image_front_url ?? raw.image_url),
  }

  return image.thumb === null && image.small === null && image.large === null ? null : image
}

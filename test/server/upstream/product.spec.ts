import { describe, expect, it } from 'vitest'
import { mapProductDetail, upstreamProductResponseSchema } from '~~/server/upstream/product'

const PRODUCT_BASE = 'https://world.openfoodfacts.org'

/** Trimmed from the live v2 response for barcode 3017620425035. */
const RAW_NUTELLA = {
  code: '3017620425035',
  product_name: 'Nutella',
  product_name_en: 'Nutella',
  // The v2 API joins brands into one string. The search API sends an array.
  brands: 'Nutella, FERRERO FRANCE COMMERCIALE',
  categories_tags: ['en:breakfasts', 'en:spreads', 'en:sweet-spreads'],
  countries_tags: ['en:france'],
  labels_tags: ['en:palm-oil'],
  additives_tags: ['en:e322'],
  nutriscore_grade: 'e',
  nova_group: 4,
  image_front_url: 'https://images.openfoodfacts.org/images/products/front_en.400.jpg',
  nutriments: { 'energy-kcal_100g': 539, sugars_100g: 56.3, salt_100g: 0.107 },
  quantity: '400 g',
  serving_size: '15 g',
  ingredients_text: 'Sugar, palm oil, hazelnuts',
  ingredients_n: 8,
  last_modified_t: 1757793319,
}

function parse(raw: Record<string, unknown>) {
  const result = upstreamProductResponseSchema.parse({ status: 1, product: raw })
  return mapProductDetail(result.product!, PRODUCT_BASE)
}

describe('mapProductDetail', () => {
  it('maps a complete record', () => {
    const product = parse(RAW_NUTELLA)

    expect(product.code).toBe('3017620425035')
    expect(product.name).toBe('Nutella')
    expect(product.nutriScore).toBe('e')
    expect(product.novaGroup).toBe(4)
    expect(product.quantity).toBe('400 g')
    expect(product.ingredientCount).toBe(8)
  })

  it('splits the comma-joined brands string this endpoint uses', () => {
    expect(parse(RAW_NUTELLA).brands).toEqual(['Nutella', 'FERRERO FRANCE COMMERCIALE'])
  })

  it('humanises every taxonomy list', () => {
    const product = parse(RAW_NUTELLA)

    expect(product.categories.at(-1)?.label).toBe('Sweet spreads')
    expect(product.countries[0]?.label).toBe('France')
    expect(product.additives[0]?.id).toBe('en:e322')
  })

  it('builds a provenance link back to the upstream record', () => {
    expect(parse(RAW_NUTELLA).sourceUrl).toBe(`${PRODUCT_BASE}/product/3017620425035`)
  })

  it('converts the unix modification time to ISO', () => {
    expect(parse(RAW_NUTELLA).lastModified).toBe(new Date(1757793319 * 1000).toISOString())
  })

  it('reports no modification time rather than the unix epoch', () => {
    expect(parse({ ...RAW_NUTELLA, last_modified_t: 0 }).lastModified).toBeNull()
  })

  /**
   * The shape most of the catalogue is actually in: a barcode, a name, and
   * nothing else. Every optional key is absent from the payload rather than
   * present and null.
   */
  it('maps a record that carries nothing but a code', () => {
    const product = parse({ code: '123' })

    expect(product.code).toBe('123')
    expect(product.name).toBe('')
    expect(product.brands).toEqual([])
    expect(product.categories).toEqual([])
    expect(product.nutriScore).toBe('unknown')
    expect(product.novaGroup).toBeNull()
    expect(product.image).toBeNull()
    expect(product.quantity).toBeNull()
    expect(product.ingredientsText).toBeNull()
    expect(product.ingredientCount).toBeNull()
    expect(product.lastModified).toBeNull()
  })

  it('prefers the English ingredients text when both are present', () => {
    const product = parse({
      ...RAW_NUTELLA,
      ingredients_text: 'Sucre, huile de palme',
      ingredients_text_en: 'Sugar, palm oil',
    })

    expect(product.ingredientsText).toBe('Sugar, palm oil')
  })

  it('rejects a malformed image URL instead of rendering a broken element', () => {
    // Upstream occasionally stores a bare path. Every width here is one, so
    // there is no image at all rather than an element pointing at nothing.
    expect(parse({ ...RAW_NUTELLA, image_front_url: '/images/relative.jpg' }).image).toBeNull()
  })

  it('discards only the width that is malformed', () => {
    const image = parse({
      ...RAW_NUTELLA,
      image_front_url: '/images/relative.jpg',
      image_front_thumb_url: 'https://images.example/front.100.jpg',
    }).image

    expect(image?.large).toBeNull()
    expect(image?.thumb).toBe('https://images.example/front.100.jpg')
  })

  it('rounds a fractional ingredient count and never returns a negative one', () => {
    expect(parse({ ...RAW_NUTELLA, ingredients_n: 7.6 }).ingredientCount).toBe(8)
    expect(parse({ ...RAW_NUTELLA, ingredients_n: -2 }).ingredientCount).toBe(0)
  })
})

describe('upstreamProductResponseSchema', () => {
  it('reads the status field that signals whether the product exists', () => {
    const parsed = upstreamProductResponseSchema.parse({
      status: 0,
      status_verbose: 'no code or invalid code',
    })

    expect(parsed.status).toBe(0)
    expect(parsed.product).toBeUndefined()
  })

  it('coerces a numeric-string status, which the API mixes in', () => {
    expect(upstreamProductResponseSchema.parse({ status: '1', product: RAW_NUTELLA }).status).toBe(
      1,
    )
  })

  it('treats an unreadable status as absent rather than as success', () => {
    expect(upstreamProductResponseSchema.parse({ status: 'yes' }).status).toBe(0)
  })
})

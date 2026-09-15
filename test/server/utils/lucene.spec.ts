import { describe, expect, it } from 'vitest'
import { buildProductQuery, escapeLuceneTerm, quoteLuceneValue } from '~~/server/utils/lucene'
import { productQuerySchema } from '#shared/domain/search'

const query = (input: Record<string, unknown> = {}) => productQuerySchema.parse(input)

describe('escapeLuceneTerm', () => {
  it.each([
    ['plain text', 'plain text'],
    ['foo:bar', 'foo\\:bar'],
    ['say "hi"', 'say \\"hi\\"'],
    ['a && b', 'a \\&\\& b'],
    ['a || b', 'a \\|\\| b'],
    ['wild*card', 'wild\\*card'],
    ['question?', 'question\\?'],
    ['back\\slash', 'back\\\\slash'],
    ['(group)', '\\(group\\)'],
    ['[range]', '\\[range\\]'],
    ['{brace}', '\\{brace\\}'],
    ['boost^2', 'boost\\^2'],
    ['fuzzy~', 'fuzzy\\~'],
    ['plus+minus-', 'plus\\+minus\\-'],
    ['not!', 'not\\!'],
    ['slash/es', 'slash\\/es'],
  ])('escapes %j', (input, expected) => {
    expect(escapeLuceneTerm(input)).toBe(expected)
  })

  it('leaves a term with no syntax characters untouched', () => {
    expect(escapeLuceneTerm('chocolate')).toBe('chocolate')
  })
})

describe('quoteLuceneValue', () => {
  it('keeps a taxonomy colon inside the value rather than reading it as a field', () => {
    expect(quoteLuceneValue('en:sweet-spreads')).toBe('"en:sweet-spreads"')
  })

  it('escapes a quote that would otherwise close the phrase early', () => {
    expect(quoteLuceneValue('a"b')).toBe('"a\\"b"')
  })

  it('escapes a backslash', () => {
    expect(quoteLuceneValue('a\\b')).toBe('"a\\\\b"')
  })
})

describe('buildProductQuery', () => {
  it('browses by popularity when nothing is filtered, since there is no relevance to rank', () => {
    expect(buildProductQuery(query())).toEqual({ sort_by: '-popularity_key' })
  })

  it('leaves sort_by off for relevance, which is upstream default', () => {
    const built = buildProductQuery(query({ q: 'granola' }))

    expect(built.q).toBe('granola')
    expect(built.sort_by).toBeUndefined()
  })

  it('maps the nutriscore sort to the ascending penalty score', () => {
    expect(buildProductQuery(query({ q: 'granola', sort: 'nutriscore' })).sort_by).toBe(
      'nutriscore_score',
    )
  })

  it('quotes a taxonomy filter so its colon survives', () => {
    expect(buildProductQuery(query({ category: 'en:biscuits' })).q).toBe(
      'categories_tags:"en:biscuits"',
    )
  })

  it('ORs values within one dimension, because two brands means either', () => {
    expect(buildProductQuery(query({ brand: ['lu', 'oreo'] })).q).toBe(
      '(brands_tags:"lu" OR brands_tags:"oreo")',
    )
  })

  it('ANDs across dimensions, because filters narrow', () => {
    const built = buildProductQuery(query({ category: 'en:biscuits', nutriScore: 'e' }))

    expect(built.q).toBe('categories_tags:"en:biscuits" AND nutriscore_grade:"e"')
  })

  it('omits parentheses for a single value, keeping upstream logs readable', () => {
    expect(buildProductQuery(query({ brand: 'lu' })).q).toBe('brands_tags:"lu"')
  })

  it('combines free text with filters', () => {
    const built = buildProductQuery(query({ q: 'chocolate', category: 'en:biscuits', nova: '4' }))

    expect(built.q).toBe('chocolate AND categories_tags:"en:biscuits" AND nova_groups:"4"')
  })

  /**
   * The case that motivates the whole module. Upstream answers an unescaped
   * query with `count: 0` and no error, so a product whose name contains a
   * colon would appear not to exist.
   */
  it('neutralises syntax in free text instead of letting it change the query', () => {
    const built = buildProductQuery(query({ q: 'foo: bar"baz' }))

    expect(built.q).toBe('foo\\: bar\\"baz')
  })

  it('does not let a crafted filter value inject a clause', () => {
    const built = buildProductQuery(query({ brand: 'x" OR nutriscore_grade:a OR brands_tags:"y' }))

    // The injected operators live inside the quoted phrase, so upstream reads
    // them as characters of a brand name that does not exist.
    expect(built.q).toBe('brands_tags:"x\\" OR nutriscore_grade:a OR brands_tags:\\"y"')
  })

  it('collapses internal whitespace in free text', () => {
    expect(buildProductQuery(query({ q: '  dark    chocolate  ' })).q).toBe('dark chocolate')
  })

  it('does not phrase-quote free text, which would drop reordered matches', () => {
    expect(buildProductQuery(query({ q: 'dark chocolate' })).q).not.toContain('"')
  })

  it('treats whitespace-only free text as no query at all', () => {
    expect(buildProductQuery(query({ q: '   ' }))).toEqual({ sort_by: '-popularity_key' })
  })

  it('builds every dimension at once', () => {
    const built = buildProductQuery(
      query({
        q: 'bar',
        category: 'en:biscuits',
        brand: 'lu',
        country: 'en:france',
        label: 'en:organic',
        nutriScore: ['a', 'b'],
        nova: ['1', '2'],
      }),
    )

    expect(built.q).toBe(
      'bar AND categories_tags:"en:biscuits" AND brands_tags:"lu" AND countries_tags:"en:france" ' +
        'AND labels_tags:"en:organic" AND (nutriscore_grade:"a" OR nutriscore_grade:"b") ' +
        'AND (nova_groups:"1" OR nova_groups:"2")',
    )
  })
})

describe('the ungraded filter', () => {
  /**
   * The index spells the absence two ways: `unknown` for a product nobody has
   * graded, and `not-applicable` for one the scheme does not cover, such as
   * coffee beans or spirits. The overview counts them as a single bucket, so
   * the filter has to select the same population the chart drew.
   */
  it('expands the absence into both keys upstream uses', () => {
    expect(buildProductQuery(query({ nutriScore: 'unknown' })).q).toBe(
      '(nutriscore_grade:"unknown" OR nutriscore_grade:"not-applicable")',
    )
  })

  it('leaves a real grade alone', () => {
    expect(buildProductQuery(query({ nutriScore: 'a' })).q).toBe('nutriscore_grade:"a"')
  })

  /**
   * The hyphen is the reason these are quoted rather than escaped. Escaped, it
   * reads as the NOT operator and upstream matches nothing, which an OR with a
   * ten-thousand-hit sibling hides completely.
   */
  it('does not escape the hyphen out of existence', () => {
    expect(buildProductQuery(query({ nutriScore: 'unknown' })).q).not.toContain(String.raw`\-`)
  })

  it('combines the absence with a grade', () => {
    expect(buildProductQuery(query({ nutriScore: ['a', 'unknown'] })).q).toBe(
      '(nutriscore_grade:"a" OR nutriscore_grade:"unknown" OR nutriscore_grade:"not-applicable")',
    )
  })
})

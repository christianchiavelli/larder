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

  /** Upstream answers an unescaped query with `count: 0` and no error. */
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
   * These used to be one value expanded into both keys, which selected the right
   * population for the wrong reason.
   */
  it.each([
    ['unknown', 'nutriscore_grade:"unknown"'],
    ['not-applicable', 'nutriscore_grade:"not-applicable"'],
    ['a', 'nutriscore_grade:"a"'],
  ])('sends %s straight through as the key upstream uses', (value, expected) => {
    expect(buildProductQuery(query({ nutriScore: value })).q).toBe(expected)
  })

  /**
   * Escaped, the hyphen reads as NOT and upstream matches nothing. It stayed
   * invisible while this was half of an OR whose other half exceeded the ceiling.
   */
  it('does not escape the hyphen out of existence', () => {
    expect(buildProductQuery(query({ nutriScore: 'not-applicable' })).q).not.toContain(
      String.raw`\-`,
    )
  })

  it('combines an absence with a grade', () => {
    expect(buildProductQuery(query({ nutriScore: ['a', 'unknown'] })).q).toBe(
      '(nutriscore_grade:"a" OR nutriscore_grade:"unknown")',
    )
  })

  it('takes both absences at once, which is what the old single value meant', () => {
    expect(buildProductQuery(query({ nutriScore: ['unknown', 'not-applicable'] })).q).toBe(
      '(nutriscore_grade:"unknown" OR nutriscore_grade:"not-applicable")',
    )
  })
})

describe('the unclassified filter', () => {
  /**
   * A product with no Nutri-Score carries a key saying so; one with no NOVA group
   * carries nothing, which is why this clause is a negation.
   */
  it('asks for the documents without the field', () => {
    expect(buildProductQuery(query({ nova: 'none' })).q).toBe('(NOT nova_groups:*)')
  })

  it('leaves a real group alone', () => {
    expect(buildProductQuery(query({ nova: '2' })).q).toBe('nova_groups:"2"')
  })

  /**
   * A negated clause inside an OR is where Lucene parsers differ. Upstream agrees
   * the two are disjoint: 1,483 + 71 = 1,554.
   */
  it('combines a group with the absence', () => {
    expect(buildProductQuery(query({ nova: ['2', 'none'] })).q).toBe(
      '(nova_groups:"2" OR (NOT nova_groups:*))',
    )
  })

  it('narrows rather than replaces when another dimension is set', () => {
    expect(buildProductQuery(query({ category: 'en:snacks', nova: 'none' })).q).toBe(
      'categories_tags:"en:snacks" AND (NOT nova_groups:*)',
    )
  })
})

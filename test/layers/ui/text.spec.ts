import { describe, expect, it } from 'vitest'
import { foldForSearch } from '~~/layers/ui/app/utils/text'

describe('foldForSearch', () => {
  it.each([
    ['França', 'franca'],
    ['Polônia', 'polonia'],
    ['Côte d’Ivoire', 'cote d’ivoire'],
    ['Åland Islands', 'aland islands'],
    ['Ultraprocessado', 'ultraprocessado'],
  ])('folds %s to %s', (text, folded) => {
    expect(foldForSearch(text)).toBe(folded)
  })

  it('lets a typed term without accents find a name with them', () => {
    expect(foldForSearch('Suíça').includes(foldForSearch('suic'))).toBe(true)
  })
})

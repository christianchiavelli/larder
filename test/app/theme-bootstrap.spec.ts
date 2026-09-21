import { describe, expect, it } from 'vitest'
import { THEME_BOOTSTRAP_SCRIPT, THEME_STORAGE_KEY } from '~/composables/use-theme'

interface FakeWindow {
  stored: string | null
  prefersDark: boolean
}

function run({ stored, prefersDark }: FakeWindow): { dark: boolean; reads: string[] } {
  const reads: string[] = []
  const classes = new Set<string>()

  const localStorage = {
    getItem(key: string) {
      reads.push(key)
      return stored
    },
  }
  const matchMedia = (query: string) => ({ matches: query.includes('dark') && prefersDark })
  const document = { documentElement: { classList: { add: (name: string) => classes.add(name) } } }

  new Function('localStorage', 'matchMedia', 'document', THEME_BOOTSTRAP_SCRIPT)(
    localStorage,
    matchMedia,
    document,
  )

  return { dark: classes.has('dark'), reads }
}

describe('the theme bootstrap script', () => {
  it('reads the same key the composable writes', () => {
    expect(run({ stored: null, prefersDark: false }).reads).toEqual([THEME_STORAGE_KEY])
  })

  it('applies a stored dark choice', () => {
    expect(run({ stored: 'dark', prefersDark: false }).dark).toBe(true)
  })

  it('honours a stored light choice over a dark operating system', () => {
    expect(run({ stored: 'light', prefersDark: true }).dark).toBe(false)
  })

  it.each([null, 'auto'])('follows the operating system when the choice is %s', (stored) => {
    expect(run({ stored, prefersDark: true }).dark).toBe(true)
    expect(run({ stored, prefersDark: false }).dark).toBe(false)
  })

  it('survives a localStorage that throws', () => {
    const boom = {
      getItem() {
        throw new DOMException('denied')
      },
    }

    expect(() =>
      new Function('localStorage', 'matchMedia', 'document', THEME_BOOTSTRAP_SCRIPT)(
        boom,
        () => ({ matches: false }),
        { documentElement: { classList: { add: () => {} } } },
      ),
    ).not.toThrow()
  })

  it('stays on one line and free of dependencies', () => {
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain('\n')
    expect(THEME_BOOTSTRAP_SCRIPT.length).toBeLessThan(300)
  })
})

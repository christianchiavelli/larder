import { describe, expect, it } from 'vitest'
import { THEME_BOOTSTRAP_SCRIPT, THEME_STORAGE_KEY } from '~/composables/use-theme'

/**
 * A hand-written string in `<head>`, so no type check or linter reads it and a
 * mistake does not throw, it stops applying the class. Executed here against a
 * fake window, in each state a visitor can arrive in.
 */

interface FakeWindow {
  stored: string | null
  prefersDark: boolean
}

/** Runs the real script against a stubbed browser and reports the outcome. */
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

  // Indirect execution, so the script runs as the browser would run it rather
  // than closing over anything in this file.
  new Function('localStorage', 'matchMedia', 'document', THEME_BOOTSTRAP_SCRIPT)(
    localStorage,
    matchMedia,
    document,
  )

  return { dark: classes.has('dark'), reads }
}

describe('the theme bootstrap script', () => {
  it('reads the same key the composable writes', () => {
    // A rename on one side only would not break anything visibly. It would
    // quietly bring the flash back, on the half of loads nobody tests.
    expect(run({ stored: null, prefersDark: false }).reads).toEqual([THEME_STORAGE_KEY])
  })

  it('applies a stored dark choice', () => {
    expect(run({ stored: 'dark', prefersDark: false }).dark).toBe(true)
  })

  it('honours a stored light choice over a dark operating system', () => {
    // An explicit choice outranks the system preference, or the toggle does
    // nothing for anyone whose machine is set to dark.
    expect(run({ stored: 'light', prefersDark: true }).dark).toBe(false)
  })

  it.each([null, 'auto'])('follows the operating system when the choice is %s', (stored) => {
    expect(run({ stored, prefersDark: true }).dark).toBe(true)
    expect(run({ stored, prefersDark: false }).dark).toBe(false)
  })

  it('survives a localStorage that throws', () => {
    // Safari in a private window does not return null, it throws outright, and
    // an exception here would abort a blocking script in `head`.
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
    // It is inlined into the document and blocks the first paint, so its size
    // is paid on every page load by every visitor.
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain('\n')
    expect(THEME_BOOTSTRAP_SCRIPT.length).toBeLessThan(300)
  })
})

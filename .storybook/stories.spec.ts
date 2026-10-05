import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Channel } from 'storybook/internal/channels'

interface IndexEntry {
  readonly id: string
  readonly title: string
  readonly name: string
  readonly type: 'story' | 'docs'
}

const INDEX = JSON.parse(
  readFileSync(new URL('../storybook-static/index.json', import.meta.url), 'utf8'),
) as { readonly entries: Record<string, IndexEntry> }

const STORIES = Object.values(INDEX.entries).filter((entry) => entry.type === 'story')

/** The names the toolbar gives the themes (`preview.ts`). */
const THEMES = ['Light', 'Dark'] as const

/** What the preview emits once a story is done, the parts read here. */
interface StoryFinished {
  /** `error` once any report failed, the a11y addon's included. */
  readonly status: 'success' | 'error'
  readonly reporters: readonly {
    readonly type: string
    readonly result: {
      readonly violations?: readonly {
        readonly id: string
        readonly nodes: readonly { readonly target: readonly string[] }[]
      }[]
    }
  }[]
}

/** How a story's render went, as Storybook's preview tells it. */
interface Outcome {
  readonly status: StoryFinished['status']
  /** What was thrown while it rendered or while its play function ran. */
  readonly thrown: readonly string[]
  /** What axe found, as `rule: elements`. */
  readonly violations: readonly string[]
}

declare global {
  interface Window {
    /** Settles once the story has rendered, played and been audited. */
    storyOutcome: Promise<Outcome>
  }
}

/**
 * Hears a story out, from the events Storybook's preview reports it with. The
 * listeners go on the preview's channel as it is installed, so no story can
 * finish before they are there. Runs in the page, ahead of every script.
 */
function hearTheStoryOut(): void {
  const thrown: string[] = []
  let channel: Channel | undefined
  window.storyOutcome = new Promise((resolve) => {
    Object.defineProperty(globalThis, '__STORYBOOK_ADDONS_CHANNEL__', {
      configurable: true,
      get: () => channel,
      set(next: Channel) {
        channel = next
        for (const event of ['storyThrewException', 'storyErrored', 'playFunctionThrewException']) {
          next.on(event, (error: { message?: string; description?: string }) =>
            thrown.push(error.message ?? error.description ?? event),
          )
        }
        // After the play function and every `afterEach`, the a11y addon's axe run among them.
        next.on('storyFinished', ({ status, reporters }: StoryFinished) =>
          resolve({
            status,
            thrown,
            violations: reporters
              .flatMap((report) => (report.type === 'a11y' ? (report.result.violations ?? []) : []))
              .map(
                ({ id, nodes }) =>
                  `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
              ),
          }),
        )
      },
    })
  })
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    for (const story of STORIES) {
      test(`${story.title}: ${story.name}`, async ({ page }) => {
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text())
        })

        await page.addInitScript(hearTheStoryOut)
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`)
        const outcome = await page.evaluate(() => window.storyOutcome)

        expect(outcome.thrown, 'it renders, and its play function passes').toEqual([])
        expect(outcome.violations, 'axe finds nothing').toEqual([])
        expect(outcome.status, 'no other report fails').toBe('success')
        expect(errors).toEqual([])
      })
    }
  })
}

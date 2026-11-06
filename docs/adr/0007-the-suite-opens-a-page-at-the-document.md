# 7. The suite opens a page at the document, not at the load event

**Status:** Accepted · **Decided:** 2026-11-05 · **Commits:** `17f0096`, `8f8b2c1`, `faaca42`

## Context

`page.goto` waits for the load event by default, and the load event waits for every image on the page. The photographs here come from Open Food Facts' own image host, which is somebody else's server on somebody else's day.

On 2026-11-05 three tests came back green-runs-with-flaky-tests, and every one was the same failure underneath: not a failed assertion, but `page.goto` reaching its thirty-second timeout. The app had done nothing wrong; a photograph had been slow to arrive, and the suite reported it as a fault in this app.

The same wait was also doing something nobody had asked it to do: giving the app time to hydrate. Four tests clicked straight after a page opened and only worked because the load event happened to arrive after hydration. Waiting for photographs was covering for a wait that was actually needed.

## Decision

Every spec opens a page through `open(page, path)` (`e2e/support/navigation.ts`), which:

1. navigates with `waitUntil: 'domcontentloaded'`, so the document is there and the photographs are irrelevant;
2. then waits for the mark the app sets once it has hydrated, which is the moment a click stops being lost;
3. returns the response, so a test that asserts a status code still can.

Two kinds of test are exempt, and both say so where they are written:

- five tests build a context with `javaScriptEnabled: false`, where the mark is never set, so they call `page.goto` themselves;
- the Web Vitals harness keeps `networkidle`, because it measures a page at rest and a quiet network is the definition of at rest — and its baselines were recorded that way.

## Consequences

- A third party's latency can no longer fail a navigation. What fails now is the assertion the test is actually about.
- The wait for hydration is stated instead of inherited, so a test that clicks says it needs a page that has woken up.
- `toHaveURL` given a predicate was found never to match, on an address it printed as received and that compared equal when the same two strings were compared by hand. The one test that used it polls instead (`expect.poll`). Recorded here because it cost half a day and the predicate form is the shape anyone would reach for first.
- The step that runs the suite went from 8.7 minutes with three flaky tests to 4.6 with none, and the whole suite now passes with `E2E_RETRIES=0`, which is what makes the weekly scheduled run worth anything.
- A page that is only read, never clicked, now costs slightly more waiting than it needs: hydration is awaited even where nothing is touched. That is the price of one rule instead of two.

# Architecture

How Larder is put together, and why each boundary sits where it does.
Start at the [README](../README.md); this is the long version.

---

## Architecture

```
Browser
  │  URL is the filter state. No store, no sync.
  ▼
Vue components ── Pinia Colada ── app/api (typed client)
  │
  ▼
Nitro BFF  (server/api → server/services → server/upstream)
  │  Zod at the boundary, cache, retry, error mapping
  ▼
Open Food Facts  (two services, two contracts)
```

### The BFF

Every upstream call starts on the server. Three reasons, in order of weight:

1. Open Food Facts identifies callers by `User-Agent` and throttles anonymous
   traffic. A browser cannot set that header.
2. The two upstream services disagree about the same entity. `brands` is a
   comma-joined string from the v2 API and an array from the search index. No
   single client-side type models both.
3. A product document carries around 250 keys. A result row needs twelve.

All of it normalises into one contract in `shared/domain`, shared by the server
and the client.

### The domain comes first

`shared/domain` owes nothing to the upstream shape. Nutri-Score and NOVA are
defined by public health bodies; Open Food Facts is where they happen to be read
from. The schemas in `server/upstream` map _into_ the domain, never the reverse.

Two things fell out of that:

- **Nutrients are nullable per nutrient, not per product.** A product can declare
  sugars and omit fibre. One "has nutrition" flag would force the UI to render
  zeroes it cannot vouch for.
- **The contract splits into summary and detail.** The directory renders 24 rows
  needing a dozen fields each. The deep dive needs everything. Using one shape
  for both puts ~250 keys per row on the wire to draw a table.

### Filter state

The URL holds it. There is no store behind the directory and no watcher keeping
two copies in step, because either one creates a window where the address bar
and the results disagree.

One Zod schema parses the query string, the client call and the route handler,
so a shareable link and a valid API request are the same thing by construction.
Sharing, bookmarking and the back button then work with no code written for
them.

### Missing data

A nutrient nobody reported shows an em-dash, never a zero. In a community-edited
catalogue "not reported" and "none" are different facts, and a reader cannot
tell them apart afterwards. Absent Nutri-Score and NOVA values work the same
way: they are states in the type, not errors to recover from.

Nutri-Score carries the rule one step further, because upstream reports two
reasons a product has no grade. `unknown` is a product nobody has graded yet and
may well carry a letter tomorrow; `not-applicable` is one the scheme excludes by
design, such as a beer or a vinegar, and never will. Two thirds of the catalogue
is one or the other, split 65% to 2%. They are separate values, separate badges
(`?` and `N/A`), separate bars on the overview and separate filters, because
collapsing them would report a deliberate exclusion as missing data.

---

## Design

### Colour

Nutri-Score runs green to red and NOVA runs green to red beside it, so that arc
of the wheel already means "grade" on every screen here. The accent is a deep
navy, picked by elimination: a blue bar reads as a quantity, a green-to-red
badge reads as a rating. Series colours are chosen for separation from the same
ramp, and the two nearest it come last in the order.

Everything else is cool, blue-cast grey. The dark theme is that same ramp read
from the other end, plus five steps it does not ship, each an OKLab
interpolation between two neighbours with the fraction recorded next to the
value. Nutri-Score and NOVA are excluded: their colours are set by regulation
and by a published classification, so tinting them to suit a theme would make
the badge misrepresent what it names. Each grade carries its own ink, because no
single ink clears WCAG AA across a green-to-red ramp.

### Type

Headings are [Lora](https://fonts.google.com/specimen/Lora), everything a reader
scans or compares is [Open Sans](https://fonts.google.com/specimen/Open+Sans).
The pairing marks where a page begins without needing a rule or a coloured band.
Figures stay sans and tabular: Lora's numerals are old-style and a column of
them cannot be compared. An end-to-end test asserts both.

### The UI layer

`layers/ui` is a Nuxt layer, not a folder, so the boundary is enforced by the
module graph.

It holds values, never meaning. It knows there is a surface, an ink, a series
colour and a token spelled `--nutriscore-a`, the same way a stylesheet does, and
nothing in it imports from `shared/domain`. The question before moving a
component down into it is "does this file name a concept from the problem
domain". A badge typed on `NutriScore` fails that; the panel it sits on passes.

Tokens go primitives → semantics → domain, and only the semantic tier is
redefined for dark mode. `@theme inline` emits the custom property into each
utility instead of its computed value, so one `.dark` block reskins the app with
**no `dark:` variants in any template**. Charts read the same tokens at runtime,
so there is no second palette in TypeScript to drift.

---

## Layout

```
shared/domain/     Domain model. Knows nothing about any API.
server/
  api/             Route handlers. Transport and caching only.
  services/        Search, lookup and suggest as plain functions.
  upstream/        Upstream schemas and the mapping into the domain.
  utils/           HTTP client, Lucene builder, error mapping, cache policy.
app/
  api/             Typed client for our own API.
  composables/     URL-backed filter state, queries, the domain palette.
  components/
    chrome/        Navigation rail. The frame, not the content.
    product/       Everything that knows what a product is.
  pages/           Overview, directory, product deep dive.
layers/ui/         Design system. Tokens, primitives, formatting, chart theme.
test/              Unit specs, mirroring the tree above.
e2e/               Playwright specs.
docs/              Architecture, decisions, findings, upstream contracts.
```

---

## Accessibility

- **Charts render their figures as a visually hidden table.** A canvas is
  unreadable to a screen reader and to anyone who cannot separate the colours.
  Alt text saying "bar chart" is not an accessible chart.
- **Nutri-Score and NOVA never rely on colour alone.** The scale runs green to
  red, exactly the pair a red-green deficiency collapses, so the letter or
  number always renders and the accessible name spells out the scale.
- Filter changes are announced politely instead of silently replacing results.
- `prefers-reduced-motion` suppresses the skeleton pulse and every transition.
- The theme is applied by a blocking inline script before first paint, so a
  dark-mode reader never gets a white flash.

---

## Testing

```bash
pnpm run lint        # ESLint (formatting is Prettier's alone)
pnpm run typecheck   # vue-tsc
pnpm run test        # Vitest, 327 specs
pnpm run e2e         # Playwright, 114 runs across two viewports, on a build
pnpm run ci          # lint, types, and unit tests with coverage
```

The suites divide by what they can see. Vitest covers the domain, services,
mappers and URL state, with the coverage threshold set at the measured figure
floored to the whole number, so losing a test fails the run.

Playwright owns what only a browser can answer: whether a Tailwind utility
resolves, whether a chart's hover state renders, whether a tree hydrates
cleanly. All three have broken here at some point, and a jsdom render sees none
of them, which is why `.vue` files sit outside the coverage target.

`e2e/filter-round-trip.spec.ts` is the odd one out: it never opens a page. It
takes every value the sidebar offers and every value autocomplete suggests,
applies each as a filter, and checks something comes back. Three bugs in this
repository were a filter that applied cleanly and matched nothing, none of which
raised an error anywhere, and no unit test can see them: they are disagreements
between two upstream services about a vocabulary. It asserts presence and never
counts, because upstream is community-edited and the numbers move daily.

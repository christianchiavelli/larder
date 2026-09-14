# Larder

A food product analytics dashboard built on [Open Food Facts](https://world.openfoodfacts.org),
a public catalogue of roughly 3.5 million packaged food products contributed by
the public.

Browse and filter the catalogue by category, brand, nutrition grade and
processing level; open any product for its nutrition profile against EU
reference intakes, its additives, labels and provenance.

Built with Nuxt 4, Vue 3.5, Tailwind 4 and a Nitro backend-for-frontend.

![The product directory, with faceted filters and Nutri-Score grading](docs/screenshots/directory-light.png)

<details>
<summary>More screens</summary>

**Catalogue overview**

![Overview dashboard showing Nutri-Score distribution and the largest categories](docs/screenshots/overview-light.png)

**Product deep dive, dark theme**

![Nutrition profile against EU reference intakes, with additives and labels](docs/screenshots/product-dark.png)

Regenerate these with `pnpm run screenshots` against a production build.

</details>

---

## Why this project exists

Most portfolio projects consume a clean API and render it. Real front-end work
is rarely that. It is usually an inconsistent upstream, a rate limit, a data set
with holes in it, and a set of decisions about what to show when the answer is
"we do not know".

This one leans into that deliberately. Open Food Facts is community-edited, so
records are incomplete, fields contradict each other across endpoints, and some
entries are simply wrong. Everything interesting here is a consequence of taking
that seriously rather than styling the happy path.

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

### The BFF is not optional

Every upstream call originates on the server, for three reasons in order of
weight:

1. Open Food Facts identifies callers by `User-Agent` and throttles anonymous
   traffic. A browser cannot set that header.
2. The two upstream services disagree about the same entity. `brands` is a
   comma-joined string from the v2 API and an array from the search index. No
   single client-side type models both.
3. A product document carries around 250 keys. A result row needs twelve.

The BFF normalises all of that into one contract, defined in `shared/domain`
and shared by the server and the client.

### The domain is written first

`shared/domain` owes nothing to the upstream API shape. Nutri-Score and NOVA are
defined by public health bodies; Open Food Facts is where they are read from
today, not what they mean. The upstream schemas in `server/upstream` map _into_
the domain, never the reverse.

Two decisions that fell out of this:

- **Nutrient readings are nullable per nutrient, not per product.** A product can
  declare sugars and omit fibre. A single "has nutrition" flag would force the UI
  to render zeroes it cannot vouch for.
- **The product contract is split into summary and detail.** A directory renders
  24 rows needing a dozen fields; the deep dive needs everything. One shape for
  both would put ~250 keys per row on the wire to draw a table.

### The URL is the filter state

There is no store behind the directory and no watcher synchronising two
directions, because either introduces a moment where the address bar and the
results disagree. One Zod schema parses the query string, the client call and
the route handler, so a shareable link and a valid API request are the same
thing by construction.

Sharing, bookmarking and the back button then work without a line of code
written for any of them.

### Absence is rendered as absence

A nutrient nobody reported shows an em-dash, never a zero. In a community-edited
catalogue, "not reported" and "none" are different facts, and a reader cannot
tell them apart after the fact. The same rule governs "unknown" Nutri-Score and
NOVA values: they are first-class states in the type, not errors to recover from.

### Design system as a Nuxt layer

`layers/ui` holds tokens, primitives and the chart theme. Being a layer rather
than a folder means the boundary is enforced by the module graph: it can be
consumed without the app, and nothing in it reaches back into product code.

Tokens are layered primitives → semantics → domain. Only the semantic tier is
redefined for dark mode, and `@theme inline` emits the custom property into each
utility rather than its computed value, so one `.dark` block reskins the app with
**no `dark:` variants in any template**.

Nutri-Score keeps its regulated colours in both themes. Recolouring a
front-of-pack label to suit a palette would make the chart misrepresent it.

Charts read that palette from the CSS tokens at runtime instead of keeping a
second copy in TypeScript, so a theme switch needs no redeclaration and the two
cannot drift.

---

## What building it turned up

The parts worth reading. Each is documented at the point in the code where it
matters, and the upstream findings are collected in
[`docs/upstream-api.md`](docs/upstream-api.md).

### The query parser fails silently

Upstream parses `q` as a Lucene expression. Unescaped input does not raise an
error — it changes meaning and returns zero matches. A product whose name
contains a colon would appear not to exist, with nothing anywhere saying why.

Values are escaped the way SQL values are, in `server/utils/lucene.ts`, and the
injection case is under test.

### A silent CSS failure nothing in the toolchain could see

Tailwind scans for class names from the Vite root, which Nuxt sets to the app
directory. Everything under `layers/` fell outside that scan, so every utility
used _only_ in the design system was never generated.

`bg-nutri-a` computed to transparent while `bg-surface-raised`, which the app
also used, was fine. The class was in the markup, the token resolved, the build
succeeded, and lint, types and 180-odd unit tests all passed.

Fixed with an explicit `@source`. `e2e/design-tokens.spec.ts` now asserts these
utilities resolve in a real browser, because nothing in the type system can.

### Two numbers describing different populations

Elasticsearch stops tracking hits at 10,000 but still aggregates over every
matching document. So `count` is a ceiling while facet counts are real totals.
The overview was reading one for its headline figure and the other for its
charts, putting 10,000 and 3.5 million on one screen as if they measured the
same thing.

Related: the directory renders an inexact total as "10,000+" rather than stating
a number known to be wrong.

### "Other" is not a category

The facet response includes a `--other--` remainder bucket holding the entire
long tail. It is not a tag, so it cannot be filtered on, and being a sum it
outweighs every real value: left in, the category chart reported Other as the
largest category of food in the world, at six million products.

### The two services disagree about names

Barcode `3274080005003` is "Eau de source" in the search index, "Cristaline" in
the product API, and carries "isabelle" in a third field. A directory card and
the page it opens are genuinely allowed to differ.

Not fixable from the client: picking "whichever looks most like a product name"
is a heuristic over vandalism. One rule is applied consistently and the
divergence is documented, so the end-to-end test asserts the barcode rather than
the heading.

### Zod 4 requires the key to be present

Upstream omits a key entirely when it has no value. A union that merely includes
`z.undefined()` still requires the key in Zod 4, so every record missing any
optional field was rejected — which is most of the catalogue. The directory
rendered empty while reporting 10,000 matches.

Found by writing the test with a fixture copied from a real response instead of
an invented one.

---

## Accessibility

Not a checklist item, and the decisions are load-bearing:

- **Charts render their figures as a visually hidden table.** A canvas is
  unreadable to a screen reader and to anyone who cannot separate the colours.
  An alt text saying "bar chart" is not an accessible chart.
- **Nutri-Score and NOVA never rely on colour alone.** The scale runs green to
  red, exactly the pair a red-green deficiency collapses. The letter or number
  always renders, and the accessible name spells out the scale.
- Filter changes are announced politely rather than silently replacing results.
- `prefers-reduced-motion` suppresses the skeleton pulse and every transition.
- The theme is applied by a blocking inline script before first paint, so a
  dark-mode reader never gets a white flash.

---

## Running it

Requires Node 24+ and pnpm.

```bash
pnpm install
pnpm dev
```

No API key or account is needed; Open Food Facts is open data under
[ODbL](https://opendatacommons.org/licenses/odbl/).

### Checks

```bash
pnpm run lint        # ESLint (formatting is Prettier's alone)
pnpm run typecheck   # vue-tsc
pnpm run test        # Vitest, 189 specs
pnpm run e2e         # Playwright against a production build
```

`pnpm run ci` runs lint, types and unit tests together.

---

## Repository layout

```
shared/domain/     Domain model. Knows nothing about any API.
server/
  api/             Route handlers. Transport and caching only.
  services/        Search, lookup and suggest as plain functions.
  upstream/        Upstream schemas and the mapping into the domain.
  utils/           HTTP client, Lucene builder, error mapping, cache policy.
app/
  api/             Typed client for our own API.
  composables/     URL-backed filter state, Pinia Colada queries.
  components/      Domain components.
  pages/           Overview, directory, product deep dive.
layers/ui/         Design system. Tokens, primitives, chart theme.
test/              Unit specs.
e2e/               Playwright specs.
docs/              Upstream API findings.
```

---

## Notable dependency choices

**ECharts over Highcharts.** Highcharts is excellent and its licence is
commercial. Apache-2.0 keeps this repository unambiguously reusable.

**Pinia Colada over `useFetch`.** The directory refetches on every filter
change, and most of those are a user toggling something off and back on. A cache
keyed on the query turns that into no request, and deduplicates the burst a fast
typist generates.

**TypeScript pinned to 6.0.3.** TypeScript 7 is the native compiler and
typescript-eslint declines to load against it (supported range `>=4.8.4 <6.1.0`).
A transitive Nuxt dependency pulls 7 in, and pnpm's version isolation meant the
ESLint parser resolved that copy and failed the whole lint run even after the
direct dependency was downgraded. A pnpm override pins one compiler across the
graph. Revisit when typescript-eslint ships TS 7 support.

---

## Licence

Code under MIT. Product data belongs to Open Food Facts contributors under ODbL
and is fetched live; none of it is redistributed in this repository.

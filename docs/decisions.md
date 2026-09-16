# Decisions

What was chosen over what, and what it costs. Every entry here is a trade that
could reasonably have gone the other way.

---

## Dependency notes

**ECharts over Highcharts.** Highcharts is excellent and its licence is
commercial. Apache-2.0 keeps this repository unambiguously reusable.

**Pinia Colada over `useFetch`.** The directory refetches on every filter
change, and most of those are a user toggling something off and back on. A cache
keyed on the query turns that into no request, and deduplicates the burst a fast
typist generates.

**No headless library for the select.** `appearance: base-select` styles the
open picker while the element stays a real `<select>`, so keyboard navigation,
type-ahead, form association and the touch picker all keep working. Chrome and
Edge ship it, Firefox has it behind a flag and Safari in Technology Preview;
elsewhere the closed control is still styled and only the open list falls back
to the platform's own.

**Font Awesome behind one component.** Templates name an icon and never import
one, and the names are a typed map rather than Font Awesome's runtime library,
so an icon outside the set is a compile error instead of an element that renders
nothing. The library's own stylesheet is not loaded: it sizes every icon at
`1em`, which fights the sizing utilities used everywhere else, and nothing here
uses the layout helpers it also carries.

**No image proxy.** Open Food Facts renders every photograph at 100, 200 and
400 pixels and serves them from its own CDN, so the elements carry a `srcset`
over those and the browser picks by device pixel ratio. Running them through
`@nuxt/image` and IPX instead would add a hop, move the bandwidth onto this
server and lose upstream's caching, to arrive at files upstream had already
made.

**TypeScript pinned to 6.0.3.** typescript-eslint declines to load against
TypeScript 7 (supported range `>=4.8.4 <6.1.0`), a transitive Nuxt dependency
pulls 7 in, and pnpm's isolation meant the parser resolved that copy and failed
the whole lint run even after the direct dependency was downgraded. A pnpm
override pins one compiler across the graph. Revisit when typescript-eslint
supports 7.

---

**Cards are not stretched to equal height.** On the product page the nutrition
table is nine fixed rows while the column beside it runs from one label to a
dozen. Filling the short column to match would leave a card two thirds empty,
which reads as something that failed to load; the ingredients paragraph moved
into that column instead, which balances the two for most products and takes
the prose off the full width of a desktop.

---

## Limitations

Things a reviewer would find, listed so nobody has to.

- **Autocomplete can suggest a filter that matches nothing.** It answers from
  the taxonomy, which is a superset of what the search index holds: "Olivar de
  Segura S.C.A." is a real brand with no product tagged to it. Knowing the count
  before offering a suggestion would mean a query per suggestion, against the
  endpoint with upstream's tightest published limit.
- **Nutri-Score grade E is 4.15:1, below the 4.5 that AA asks of body text.** The
  fill and the white letter on it are both prescribed by the scheme, and every
  other badge in the app clears 4.5 and is held there by a test. Darkening the
  letter would pass the check by misrepresenting a regulated mark, so the grade
  keeps its official colours and the letter is never the only cue: the value is
  in the accessible name, and the same figure is a labelled row in every chart's
  data table.
- **English only.** The locale is fixed in `layers/ui/app/utils/format.ts`, while
  the catalogue is multilingual and mostly European. Switching separators without
  translating anything would be worse than leaving them.
- **No deployment.** Upstream is rate limited and shared, and a public instance
  would need a caching tier and a real contact address in the `User-Agent` before
  it would be a good citizen.
- **The list is not virtualised.** Page size caps at 96, which is fine at that
  size and would not be at 1,000.
- **A product name can differ between a card and the page it opens.** Upstream
  disagreement, described above. Not fixable from here.
- **`useProductSearch` and `useTheme` have no unit tests.** Both are thin
  wrappers over Pinia Colada and VueUse, and covering them would mostly assert
  that those libraries work. They are exercised end-to-end.

# Larder

A food product analytics dashboard on top of [Open Food Facts](https://world.openfoodfacts.org), a public catalogue of roughly 3.5 million packaged products.

Filter the catalogue by category, brand, nutrition grade and processing level, then open any product for its nutrition profile against EU reference intakes, its additives, labels and provenance.

Nuxt 4, Vue 3.5, Tailwind 4, and a Nitro backend-for-frontend.

![The product directory, with faceted filters and Nutri-Score grading](docs/screenshots/directory-light.png)

<details>
<summary>More screens</summary>

**Front page, dark theme**

![Search, three example filters and the most scanned products](docs/screenshots/landing-dark.png)

**Catalogue overview**

![Overview dashboard showing Nutri-Score distribution and the largest categories](docs/screenshots/overview-light.png)

**Product deep dive, dark theme**

![Nutrition profile against EU reference intakes, with additives and labels](docs/screenshots/product-dark.png)

**Export, narrowed from a dialog**

![The export dialog with a word and a brand picked, ready to download 889 products](docs/screenshots/export-light.png)

**Export past the 10,000 limit, dark theme**

![The export dialog explaining the 10,000 product limit and linking to the full data set](docs/screenshots/export-too-many-dark.png)

Regenerate with `pnpm run screenshots` against a production build.

</details>

---

## Setup

Node.js 22.13 or newer and pnpm. No API key or account.

```bash
pnpm install
pnpm dev
```

The scripts run on Node.js 24, pinned in `package.json` under `devEngines` and downloaded on the first install.

---

## Why this data set

Open Food Facts is community-edited, so records are incomplete, fields contradict each other across endpoints, and some entries are wrong. Most of what is interesting here comes from handling that honestly instead of styling the happy path.

Two thirds of the catalogue has no Nutri-Score, for two different reasons: a beer is excluded by the scheme, while a yoghurt nobody has graded might have one tomorrow. They stay separate values, badges and filters, because collapsing them would report a deliberate exclusion as missing data.

---

## Screens

| Route                | What it is                                                               |
| -------------------- | ------------------------------------------------------------------------ |
| `/`                  | Front page: search, three example filters, the products people scan most |
| `/overview`          | The shape of the whole catalogue, as charts                              |
| `/products`          | The directory: facets, sort, page size, pagination                       |
| `/products/:barcode` | One product: nutrition against EU reference intakes, composition, source |

---

## How it is built

- **A BFF, not a proxy.** Nitro routes read two upstream services with contradictory shapes and hand the client one contract, parsed with Zod at the boundary.
- **The domain comes first.** `shared/domain` owes nothing to the upstream shape: Nutri-Score and NOVA follow the public health bodies that define them.
- **Filter state lives in the URL.** No store and no watcher, so sharing, bookmarking and Back work for free.
- **An export holds every match, or it does not happen.** The search index stops at 10,000 rows, so a larger search asks for one more filter instead of saving an arbitrary slice. The CSV streams as upstream pages arrive, and a failure halfway cuts the download, so a partial file never passes for a whole one.
- **The dialog is the platform's own.** A native `<dialog>` keeps the page inert and returns focus, and its pickers are popovers placed with CSS anchor positioning, with no library for either.
- **Missing data is a value, never a zero.** A nutrient nobody reported shows a dash, and a product with no photograph says so.
- **The design system is a Nuxt layer**, and its boundary is enforced: nothing under `layers/ui` knows that food is being catalogued.
- **One theme, read from tokens.** Components and charts read the same custom properties, so a colour is never written twice.

---

## Testing

```bash
pnpm run ci    # format, lint, types, and unit tests with coverage
pnpm run e2e   # Playwright on desktop and mobile, against a production build
```

Vitest covers the domain, services, mappers and URL state. Playwright covers what only a browser can: whether a Tailwind utility resolves, whether a chart renders its hover state, and whether the page hydrates cleanly.

---

## Reading further

[docs/upstream-api.md](docs/upstream-api.md) compares the two upstream contracts, probed live, because the published documentation lags behind them. The reasoning behind each change is in the commit that made it.

---

## Licence

Code under MIT. Product data is Open Food Facts', under [ODbL](https://opendatacommons.org/licenses/odbl/); attribution is rendered on every page that shows it, and every exported row links to the record it came from.

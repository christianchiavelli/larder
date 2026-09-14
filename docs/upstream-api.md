# Upstream API reference

Notes gathered by probing the live Open Food Facts APIs. This file is the source of
truth for the contracts our BFF wraps, because the published docs lag behind the
services and the two services disagree with each other.

## Two upstreams, two contracts

| Concern          | `world.openfoodfacts.org/api/v2` | `search.openfoodfacts.org` (Search-a-licious) |
| ---------------- | -------------------------------- | --------------------------------------------- |
| Engine           | MongoDB                          | Elasticsearch                                 |
| Free-text search | not supported                    | `q` with Lucene syntax                        |
| Tag filtering    | `?categories_tags_en=x`          | `q=categories_tags:"en:x"`                    |
| Aggregations     | none                             | `facets`, `charts`                            |
| Autocomplete     | none                             | `/autocomplete` over taxonomies               |
| Single product   | `/product/{barcode}`             | `/document/{identifier}`                      |
| `brands` type    | `string` (comma separated)       | `string[]`                                    |

The divergence in `brands` alone means no single client-side type can model both.
Normalising this is the BFF's job.

## Field-level hazards

- A product document has ~251 keys. Always send `fields=` to keep payloads sane.
- `nutriments` keys are hyphenated and carry four suffix variants per nutrient
  (`salt`, `salt_100g`, `salt_unit`, `salt_value`, sometimes `salt_modifier`).
  `_100g` is the only one comparable across products.
- `nova_group` is `null` on plenty of well-known products (Nutella included).
  Treat "unknown" as a first-class value, not an error.
- `nutriscore_grade` is a lowercase letter, or the literal string `"unknown"`,
  or `"not-applicable"`.
- Taxonomy tags are language-prefixed (`en:sweet-spreads`). The prefix is part of
  the identifier, never strip it for lookups, only for display.
- `quantity` is free text (`"400.0 g"`). Not parseable in the general case.

## Pagination and counts

`Search-a-licious` returns `is_count_exact: false` once the match set passes the
Elasticsearch tracking threshold, with `count` pinned at 10000. The UI must render
that as "10,000+" rather than claiming an exact total.

`page_count` is derived from the truncated count, so deep paging past the
threshold returns empty pages. We clamp requested pages against a known-safe
ceiling in the BFF.

## Absence is signalled two ways

Verified against the live service:

| Request                                               | HTTP | `status` | `status_verbose`        |
| ----------------------------------------------------- | ---- | -------- | ----------------------- |
| `/product/3017620425035` (exists)                     | 200  | 1        | —                       |
| `/product/99999999999999` (well-formed, uncatalogued) | 404  | 0        | product not found       |
| `/product/1` (malformed)                              | 200  | 0        | no code or invalid code |

So HTTP status alone is not sufficient to detect a missing product, and neither
is the `status` field alone. Both are checked.

## Sorting is restricted to indexed fields

`sort_by` only accepts fields the index declares sortable. Confirmed working:
`nutriscore_score` (ascending is best-first, it is a penalty score),
`-popularity_key`, `-unique_scans_n`. Confirmed rejected with a Pydantic
validation error: anything under `nutriments.*`. There is no server-side sort by
sugar, salt or protein content.

## The query parser fails silently

`q` is parsed as Lucene. Unescaped input does not raise an error, it changes
meaning: `q=foo: bar"baz` returns `count: 0` rather than a 400. A product whose
name contains a colon would appear not to exist. Values are escaped in
`server/utils/lucene.ts`.

## Rate limits and etiquette

Open Food Facts asks every client to send a descriptive `User-Agent`. Browsers
cannot set that header, which is the second reason all traffic goes through our
server. Documented ceilings are 100 req/min for product and search reads and
10 req/min for facet reads, so BFF responses are cached.

## Endpoints we consume

```
GET search.openfoodfacts.org/search
    ?q=&langs=&page=&page_size=&fields=&sort_by=&facets=&charts=
 -> { count, is_count_exact, page, page_count, page_size,
      hits[], facets{}, charts{}, warnings[], took, timed_out }

GET search.openfoodfacts.org/autocomplete
    ?q=&taxonomy_names=&lang=&size=&fuzziness=
 -> { took, timed_out, options: [{ id, text, taxonomy_name }] }

GET world.openfoodfacts.org/api/v2/product/{barcode}?fields=
 -> { status, code, product{} }
```

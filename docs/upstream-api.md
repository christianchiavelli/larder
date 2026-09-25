# Upstream API reference

Notes gathered by probing the live Open Food Facts APIs. This file is the source of truth for the contracts our BFF wraps, because the published docs lag behind the services and the two services disagree with each other.

## Two upstreams, two contracts

| Concern | `world.openfoodfacts.org/api/v2` | `search.openfoodfacts.org` (Search-a-licious) |
| --- | --- | --- |
| Engine | MongoDB | Elasticsearch |
| Free-text search | not supported | `q` with Lucene syntax |
| Tag filtering | `?categories_tags_en=x` | `q=categories_tags:"en:x"` |
| Aggregations | none | `facets`, `charts` |
| Autocomplete | none | `/autocomplete` over taxonomies |
| Single product | `/product/{barcode}` | `/document/{identifier}` |
| `brands` type | `string` (comma separated) | `string[]` |

The divergence in `brands` alone means no single client-side type can model both. Normalising this is the BFF's job.

## Field-level hazards

- A product document has ~251 keys. Always send `fields=` to keep payloads sane.
- `nutriments` keys are hyphenated and carry four suffix variants per nutrient (`salt`, `salt_100g`, `salt_unit`, `salt_value`, sometimes `salt_modifier`). `_100g` is the only one comparable across products.
- `nova_group` is `null` on plenty of well-known products (Nutella included). Treat "unknown" as a first-class value, not an error.
- `nutriscore_grade` is a lowercase letter, or the literal string `"unknown"`, or `"not-applicable"`.
- Taxonomy tags are language-prefixed (`en:sweet-spreads`). The prefix is part of the identifier, never strip it for lookups, only for display.
- `quantity` is free text (`"400.0 g"`). Not parseable in the general case.
- Nutriment values carry the noise of how they were stored, in both services. A declared `0.2` g of fat comes back as `0.20000000298023` (the value went through a 32-bit float), and a salt derived from sodium as `0.607999999999999`. The mapper rounds to six significant digits, which is what a 32-bit float preserves, so it recovers the figure that was typed without inventing precision the source never had. In a sample of 10,000 products, 2,015 of 90,000 nutrient cells carried noise of this kind.

## Pagination and counts

`Search-a-licious` returns `is_count_exact: false` once the match set passes the Elasticsearch tracking threshold, with `count` pinned at 10000. The UI must render that as "10,000+" rather than claiming an exact total.

`page_count` is derived from the truncated count. Paging past the threshold is refused rather than answered empty: once `page * page_size` passes 10,000 the service returns a 400.

```
GET /search?page_size=24&page=416    -> 200, 24 hits   (9,984 rows deep)
GET /search?page_size=24&page=417    -> 400  Maximum number of returned results is 10 000
```

Requested pages are clamped to that ceiling in the BFF, and the CSV export stops at it. `page_size` is accepted up to the same 10,000, so the whole window fits in one request, but that request takes about ten seconds and returns nothing until it is done. The export reads pages of 1,000 instead: the first rows reach the reader after one page, not after all ten.

## Absence is signalled two ways

Verified against the live service:

| Request | HTTP | `status` | `status_verbose` |
| --- | --- | --- | --- |
| `/product/3017620425035` (exists) | 200 | 1 | — |
| `/product/99999999999999` (well-formed, uncatalogued) | 404 | 0 | product not found |
| `/product/1` (malformed) | 200 | 0 | no code or invalid code |

So HTTP status alone is not sufficient to detect a missing product, and neither is the `status` field alone. Both are checked.

## Sorting is restricted to indexed fields

`sort_by` only accepts fields the index declares sortable. Confirmed working: `nutriscore_score` (ascending is best-first, it is a penalty score), `-popularity_key`, `-unique_scans_n`. Confirmed rejected with a Pydantic validation error: anything under `nutriments.*`. There is no server-side sort by sugar, salt or protein content.

A request without `q` must carry a `sort_by`, or it is rejected with a 400 as well. The unfiltered directory therefore sends `-popularity_key` even when the reader picked Relevance.

## Facet counts are exact; the hit count is not

These two figures in the same response describe different populations, and mixing them produces a page that contradicts itself.

```
GET /search?page_size=24          -> count: 10000  (capped, is_count_exact: false)
   facets.nutriscore_grade.items  -> sums to 3,585,939
```

Elasticsearch stops _tracking hits_ at the threshold but still aggregates over every matching document, so facet counts are real totals across the catalogue while `count` is a ceiling. A "products counted" tile fed from `count` sitting beside a chart fed from the facets states 10,000 and 3.5 million as if they measured the same thing.

Where a population size is needed for percentages, it comes from summing the facet buckets, not from `count`.

## The two services disagree about product names

The same barcode can carry a different name in each service, and the search index is not simply a stale copy: it holds a field the other does not.

```
3274080005003
  v2:      product_name "isabelle"      product_name_en "Cristaline"
  search:  product_name "Eau de source" product_name_en absent
```

Three names, of which "isabelle" is a contribution nobody reviewed and "Cristaline" is the brand repeated into the name field. A directory card and the product page it links to are therefore free to disagree, and they do.

This is not fixable from our side. Picking "whichever looks most like a product name" is a heuristic over vandalism, and it would be wrong in both directions on a catalogue this size. Fetching the search document again on the product page would only move the inconsistency, not remove it.

So the mapper applies one rule consistently, `product_name_en` then `product_name`, and the divergence is accepted as a property of the data. The end-to-end test for directory navigation asserts the barcode, not the heading, because the heading is genuinely allowed to differ.

## The query parser fails silently

`q` is parsed as Lucene. Unescaped input does not raise an error, it changes meaning: `q=foo: bar"baz` returns `count: 0` rather than a 400. A product whose name contains a colon would appear not to exist. Values are escaped in `server/utils/lucene.ts`.

## Rate limits and etiquette

Open Food Facts asks every client to send a descriptive `User-Agent`. Browsers cannot set that header, which is the second reason all traffic goes through our server. Documented ceilings are 100 req/min for product and search reads and 10 req/min for facet reads, so BFF responses are cached.

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

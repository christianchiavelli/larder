# 2. The filter state lives in the URL

**Status:** Accepted · **Decided:** 2026-09-14 · **Commit:** `643024b`

## Context

The directory carries six filter dimensions, a sort, a page and a page size. The reflex is a store: a reactive object, a component that writes to it, a watcher that refetches, and a second watcher that reads the URL to restore it on load.

That is three places holding the same fact, and the bug it produces is always the same one — they drift, and the URL stops describing the page.

## Decision

The URL is the state. `useProductQuery` derives the query from `route.query` by parsing it with `productQuerySchema`, and writes back by pushing a new query (`app/composables/use-product-query.ts`). There is no store and no watcher.

The same schema parses the client's URL and the server's query string, so there is one definition of what a valid query is, used at both ends.

## Consequences

- Sharing, bookmarking, Back and Forward work without any code that knows about them.
- A link someone else opens is the page they were looking at, filters and all.
- The query parser is forgiving on purpose: a hand-edited URL with `page=banana` gets the default page rather than an error page, because a URL is an input a reader can type.
- Changing a filter is a navigation. Every commit to the URL is a history entry, so the search box debounces and only writes once the typing pauses — otherwise Back would walk through a word letter by letter.
- Reading the URL on every render means parsing it on every render. The schema is small and the cost is not measurable, but it is there.

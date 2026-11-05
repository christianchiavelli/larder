# 6. An export holds every match, or it does not happen

**Status:** Accepted · **Decided:** 2026-09-25 · **Commit:** `4adf562`

## Context

The directory can be exported as a CSV. The search index behind it stops at 10,000 rows: past that it answers `is_count_exact: false` with the count pinned at 10,000, and paging beyond the ceiling is refused with a 400 rather than answered empty (`docs/upstream-api.md`).

An export that takes whatever the index will give, and stops where it stops, produces a file that looks complete and is not. Whoever opens it in a spreadsheet has no way to tell that it holds the first ten thousand of forty thousand, and will report the numbers.

## Decision

The export asks the index for the match count first, and decides before writing anything (`shared/domain/export.ts`). An inexact count, or one above the ceiling, is `too-many`: the route answers 422 with the reason and the limit, and the dialog asks for one more filter instead of offering a download.

When the match set fits, the CSV streams: one upstream page of 1,000 rows at a time, each page written as it arrives (`server/services/product-export.ts`).

## Consequences

- A partial file never passes for a whole one. The reader is told to narrow the search, which is a question they can answer, instead of being handed an arbitrary slice.
- The first rows reach the reader after one page, not after ten. The download starts moving in about a second on a large export.
- A failure halfway ends the download in an error rather than in silence, so a truncated file is visible as a truncated file.
- A legitimate search larger than the ceiling cannot be exported at all. The dialog links to the full data set dump instead, which is the honest answer: this app cannot give what it could not read.
- The count is a request of its own before the export begins. On a small export that is work done twice, and it is the price of never guessing.

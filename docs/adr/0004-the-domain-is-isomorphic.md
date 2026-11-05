# 4. The domain is isomorphic, and owes nothing upstream

**Status:** Accepted · **Decided:** 2026-09-14 · **Commit:** `3168421`

## Context

The catalogue is read from two upstream services that disagree with each other. `brands` is a comma-separated string on one and an array on the other. `nutriscore_grade` is a lowercase letter, or the literal `"unknown"`, or `"not-applicable"`. A product document has about 251 keys, and the ones that matter arrive with four suffix variants each (`docs/upstream-api.md`).

Two shapes have to agree: the one the server sends and the one the client expects. Typed twice, they drift, and the drift shows up as `undefined` in a template.

## Decision

`shared/domain` holds Zod schemas and pure functions, and nothing else. It does no I/O, imports nothing from `server/` or `app/`, and is reachable from both through `#shared`.

The upstream shapes live in `server/upstream/`, which maps them into the domain. The domain never sees an upstream field name.

## Consequences

- One schema validates what upstream answered and types what the client receives. There is no second definition to forget to update.
- Every rule — a Nutri-Score is one of five letters or one of two reasons for not having one, a NOVA group is 1 to 4 — is stated once, and every layer reads the same statement.
- The domain is pure, so it is testable to 100% with no fixtures beyond plain objects, which is why `shared/domain` holds a 100% floor in the coverage gate (ADR 5).
- `zod-config.ts` has to be the first import in each domain module: it tells Zod to compile parsers without `new Function` when running in a browser, which the Content-Security-Policy refuses (ADR 1). A module that forgets it throws at load, in the browser, where the unit tests would never see it.
- "Missing" is a value here, not a zero. A nutrient nobody reported is `null`, and the distinction between "excluded by the scheme" and "not graded yet" is preserved all the way to the badge and the filter, because collapsing them would report a deliberate exclusion as missing data.

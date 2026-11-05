# 5. The coverage floor is set by area

**Status:** Accepted · **Decided:** 2026-11-04 · **Commit:** `c4ec90c`

## Context

The gate was one global average: 95 statements, 94 branches, 96 functions, 95 lines. The suite sat at 96.2 / 95.2 / 97.4 / 96.7 — between a tenth of a point and one point above it.

A gate that close to the line fails for reasons that are not defects. One deleted test, or one new file with a dozen branches, turns a build red while nothing is wrong with the code. And the second-order effect is worse than the first: when the number is always at the limit, it stops reading as something to clear and starts reading as a ceiling.

The average also says nothing about where the risk is. A hundred untested branches in a composable and a hundred in the domain are one number.

## Decision

The global floor drops to 93 / 91 / 94 / 93, well under what the suite reaches, and each area answers for itself (`vitest.config.ts`):

| Area                  | Floor                 |
| --------------------- | --------------------- |
| `shared/domain`       | 99 / 96 / 100 / 100   |
| `server/services`     | 94 / 89 / 99 / 95     |
| `server/upstream`     | 96 / 95 / 95 / 96     |
| `server/utils`        | 90 / 91 / 92 / 90     |
| `app/api`             | 100 / 100 / 100 / 100 |
| `app/composables`     | 95 / 89 / 93 / 95     |
| `layers/ui/app/utils` | 99 / 99 / 99 / 99     |

Each floor sits about two points under what the area reaches today.

`app/composables/use-theme.ts` is excluded rather than left pulling the average down. It is a VueUse wrapper that reads and writes the document; what it decides is checked by the bootstrap script's unit test and by the end-to-end scans of both themes.

## Consequences

- A new file no longer fails a build that is otherwise in good shape.
- The domain cannot lose a test unnoticed: functions and lines at 100 means an untested function fails the build, which is the intent.
- Adding a genuinely untestable file to an area now requires a decision — exclude it and say why, as with `use-theme.ts` — rather than letting it average out. That is the failure mode this trades against, and it is visible in review.
- The floors need revisiting when an area's shape changes. `server/utils` at 90 reflects a client with retry paths that are hard to exercise; if that is rewritten, the floor should follow the new shape rather than stay where it was.

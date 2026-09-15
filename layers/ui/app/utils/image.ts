/**
 * Responsive image sources.
 *
 * Generic on purpose: a list of URLs with the width each one is, in, out a
 * `srcset` string. It knows nothing about what is being pictured.
 */

export interface ImageSource {
  url: string | null
  /** Intrinsic width in pixels, as published. */
  width: number
}

/**
 * Builds a `srcset` from the widths that actually exist.
 *
 * Returns `undefined` rather than an empty string when nothing resolves,
 * because an empty `srcset` attribute is not ignored: some engines treat it as
 * a candidate list with no valid entry and skip the `src` as well.
 *
 * Getting this wrong is silent in the direction that costs bandwidth. A browser
 * handed one oversized candidate downloads it happily, and the page looks
 * identical to one that picked correctly.
 */
export function srcSet(sources: ImageSource[]): string | undefined {
  const entries = sources
    .filter((source): source is ImageSource & { url: string } => Boolean(source.url))
    // Widths must be distinct: two candidates declared at the same width leave
    // the browser free to pick either, so the saving becomes a coin toss.
    .filter((source, index, all) => all.findIndex((s) => s.width === source.width) === index)
    .map((source) => `${source.url} ${source.width}w`)

  return entries.length > 0 ? entries.join(', ') : undefined
}

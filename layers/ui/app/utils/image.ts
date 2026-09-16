export interface ImageSource {
  url: string | null
  /** Intrinsic width in pixels, as published. */
  width: number
}

/**
 * Returns `undefined` rather than an empty string: some engines read an empty
 * `srcset` as a candidate list with nothing valid and skip `src` too.
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

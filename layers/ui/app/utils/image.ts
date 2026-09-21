export interface ImageSource {
  url: string | null
  width: number
}

export function srcSet(sources: ImageSource[]): string | undefined {
  const entries = sources
    .filter((source): source is ImageSource & { url: string } => Boolean(source.url))
    .filter((source, index, all) => all.findIndex((s) => s.width === source.width) === index)
    .map((source) => `${source.url} ${source.width}w`)

  return entries.length > 0 ? entries.join(', ') : undefined
}

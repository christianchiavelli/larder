interface ReducedFetchError {
  statusCode: number | undefined
}

export default definePayloadPlugin(() => {
  definePayloadReducer(
    'FetchError',
    (value: unknown): ReducedFetchError | false =>
      value instanceof Error &&
      value.name === 'FetchError' && { statusCode: (value as { statusCode?: number }).statusCode },
  )

  definePayloadReviver('FetchError', ({ statusCode }: ReducedFetchError) =>
    Object.assign(new Error('The request failed'), { name: 'FetchError', statusCode }),
  )
})

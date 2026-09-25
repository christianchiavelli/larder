import { onServerPrefetch, type Ref } from 'vue'

export function useErrorStatus(error: Readonly<Ref<unknown>>, settle: () => Promise<unknown>) {
  const event = useRequestEvent()
  if (!event) return

  onServerPrefetch(async () => {
    await settle()
    if (!error.value) return
    setResponseStatus(event, (error.value as { statusCode?: number }).statusCode ?? 500)
  })
}

/**
 * Open Food Facts as it answered once, for the Web Vitals: a page timed
 * against the live services would be timed on their latency as much as on
 * its own work.
 *
 *   RECORD=1  forwards each request to the service and keeps what it answered
 *   unset     answers from what was kept, and refuses anything else
 *
 * Both services sit on one port, each behind a prefix of its own, which the
 * app is pointed at through NUXT_OPEN_FOOD_FACTS_SEARCH_BASE and
 * NUXT_OPEN_FOOD_FACTS_PRODUCT_BASE.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'

const SERVICES = {
  '/search': 'https://search.openfoodfacts.org',
  '/world': 'https://world.openfoodfacts.org',
}
const FILE = new URL('../vitals/catalogue.json', import.meta.url)
const USER_AGENT = 'Larder/0.1 (+https://github.com/christianchiavelli/larder)'
const recording = process.env.RECORD === '1'

const catalogue = recording
  ? { recorded: new Date().toISOString().slice(0, 10), answers: {} }
  : JSON.parse(readFileSync(FILE, 'utf8'))

/** One answer a line, so a new recording reads as a diff of the requests that changed. */
function save() {
  const answers = Object.entries(catalogue.answers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([request, answer]) => `    ${JSON.stringify(request)}: ${JSON.stringify(answer)}`)
  writeFileSync(
    FILE,
    `{\n  "recorded": ${JSON.stringify(catalogue.recorded)},\n  "answers": {\n${answers.join(',\n')}\n  }\n}\n`,
  )
}

async function ask(service, request) {
  const response = await fetch(service + request, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
  })
  const text = await response.text()
  let body = text
  try {
    body = JSON.parse(text)
  } catch {
    // Kept as text: whatever it was, it is answered back the same.
  }
  return { status: response.status, body }
}

createServer(async (request, response) => {
  const url = request.url ?? '/'
  const prefix = Object.keys(SERVICES).find((name) => url.startsWith(`${name}/`))
  const key = `${request.method} ${url}`

  if (!prefix || request.method !== 'GET') {
    response.writeHead(404).end()
    return
  }

  let answer = catalogue.answers[key]
  if (recording && !answer) {
    answer = await ask(SERVICES[prefix], url.slice(prefix.length))
    catalogue.answers[key] = answer
    save()
  }

  if (!answer) {
    console.error(`Not in the recording: ${key}. Record it again with \`pnpm vitals:record\`.`)
    response.writeHead(502, { 'content-type': 'application/json' }).end('{}')
    return
  }

  const text = typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body)
  response.writeHead(answer.status, { 'content-type': 'application/json' }).end(text)
}).listen(Number(process.env.PORT))

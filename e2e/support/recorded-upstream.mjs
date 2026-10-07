/**
 * Open Food Facts as it answered once, for the Web Vitals: a page timed
 * against the live services would be timed on their latency as much as on
 * its own work. That holds for the photos too, which a product page is
 * measured by.
 *
 *   RECORD=1  forwards each request to the service and keeps what it answered
 *   unset     answers from what was kept, and refuses anything else
 *
 * Both services sit on one port, each behind a prefix of its own, which the
 * app is pointed at through NUXT_OPEN_FOOD_FACTS_SEARCH_BASE and
 * NUXT_OPEN_FOOD_FACTS_PRODUCT_BASE. The photos keep their own paths, under
 * /images, and the answers name them here instead of at Open Food Facts, so
 * the pages load them through the same slow connection as everything else;
 * NUXT_PUBLIC_OPEN_FOOD_FACTS_IMAGE_ORIGIN lets them in.
 */
import { rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname } from 'node:path'
import {
  PHOTOS,
  PHOTO_FILES,
  USER_AGENT,
  photo,
  readCatalogue,
  saveCatalogue,
} from './catalogue.mjs'

const SERVICES = {
  '/search': 'https://search.openfoodfacts.org',
  '/world': 'https://world.openfoodfacts.org',
}
const PHOTO_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }
const HERE = `http://localhost:${process.env.PORT}`
const recording = process.env.RECORD === '1'

const catalogue = recording
  ? { recorded: new Date().toISOString().slice(0, 10), answers: {} }
  : readCatalogue()

// A new recording keeps no photo from the last one.
if (recording) rmSync(PHOTO_FILES, { recursive: true, force: true })

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
  const path = new URL(url, HERE).pathname

  if (request.method === 'GET' && path.startsWith('/images/')) {
    const answer = await photo(catalogue, path, { fetching: recording })
    if (!answer) {
      console.error(
        `Not in the recording: GET ${path}. Record it again with \`pnpm vitals:record\`.`,
      )
      response.writeHead(502).end()
      return
    }
    const type = PHOTO_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
    response.writeHead(answer.status, answer.bytes ? { 'content-type': type } : {})
    response.end(answer.bytes)
    return
  }

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
    saveCatalogue(catalogue)
  }

  if (!answer) {
    console.error(`Not in the recording: ${key}. Record it again with \`pnpm vitals:record\`.`)
    response.writeHead(502, { 'content-type': 'application/json' }).end('{}')
    return
  }

  const text = typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body)
  // Kept as Open Food Facts gave them, the answers name its photos: they are served from here.
  response
    .writeHead(answer.status, { 'content-type': 'application/json' })
    .end(text.replaceAll(`${PHOTOS}/`, `${HERE}/`))
}).listen(Number(process.env.PORT))

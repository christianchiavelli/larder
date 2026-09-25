import { createServer } from 'node:http'

createServer((_request, response) => {
  response.writeHead(429, { 'content-type': 'application/json', 'retry-after': '30' })
  response.end('{}')
}).listen(Number(process.env.PORT))

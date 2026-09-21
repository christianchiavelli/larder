import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const TOKENS_PATH = 'layers/ui/app/assets/css/tokens.css'

const source = readFileSync(resolve(TOKENS_PATH), 'utf8')

function declarationsIn(selector: string): Map<string, string> {
  const block = new RegExp(`^${selector}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(source)
  if (!block?.[1]) throw new Error(`${TOKENS_PATH} has no ${selector} block`)

  const declarations = new Map<string, string>()
  for (const [, name, value] of block[1].matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    declarations.set(name!, value!.replace(/\/\*[\s\S]*?\*\//g, '').trim())
  }
  return declarations
}

export const LIGHT_TOKENS = declarationsIn(':root')

export function resolveToken(token: string, seen = new Set<string>()): string {
  if (seen.has(token)) throw new Error(`${token} resolves in a cycle`)
  seen.add(token)

  const value = LIGHT_TOKENS.get(token)
  if (value === undefined) throw new Error(`${token} is not declared in :root`)

  const reference = /^var\((--[\w-]+)\)$/.exec(value)
  return reference ? resolveToken(reference[1]!, seen) : value
}

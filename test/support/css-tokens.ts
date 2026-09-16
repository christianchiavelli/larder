import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Read off disk, not imported: a `?raw` import goes through Vite with the
 * Tailwind plugin attached, which rewrites the file. The path resolves from the
 * project root, so moving a spec cannot repoint it at nothing.
 */
const TOKENS_PATH = 'layers/ui/app/assets/css/tokens.css'

const source = readFileSync(resolve(TOKENS_PATH), 'utf8')

/** Custom properties declared in one block, as written. */
function declarationsIn(selector: string): Map<string, string> {
  // Non-greedy up to the first closing brace at the start of a line, which is
  // how every block in tokens.css ends. Nested blocks would break this; there
  // are none, and a nested block inside a token file would be the real problem.
  const block = new RegExp(`^${selector}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(source)
  if (!block?.[1]) throw new Error(`${TOKENS_PATH} has no ${selector} block`)

  const declarations = new Map<string, string>()
  for (const [, name, value] of block[1].matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    // Strip trailing comments, which several values carry to record how they
    // were derived.
    declarations.set(name!, value!.replace(/\/\*[\s\S]*?\*\//g, '').trim())
  }
  return declarations
}

/** The light theme, which is what both hard-coded copies stand in for. */
export const LIGHT_TOKENS = declarationsIn(':root')

/** Follows `var()` chains down to the literal the browser would compute. */
export function resolveToken(token: string, seen = new Set<string>()): string {
  if (seen.has(token)) throw new Error(`${token} resolves in a cycle`)
  seen.add(token)

  const value = LIGHT_TOKENS.get(token)
  if (value === undefined) throw new Error(`${token} is not declared in :root`)

  const reference = /^var\((--[\w-]+)\)$/.exec(value)
  return reference ? resolveToken(reference[1]!, seen) : value
}

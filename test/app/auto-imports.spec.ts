import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SCANNED: { dirs: string[]; manifest: string }[] = [
  {
    dirs: ['app/composables', 'app/utils', 'layers/ui/app/composables', 'layers/ui/app/utils'],
    manifest: '.nuxt/imports.d.ts',
  },
  { dirs: ['server/utils'], manifest: '.nuxt/types/nitro-imports.d.ts' },
]

function tsFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return tsFiles(path)
    return extname(entry.name) === '.ts' ? [path] : []
  })
}

function exportedNames(source: string): string[] {
  const names: string[] = []
  for (const line of source.split('\n')) {
    const match = /^export\s+(?:const|let|var|function|async function|class)\s+(\w+)/.exec(
      line.trim(),
    )
    if (match?.[1]) names.push(match[1])
  }
  return names
}

describe('auto-imports', () => {
  const prepared = SCANNED.every(({ manifest }) => existsSync(manifest))

  it.skipIf(!prepared)('every exported name reaches its generated manifest', () => {
    const missing: string[] = []

    for (const { dirs, manifest } of SCANNED) {
      const generated = readFileSync(manifest, 'utf8')
      for (const dir of dirs) {
        for (const file of tsFiles(dir)) {
          for (const name of exportedNames(readFileSync(file, 'utf8'))) {
            if (!new RegExp(`\\b${name}\\b`).test(generated)) {
              missing.push(`${name} (${file.replace(/\\/g, '/')})`)
            }
          }
        }
      }
    }

    expect(missing).toEqual([])
  })
})

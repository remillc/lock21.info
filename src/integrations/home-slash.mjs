// Astro integration (astro.config.mjs): after the build, the two home pages get their final slash back, / and /en/.
// They are collections; every other page is a resource, without the slash (trailingSlash: 'never', which Astro and
// Starlight apply to the whole site, the homes included: /en, https://lock21.info). Rewrites the built pages' links,
// language menu, canonical and alternate addresses, and the sitemap. The hosting serves /en/ (worker/index.js).
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixes = [
  [/(href|value|content)="(https:\/\/lock21\.info)?\/en"/g, '$1="$2/en/"'],
  [/(href|value|content)="(https:\/\/lock21\.info)?\/en([?#])/g, '$1="$2/en/$3'],
  [/"https:\/\/lock21\.info"/g, '"https://lock21.info/"'],
  [/<loc>https:\/\/lock21\.info\/en<\/loc>/g, '<loc>https://lock21.info/en/</loc>'],
]

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else if (/\.(html|xml)$/.test(entry.name)) yield path
  }
}

export default function homeSlash() {
  return {
    name: 'lock21-home-slash',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        let changed = 0
        for await (const path of files(fileURLToPath(dir))) {
          const before = await readFile(path, 'utf8')
          const after = fixes.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), before)
          if (after !== before) {
            await writeFile(path, after)
            changed++
          }
        }
        logger.info(`home pages at / and /en/: ${changed} files`)
      },
    },
  }
}

// Sert les tuiles en local avec CORS, comme le fait R2 (origine différente du site): http-server sans cache.
import { spawnSync } from 'node:child_process'
import { cli, paths } from './lib/pipeline.mjs'

const o = cli(`Sert les tuiles en local avec CORS, comme le fait R2 (origine différente du site).

Usage: npm run model:serve-tiles [-- options]

  -T, --tiles-root <dir>  dossier servi (défaut ${paths.tiles})
  -p, --port <n>          port (défaut 8081)
  -l, --lan               écouter sur toutes les interfaces réseau (test depuis un téléphone en Wi-Fi)
  -h, --help              afficher cette aide`, {
  'tiles-root': { type: 'string', short: 'T', default: paths.tiles },
  port: { type: 'string', short: 'p', default: '8081' },
  lan: { type: 'boolean', short: 'l' },
})
// -c-1: pas de cache, pour voir immédiatement une nouvelle version. npx est un .cmd sous Windows, d'où le shell
const args = ['--yes', 'http-server@14.1.1', `"${o['tiles-root']}"`, '-p', o.port, '-a', o.lan ? '0.0.0.0' : '127.0.0.1', '--cors', '-c-1']
const { status } = spawnSync('npx', args, { stdio: 'inherit', shell: true })
process.exitCode = status ?? 1

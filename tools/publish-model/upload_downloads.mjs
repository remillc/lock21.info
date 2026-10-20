// Synchronises the downloads (O:\publishing\downloads\online) with downloads/ in the Cloudflare R2 bucket, served at
// https://tiles.lock21.info/downloads/ and linked from the /modele/ page.
//
// - Every local file is uploaded, except unchanged ones (same size) and parts already online (their name carries a
//   hash of the content: same name, same part).
// - google-earth/parts/*.kmz (one per zone and piece of context, the name carries a hash of the content, see
//   tools/google-earth/make_kmz.py --network): one-year cache. google-earth/lock-21.kml, the list of parts read by
//   the downloaded KMZ: 5-minute cache, so an added zone shows up quickly. Other files: one-hour cache.
// - Clean-up: objects under downloads/ with no local counterpart are deleted (old parts). --no-prune keeps them.
// - The tiles (upload_r2.mjs) are never touched. Credentials from .env.local, never printed.
//
// Usage: node upload_downloads.mjs [-n|--dry-run] [--no-prune] [-r|--root O:\publishing\downloads\online]
//        node upload_downloads.mjs -h | --help
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const argv = process.argv.slice(2)
if (argv.some((a) => a === '-h' || a === '--help')) {
  const header = (await readFile(fileURLToPath(import.meta.url), 'utf8')).split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const dryRun = argv.includes('-n') || argv.includes('--dry-run')
const prune = !argv.includes('--no-prune')
const rootIndex = Math.max(argv.indexOf('-r'), argv.indexOf('--root'))
const root = rootIndex >= 0 ? argv[rootIndex + 1] : 'O:\\publishing\\downloads\\online'
const PREFIX = 'downloads/'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
process.loadEnvFile(join(repo, '.env.local'))
for (const key of ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']) {
  if (!process.env[key]) throw new Error(`${key} manquant dans .env.local`)
}
const bucket = process.env.R2_BUCKET
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
})

const TYPES = {
  '.kml': 'application/vnd.google-earth.kml+xml',
  '.kmz': 'application/vnd.google-earth.kmz',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
}
const typeOf = (key) => TYPES[key.slice(key.lastIndexOf('.'))] || 'application/octet-stream'
const cacheOf = (key) =>
  key.includes('/parts/') ? 'public, max-age=31536000, immutable' : key.endsWith('.kml') ? 'public, max-age=300' : 'public, max-age=3600'

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else yield path
  }
}

// What is online now (key -> size)
const remote = new Map()
let token
do {
  const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }))
  for (const object of page.Contents || []) remote.set(object.Key, object.Size)
  token = page.IsTruncated ? page.NextContinuationToken : undefined
} while (token)

// Upload: the parts first, the list (.kml) and the downloadable files last, so a list never points to a missing part
const local = []
for await (const path of files(root)) local.push({ path, key: PREFIX + relative(root, path).split(sep).join('/') })
local.sort((a, b) => (a.key.includes('/parts/') ? 0 : 1) - (b.key.includes('/parts/') ? 0 : 1))
let sent = 0
let bytes = 0
for (const { path, key } of local) {
  const size = (await stat(path)).size
  if ((remote.get(key) === size && !key.endsWith('.kml')) || (key.includes('/parts/') && remote.has(key))) continue
  if (!dryRun) {
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: await readFile(path), ContentType: typeOf(key), CacheControl: cacheOf(key),
    }))
  }
  sent++
  bytes += size
  console.log(`  ${dryRun ? 'à envoyer' : 'envoyé'}: ${key} (${(size / 1e6).toFixed(1)} Mo)`)
}
console.log(`bucket ${bucket}: ${sent} fichiers ${dryRun ? 'à envoyer' : 'envoyés'}, ${(bytes / 1e6).toFixed(1)} Mo`)

// Clean-up: online files under downloads/ that no longer exist locally (old parts)
if (prune) {
  const keys = new Set(local.map((f) => f.key))
  const stale = [...remote.keys()].filter((key) => !keys.has(key))
  for (let i = 0; i < stale.length && !dryRun; i += 1000) {
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: stale.slice(i, i + 1000).map((Key) => ({ Key })) } }))
  }
  for (const key of stale) console.log(`  ${dryRun ? 'à supprimer' : 'supprimé'}: ${key}`)
  console.log(`nettoyage: ${stale.length} fichiers ${dryRun ? 'à supprimer' : 'supprimés'}`)
}

// Synchronises the published tiles (O:\publishing\tiles) with the Cloudflare R2 bucket.
//
// - Versions are immutable: a version folder is uploaded only if its entry file (tileset.json or .glb) is
//   missing from the bucket. Its files get a one-year cache (Cache-Control: immutable).
// - manifest.json is uploaded last, with a short cache, so a new version becomes visible within a minute.
//   robots.txt (Disallow: /) is uploaded too: the tiles domain serves data only, nothing to index.
// - Clean-up: version folders referenced neither by the new manifest nor by the previous one (read from
//   the bucket before uploading) are deleted. The previous generation is kept for visitors whose
//   manifest is still cached. --no-prune keeps everything.
// - Credentials come from .env.local at the repository root (R2_ENDPOINT, R2_ACCESS_KEY_ID,
//   R2_SECRET_ACCESS_KEY, R2_BUCKET) and are never printed.
//
// Usage: node upload_r2.mjs [-n|--dry-run] [--no-prune] [-r|--root O:\publishing\tiles]
//        node upload_r2.mjs -h | --help
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3'

const argv = process.argv.slice(2)
if (argv.some((a) => a === '-h' || a === '--help')) {
  const header = (await readFile(fileURLToPath(import.meta.url), 'utf8')).split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const dryRun = argv.includes('-n') || argv.includes('--dry-run')
const prune = !argv.includes('--no-prune')
const rootIndex = Math.max(argv.indexOf('-r'), argv.indexOf('--root'))
const root = rootIndex >= 0 ? argv[rootIndex + 1] : 'O:\\publishing\\tiles'

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

const TYPES = { '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.ktx2': 'image/ktx2' }
const IMMUTABLE = 'public, max-age=31536000, immutable'
const MANIFEST_CACHE = 'public, max-age=60'
const toKey = (path) => relative(root, path).split(sep).join('/')
const typeOf = (key) => TYPES[key.slice(key.lastIndexOf('.'))] || 'application/octet-stream'

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound') return false
    throw error
  }
}

async function remoteManifest() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'manifest.json' }))
    return JSON.parse(await res.Body.transformToString())
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || error.name === 'NoSuchKey') return null
    throw error
  }
}

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else yield path
  }
}

async function put(path, cacheControl) {
  const key = toKey(path)
  if (!dryRun) {
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: await readFile(path), ContentType: typeOf(key), CacheControl: cacheControl,
    }))
  }
  return (await stat(path)).size
}

// Version folders referenced by a manifest: "zone-12/2026-10-18-1332/tileset.json" -> "zone-12/2026-10-18-1332/"
const versionsOf = (manifest) => new Set([...(manifest?.tilesets || []), ...(manifest?.models || [])]
  .map((entry) => entry.url.slice(0, entry.url.lastIndexOf('/') + 1)))

const local = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
const previous = await remoteManifest()
const wanted = versionsOf(local)
const keep = new Set([...wanted, ...versionsOf(previous)])
console.log(`bucket ${bucket}${dryRun ? ' (essai, rien n\'est envoyé)' : ''}: ${wanted.size} versions dans le manifeste local`)

// 1. Missing versions (entry file absent from the bucket), uploaded with a few requests in parallel
let uploadedFiles = 0
let uploadedBytes = 0
for (const entry of [...(local.tilesets || []), ...(local.models || [])]) {
  if (await exists(entry.url)) {
    console.log(`  ${entry.id}: déjà en ligne (${entry.url})`)
    continue
  }
  const dir = join(root, ...entry.url.split('/').slice(0, -1))
  const paths = []
  for await (const path of files(dir)) paths.push(path)
  // The entry file last: a version only "exists" once all its tiles are uploaded
  paths.sort((a, b) => (toKey(a) === entry.url) - (toKey(b) === entry.url))
  const body = paths.filter((p) => toKey(p) !== entry.url)
  for (let i = 0; i < body.length; i += 16) {
    const sizes = await Promise.all(body.slice(i, i + 16).map((p) => put(p, IMMUTABLE)))
    uploadedBytes += sizes.reduce((a, b) => a + b, 0)
  }
  uploadedBytes += await put(join(dir, entry.url.split('/').pop()), IMMUTABLE)
  uploadedFiles += paths.length
  console.log(`  ${entry.id}: ${dryRun ? 'à envoyer' : 'envoyé'} (${paths.length} fichiers, ${entry.url})`)
}

// 2. robots.txt (the tiles domain serves only data: nothing to index), then the manifest last
try {
  uploadedBytes += await put(join(root, 'robots.txt'), 'public, max-age=86400')
  uploadedFiles++
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
uploadedBytes += await put(join(root, 'manifest.json'), MANIFEST_CACHE)
uploadedFiles++
console.log(`manifeste ${dryRun ? 'à envoyer' : 'envoyé'}; total ${uploadedFiles} fichiers, ${(uploadedBytes / 1e6).toFixed(1)} Mo`)

// 3. Clean-up of versions referenced neither by the new manifest nor by the previous one
if (prune) {
  const stale = []
  let token
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }))
    for (const object of page.Contents || []) {
      if (object.Key === 'manifest.json' || object.Key === 'robots.txt') continue
      const version = object.Key.split('/').slice(0, 2).join('/') + '/'
      if (!keep.has(version)) stale.push(object.Key)
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
  const versions = new Set(stale.map((k) => k.split('/').slice(0, 2).join('/')))
  for (let i = 0; i < stale.length && !dryRun; i += 1000) {
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: stale.slice(i, i + 1000).map((Key) => ({ Key })) } }))
  }
  console.log(`nettoyage: ${stale.length} fichiers${versions.size ? ` (${[...versions].join(', ')})` : ''} ${dryRun ? 'à supprimer' : 'supprimés'}`)
}

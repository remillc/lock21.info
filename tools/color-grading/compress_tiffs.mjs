// The TIFF frames of one or more folders compressed in LZW (lossless), in place (TODO #75, Christian 2026-11-01): Resolve
// renders and flat_color.py (before 2026-11-01) wrote them uncompressed, about 34 MB a frame against 15 MB in LZW;
// the frames rendered earlier were compressed by O:\scripts\compressTifFiles.ps1, deleted on 2026-11-01 (ImageMagick, in place). The same
// ImageMagick command (magick <in> -compress lzw <out>), but each frame written to a temporary file, its pixels
// compared with the original's (identical, or the original is kept), then moved over it: a frame is never left half
// written. Frames already compressed are skipped, so a run can be started again after a stop; stale .tmp files of an
// interrupted run are removed. Metashape reads LZW TIFF (the frames of every zone but 3 and 4 are).
//
// Usage: node tools/color-grading/compress_tiffs.mjs [-j 12] [-n] <folder> [<folder> ...]
//   -j, --jobs     frames at a time (default 12)
//   -n, --dry-run  only count the frames to compress and their size
//   -h, --help     this help
import { execFile } from 'node:child_process'
import { closeSync, openSync, readSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const run = promisify(execFile)
const { values: args, positionals: folders } = parseArgs({
  allowPositionals: true,
  options: {
    jobs: { type: 'string', short: 'j', default: '12' },
    'dry-run': { type: 'boolean', short: 'n', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})
if (args.help || !folders.length) {
  const text = (await import('node:fs')).readFileSync(new URL(import.meta.url), 'utf8').split('\n')
  console.log(text.slice(0, text.findIndex((l) => l.startsWith('import'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(folders.length || args.help ? 0 : 1)
}
sharp.concurrency(1)

/** A TIFF's compression (tag 259: 1 none, 5 LZW) and predictor (tag 317: 1 none, 2 horizontal), from its first IFD */
function tags(path) {
  const fd = openSync(path, 'r')
  try {
    const head = Buffer.alloc(8)
    readSync(fd, head, 0, 8, 0)
    const le = head.toString('latin1', 0, 2) === 'II'
    const u16 = (b, o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o))
    const ifd = le ? head.readUInt32LE(4) : head.readUInt32BE(4)
    const count = Buffer.alloc(2)
    readSync(fd, count, 0, 2, ifd)
    const n = u16(count, 0)
    const entries = Buffer.alloc(n * 12)
    readSync(fd, entries, 0, n * 12, ifd + 2)
    const tag = (id, otherwise) => {
      for (let i = 0; i < n; i++) if (u16(entries, i * 12) === id) return u16(entries, i * 12 + 8)
      return otherwise
    }
    return { compression: tag(259, 1), predictor: tag(317, 1) }
  } finally {
    closeSync(fd)
  }
}

/** Done: LZW with the horizontal predictor. LZW without it hardly compresses a photo (37 of 34 MB: flat_color.py
 *  before 2026-11-01), so such a frame is compressed again */
const isDone = (path) => {
  const t = tags(path)
  return t.compression === 5 && t.predictor === 2
}

/** The decoded pixels of a TIFF */
const pixels = (path) => sharp(path, { limitInputPixels: false }).raw().toBuffer()

for (const folder of folders) {
  const names = readdirSync(folder)
  for (const stale of names.filter((n) => n.endsWith('.lzw.tmp'))) rmSync(join(folder, stale))
  const todo = names.filter((n) => /\.tiff?$/i.test(n) && !isDone(join(folder, n)))
  const before = todo.reduce((sum, n) => sum + statSync(join(folder, n)).size, 0)
  console.log(`${folder}: ${todo.length} of ${names.filter((n) => /\.tiff?$/i.test(n)).length} frames to compress, ${(before / 1e9).toFixed(1)} GB`)
  if (args['dry-run'] || !todo.length) continue
  const started = Date.now()
  let done = 0
  let after = 0
  let kept = 0
  const next = async () => {
    for (let name = todo.shift(); name; name = todo.shift()) {
      const path = join(folder, name)
      const temporary = `${path}.lzw.tmp`
      try {
        await run('magick', [path, '-compress', 'lzw', `tiff:${temporary}`])
        const [a, b] = await Promise.all([pixels(path), pixels(temporary)])
        if (!a.equals(b)) throw new Error('pixels differ')
        after += statSync(temporary).size
        renameSync(temporary, path)
      } catch (error) {
        kept++
        rmSync(temporary, { force: true })
        console.log(`  kept as is: ${name} (${error.message.split('\n')[0]})`)
      }
      if (++done % 500 === 0) console.log(`  ${done} frames, ${((Date.now() - started) / 60000).toFixed(1)} min`)
    }
  }
  await Promise.all(Array.from({ length: Number(args.jobs) }, next))
  console.log(`  done: ${done - kept} compressed, ${kept} kept as is, ${(before / 1e9).toFixed(1)} → ${(after / 1e9 + (before / 1e9) * (kept / Math.max(done, 1))).toFixed(1)} GB, ${((Date.now() - started) / 60000).toFixed(0)} min`)
}

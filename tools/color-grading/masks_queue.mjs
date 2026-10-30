// The rod's masks (TODO #75) for many frames folders, one after another: make_masks.mjs --resume on each, its masks in
// the _masks folder beside it. The folders: those given with -f first (each "<folder>" or "<folder>|<other folder>",
// the second read for the frames not in the first: a folder being renamed by another job), then those used by the
// published model (used_frames.py --json, without the --exclude patterns), a folder that no longer exists left out.
// A log line per folder (start; end with its frames, the rod found, the _masks folder's size before and after, the
// time) in --log; -j folders at a time. --resume makes a run taken up again skip the frames done (their mask already 1-bit).
// Usage: node tools/color-grading/masks_queue.mjs [-f "<folder>[|<other>]"]... [-x <pattern>]... [-l O:/temp/rod-masks.log] [-j 1] [--no-used] [-n]
import { appendFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    first: { type: 'string', short: 'f', multiple: true, default: [] },
    exclude: { type: 'string', short: 'x', multiple: true, default: [] },
    log: { type: 'string', short: 'l', default: 'O:/temp/rod-masks.log' },
    jobs: { type: 'string', short: 'j', default: '1' },
    'no-used': { type: 'boolean' },
    'dry-run': { type: 'boolean', short: 'n' },
    help: { type: 'boolean', short: 'h' },
  },
})
if (args.help) {
  console.log('node tools/color-grading/masks_queue.mjs [-f "<folder>[|<other folder>]"]... [-x <pattern>]... [-l <log>] [-j <n>] [--no-used] [-n]\n' +
    'The rod\'s masks for many frames folders, in turn (make_masks.mjs --resume, masks in _masks beside each).\n' +
    '  -f, --first      a folder to do first, "<folder>|<other folder>" when its frames may be in either (repeatable)\n' +
    '  -x, --exclude    leave out the used folders whose path matches this regular expression (repeatable)\n' +
    '  -l, --log        the log (default O:/temp/rod-masks.log)\n' +
    '  -j, --jobs       folders made at the same time, taken in the list\'s order (default 1)\n' +
    '  --no-used        only the folders given with -f, not those used by the published model\n' +
    '  -n, --dry-run    list the folders, make nothing')
  process.exit(0)
}
const here = dirname(fileURLToPath(import.meta.url))
const log = (line) => {
  const text = `${new Date().toISOString().slice(0, 19).replace('T', ' ')} ${line}`
  console.log(text)
  if (!args['dry-run']) appendFileSync(args.log, text + '\n')
}
/** A folder's size in MB (its files only) */
const sizeOf = (d) => (existsSync(d) ? readdirSync(d).reduce((s, f) => s + statSync(join(d, f)).size, 0) / 1e6 : 0)

const jobs = args.first.map((f) => { const [dir, alt] = f.split('|'); return { dir, alt } })
if (!args['no-used']) {
  const py = spawnSync('python', ['-I', join(here, 'used_frames.py'), '--json', ...args.exclude.flatMap((x) => ['-x', x])], { encoding: 'utf-8', maxBuffer: 1 << 24 })
  if (py.status !== 0) throw new Error('used_frames.py: ' + py.stderr)
  const seen = new Set(jobs.map((j) => j.dir.replace(/\\/g, '/').toLowerCase()))
  for (const zone of JSON.parse(py.stdout)) for (const f of zone.folders) {
    const key = f.folder.replace(/\\/g, '/').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (!f.exists) { log(`missing, left out: ${f.folder} (${zone.zone}, ${f.photos} photos)`); continue }
    jobs.push({ dir: f.folder, zone: zone.zone, photos: f.photos })
  }
}
log(`${jobs.length} folders${args['dry-run'] ? ' (dry run)' : ''}`)
/** One folder: make_masks.mjs on it, logged */
async function run(j) {
  const masks = join(dirname(j.dir.replace(/[\/]$/, '')), '_masks')
  if (args['dry-run']) { console.log(`  ${j.dir}${j.alt ? ' | ' + j.alt : ''}  -> ${masks}`); return }
  const before = sizeOf(masks)
  const start = Date.now()
  log(`start ${j.dir}${j.alt ? ' (or ' + j.alt + ')' : ''}`)
  const a = [join(here, 'make_masks.mjs'), '-d', j.dir, '--resume', '--log', '100000', ...(j.alt ? ['-a', j.alt] : [])]
  // (its output kept for the log's summary, not printed: several folders at a time)
  const out = await new Promise((resolve) => {
    let text = ''
    const p = spawn(process.execPath, a, { stdio: ['ignore', 'pipe', 'pipe'] })
    p.stdout.on('data', (d) => { text += d })
    p.stderr.on('data', (d) => { text += d })
    p.on('close', (code) => resolve({ code, text }))
  })
  const lines = out.text.split('\n')
  const summary = lines.find((l) => / frames: the rod found in /.test(l)) ?? `failed (exit ${out.code}): ${out.text.trim().split('\n').slice(-3).join(' / ')}`
  const extended = lines.find((l) => /extended past/.test(l)) ?? ''
  const unread = lines.filter((l) => /: not read /.test(l))
  log(`done ${j.dir}: ${summary.replace(/; masks in .*/, '')}${extended ? '; ' + extended.replace('the rod ', '') : ''}; _masks ${before.toFixed(0)} -> ${sizeOf(masks).toFixed(0)} MB; ${((Date.now() - start) / 60000).toFixed(1)} min${unread.length ? '\n  ' + unread.join('\n  ') : ''}`)
}

// (-j workers, each taking the next folder in the list)
let next = 0
await Promise.all(Array.from({ length: Math.max(1, Number(args.jobs)) }, async () => {
  while (next < jobs.length) await run(jobs[next++])
}))
log('all done')

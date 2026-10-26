// Tracks the English pages against their French sources, so that English pages can be brought up to date on request.
//
// Each English page (src/content/docs/en/<path>) is the translation of the French page at the same path
// (src/content/docs/<path>). tools/i18n/translations.json records, per page, the Git blob of the French page that was
// translated (its exact content) and the commit it came from. This script compares that record with the French pages
// as they are now committed (HEAD) and lists:
//   - missing:  French pages without an English version (added pages);
//   - outdated: French pages changed since their translation, with the command showing what changed;
//   - orphaned: English pages whose French page is gone; if Git saw a rename, the new name is given;
//   - unrecorded: English pages missing from the record.
// French pages modified but not committed yet are flagged too (they are compared once committed).
//
// After translating or updating English pages, record them as up to date with --record:
//   node tools/i18n/status.mjs --record collecte/journal-plongees.mdx [other paths...]
//   node tools/i18n/status.mjs --record-all        (every English page whose French page exists)
// Paths are relative to src/content/docs/, French side (the English page has the same path under en/).
//
// Usage: node tools/i18n/status.mjs [--record <path...> | --record-all] [--json]
//        node tools/i18n/status.mjs -h | --help
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
if (argv.some((a) => a === '-h' || a === '--help')) {
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DOCS = 'src/content/docs'
const RECORD = join(repo, 'tools', 'i18n', 'translations.json')
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()

// French pages (committed, at HEAD): every .md/.mdx under docs/ except en/
const committed = git('ls-tree', '-r', '--name-only', 'HEAD', '--', DOCS)
  .split('\n')
  .filter((p) => /\.(md|mdx)$/.test(p))
const french = committed.filter((p) => !p.startsWith(`${DOCS}/en/`)).map((p) => p.slice(DOCS.length + 1))
const english = committed.filter((p) => p.startsWith(`${DOCS}/en/`)).map((p) => p.slice(DOCS.length + 4))
const blob = (path) => git('rev-parse', `HEAD:${DOCS}/${path}`)
const record = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, 'utf8')) : { pages: {} }

function save() {
  const sorted = Object.fromEntries(Object.entries(record.pages).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(RECORD, `${JSON.stringify({ ...record, pages: sorted }, null, 2)}\n`)
}

const recordIndex = argv.indexOf('--record')
if (recordIndex >= 0 || argv.includes('--record-all')) {
  const head = git('rev-parse', '--short', 'HEAD')
  const paths = argv.includes('--record-all') ? english.filter((p) => french.includes(p)) : argv.slice(recordIndex + 1)
  for (const path of paths) {
    if (!french.includes(path)) throw new Error(`no committed French page ${DOCS}/${path}`)
    if (!existsSync(join(repo, DOCS, 'en', path))) throw new Error(`no English page ${DOCS}/en/${path}`)
    record.pages[path] = { source: blob(path), commit: head, recorded: new Date().toISOString().slice(0, 10) }
  }
  save()
  console.log(`recorded ${paths.length} page(s) as translated from commit ${head}`)
  process.exit(0)
}

// Renames Git saw for a French path that no longer exists: the newest name it was moved to
function renamedTo(path) {
  const out = git('log', '--diff-filter=R', '--name-status', '--format=', '-M', '--', `${DOCS}/${path}`)
  const line = out.split('\n').find((l) => l.startsWith('R') && l.split('\t')[1] === `${DOCS}/${path}`)
  return line ? line.split('\t')[2].slice(DOCS.length + 1) : null
}

const uncommitted = git('status', '--porcelain', '--', DOCS)
  .split('\n')
  .filter(Boolean)
  .map((l) => l.slice(3))
  .filter((p) => !p.startsWith(`${DOCS}/en/`) && /\.(md|mdx)$/.test(p))

const report = { missing: [], outdated: [], orphaned: [], unrecorded: [], uncommitted }
for (const path of french) {
  if (!english.includes(path)) report.missing.push(path)
  else if (!record.pages[path]) report.unrecorded.push(path)
  else if (record.pages[path].source !== blob(path)) {
    report.outdated.push({ path, since: record.pages[path].commit, diff: `git diff ${record.pages[path].commit} HEAD -- ${DOCS}/${path}` })
  }
}
for (const path of english) {
  if (!french.includes(path)) report.orphaned.push({ path, renamedTo: renamedTo(path) })
}

if (argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}
const total = report.missing.length + report.outdated.length + report.orphaned.length + report.unrecorded.length
console.log(total ? `English pages to bring up to date: ${total}` : `English pages up to date (${english.length} pages)`)
for (const p of report.missing) console.log(`  missing     ${p}`)
for (const o of report.outdated) console.log(`  outdated    ${o.path}  (since ${o.since}; ${o.diff})`)
for (const o of report.orphaned) console.log(`  orphaned    en/${o.path}${o.renamedTo ? `  (French renamed to ${o.renamedTo})` : '  (French removed)'}`)
for (const p of report.unrecorded) console.log(`  unrecorded  en/${p}`)
for (const p of report.uncommitted) console.log(`  (French page modified, not committed: ${p})`)
process.exit(total ? 1 : 0)

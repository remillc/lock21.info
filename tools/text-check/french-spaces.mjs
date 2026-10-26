// French typography's non-breaking spaces (Christian, 2026-10-26; .claude/skills/natural-writing/SKILL.md, « French:
// typography and terms »; reference: the OQLF's Banque de dépannage linguistique): in French prose,
//   a non-breaking space (U+00A0) before « : » and inside « », and between a number and its unit, and in thousands;
//   a narrow non-breaking space (U+202F) before « ; », « ? », « ! ».
// Checks the French texts: the site's pages (src/content/docs/, not en/), the interface's messages
// (messages/site/fr.json, messages/viewer/fr.json) and the guided tour's French texts (viewer/src/tour-steps.js).
// Prose only: front matter, code blocks, inline code, HTML/JSX tags and comments, MDX imports, link targets, addresses,
// times (10:30) and ratios (4:3, 1:100) are left alone.
//
// Usage: node tools/text-check/french-spaces.mjs [-f|--fix] [-v|--verbose] [files…]
//   -f, --fix      write the corrected files (otherwise only report)
//   -v, --verbose  print each change (the line before and after)
//   files          only these files (default: all the French texts above)
//   -h, --help     this help
// Exit code 1 when a text lacks a space (without --fix).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const argv = process.argv.slice(2)
if (argv.includes('-h') || argv.includes('--help')) {
  const text = readFileSync(new URL(import.meta.url), 'utf8').split('\n')
  console.log(text.slice(0, text.findIndex((l) => l.startsWith('import'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const FIX = argv.includes('-f') || argv.includes('--fix')
const VERBOSE = argv.includes('-v') || argv.includes('--verbose')
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const NBSP = ' '
const NNBSP = ' '

// --- The rules, on a piece of prose (no code, no tags) ---
const UNITS = 'pi|pieds|po|m|cm|mm|km|min|h|s|ms|Mo|Go|Ko|px|%|°C|°|j|fps|dp|Mpx'
/** @param {string} t */
function fix(t) {
  return (
    t
      // « … »: non-breaking spaces inside (any spaces there replaced, or added)
      .replace(/«[   ]*/g, `«${NBSP}`)
      .replace(/[   ]*»/g, `${NBSP}»`)
      // before « : »: after a word, a closing mark or a placeholder, and followed by a space, the end, or a quote
      .replace(/([\p{L}\p{N}\)\]»*_'’"}%])[   ]?:(?=\s|$|[«"“])/gu, `$1${NBSP}:`)
      // before « ; ? ! »: a narrow non-breaking space, same conditions (?! in a row kept together)
      .replace(/([\p{L}\p{N}\)\]»*_'’"}%])[   ]?([;?!]+)(?=\s|$|[»"”)\]*_<])/gu, `$1${NNBSP}$2`)
      // a number and its unit
      .replace(new RegExp(`(\\d) (?=(?:${UNITS})(?![\\p{L}\\p{N}]))`, 'gu'), `$1${NBSP}`)
      // thousands: 16 384, 1 000 000 (groups of three after the first)
      .replace(/(?<![\d.,])(\d{1,3})((?: \d{3})+)(?![\d,.]?\d)/g, (_, a, b) => a + b.replace(/ /g, NBSP))
  )
}

// --- Prose segments in a Markdown / MDX line: everything outside code, tags, link targets and URLs ---
/** @param {string} line @param {(s: string) => string} f */
function mapProse(line, f) {
  // Protected spans: inline code, HTML/JSX tags and comments, link and image targets, autolinks, bare URLs, paths,
  // times and ratios, Markdown table delimiters
  // times and ratios, Markdown table delimiters, footnote and link-reference definitions ([^1]: …), HTML entities
  const protect = /(`+)[^`]*?\1|<!--.*?-->|<\/?[A-Za-z][^>]*>|\]\([^)]*\)|https?:\/\/\S+|\b\d{1,2}:\d{2}\b|\b\d+:\d+\b|\{[^{}]*\}|^\s*\|?\s*:?-{3,}.*$|^\s*\[[^\]]+\]:|&#?\w+;/g
  let out = ''
  let last = 0
  let after = false
  // A piece of prose right after inline code, a link or a tag (« `Model` ou `DEM` ? », « [carte](…) : »): its first
  // mark belongs to what came before
  const piece = (s) => {
    const fixed = f(s)
    if (!after) return fixed
    return fixed.replace(/^[   ]?:(?=\s|$)/, `${NBSP}:`).replace(/^[   ]?([;?!]+)(?=\s|$)/, `${NNBSP}$1`)
  }
  for (const m of line.matchAll(protect)) {
    // JSON-style placeholders ({n}) are prose for the messages but protected here: they stay intact either way
    out += piece(line.slice(last, m.index)) + m[0]
    last = m.index + m[0].length
    after = /^(`|\]\(|<\/|\{)/.test(m[0])
  }
  return out + piece(line.slice(last))
}

/** @param {string} text */
function fixMarkdown(text) {
  const lines = text.split(/(\r?\n)/)
  let inFront = false
  let inFence = false
  let inComment = false
  let lineNo = 0
  for (let i = 0; i < lines.length; i += 2) {
    const line = lines[i]
    lineNo++
    if (lineNo === 1 && line.trim() === '---') { inFront = true; continue }
    if (inFront) { if (line.trim() === '---') inFront = false; continue }
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue
    if (inComment) { if (line.includes('-->')) inComment = false; continue }
    if (line.includes('<!--') && !line.includes('-->')) { inComment = true; continue }
    if (/^\s*(import|export)\s/.test(line)) continue
    lines[i] = mapProse(line, fix)
  }
  return lines.join('')
}

/** A JSON messages file: each value is prose (with its HTML tags and {placeholders} protected) @param {string} text */
function fixMessages(text) {
  const data = JSON.parse(text)
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('$') || typeof value !== 'string') continue
    data[key] = mapProse(value, fix)
  }
  // The file's own line endings (CRLF in a Windows checkout)
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  return (JSON.stringify(data, null, 2) + '\n').replace(/\n/g, eol)
}

/** The tour's French texts: the string literals after « fr: » in tour-steps.js @param {string} text */
function fixTourSteps(text) {
  return text.replace(/(\bfr:\s*)'((?:[^'\\]|\\.)*)'/g, (_, head, body) => `${head}'${mapProse(body, fix)}'`)
}

// --- Files ---
/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'en' && dir.endsWith('docs') ? [] : walk(path)
    return /\.mdx?$/.test(name) ? [path] : []
  })
}
const docs = join(ROOT, 'src/content/docs')
const files = argv.filter((a) => !a.startsWith('-')).length
  ? argv.filter((a) => !a.startsWith('-')).map((a) => join(ROOT, a))
  : [...walk(docs), join(ROOT, 'messages/site/fr.json'), join(ROOT, 'messages/viewer/fr.json'), join(ROOT, 'viewer/src/tour-steps.js')]

let changed = 0
let count = 0
for (const file of files) {
  const before = readFileSync(file, 'utf8')
  const after = file.endsWith('.json') ? fixMessages(before) : file.endsWith('tour-steps.js') ? fixTourSteps(before) : fixMarkdown(before)
  if (after === before) continue
  changed++
  const a = before.split('\n')
  const b = after.split('\n')
  const diffs = a.map((l, i) => [i, l, b[i]]).filter(([, l, m]) => l !== m)
  count += diffs.length
  console.log(`${relative(ROOT, file)}: ${diffs.length} line(s)`)
  if (VERBOSE) {
    const show = (s) => s.replace(/ /g, '⍽').replace(/ /g, '·')
    for (const [i, l, m] of diffs.slice(0, 40)) console.log(`  ${i + 1}- ${show(l).trim().slice(0, 150)}\n  ${i + 1}+ ${show(m).trim().slice(0, 150)}`)
  }
  if (FIX) writeFileSync(file, after)
}
console.log(`${changed} file(s), ${count} line(s) ${FIX ? 'fixed' : 'to fix'}${VERBOSE ? ' (⍽ non-breaking space, · narrow one)' : ''}`)
process.exit(!FIX && changed ? 1 : 0)

// Sends the site's addresses to Bing (Bing Webmaster Tools' URL Submission API), so it crawls them without waiting.
//
// - The addresses come from a sitemap: the live site's by default (https://lock21.info/sitemap-index.xml, then the
//   sitemaps it lists). Send them only once the site is deployed: an address that isn't live yet would be a 404.
// - Bing allows a daily quota (shown with -q); the list is cut to it.
// - The API key comes from .env.local at the repository root (BING_WEBMASTER_API_KEY; Bing Webmaster Tools ›
//   Settings › API access) and is never printed.
// - Google takes no such list: for it, the sitemap in Search Console.
//
// Usage: node tools/bing/submit-urls.mjs [-n|--dry-run] [-q|--quota] [-s|--sitemap <url>] [-o|--only <path>…]
//   -n, --dry-run   list the addresses that would be sent, send nothing
//   -q, --quota     show the remaining daily and monthly quota, send nothing
//   -s, --sitemap   the sitemap (index) to read (default https://lock21.info/sitemap-index.xml)
//   -o, --only      only these paths (e.g. -o /modele /en/model), instead of the whole sitemap
//   -h, --help      this help
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
if (argv.some((a) => a === '-h' || a === '--help')) {
  const header = (await readFile(fileURLToPath(import.meta.url), 'utf8')).split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const has = (...names) => argv.some((a) => names.includes(a))
const valueOf = (...names) => { const i = argv.findIndex((a) => names.includes(a)); return i >= 0 ? argv[i + 1] : undefined }
const dryRun = has('-n', '--dry-run')
const quotaOnly = has('-q', '--quota')
const sitemap = valueOf('-s', '--sitemap') ?? 'https://lock21.info/sitemap-index.xml'
const onlyIndex = argv.findIndex((a) => a === '-o' || a === '--only')
const only = onlyIndex >= 0 ? argv.slice(onlyIndex + 1).filter((a) => a.startsWith('/')) : null

const SITE = 'https://lock21.info'
const API = 'https://ssl.bing.com/webmaster/api.svc/json'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const key = () => {
  process.loadEnvFile(join(repo, '.env.local'))
  const value = process.env.BING_WEBMASTER_API_KEY
  if (!value) throw new Error('BING_WEBMASTER_API_KEY manquant dans .env.local')
  return value
}

/** Every <loc> of a sitemap, following a sitemap index. @param {string} url @returns {Promise<string[]>} */
const readSitemap = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  const xml = await response.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
  if (/<sitemapindex/.test(xml)) return (await Promise.all(locs.map(readSitemap))).flat()
  return locs
}

/** A call to the API; the address (which holds the key) is never printed. @param {string} method @param {object} [body] */
const call = async (method, body) => {
  const query = new URLSearchParams({ apikey: key(), ...(body ? {} : { siteUrl: SITE }) })
  const response = await fetch(`${API}/${method}?${query}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) }
    : {})
  const text = await response.text()
  if (!response.ok) throw new Error(`Bing ${method}: ${response.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text).d : null
}

const quota = await call('GetUrlSubmissionQuota')
console.log(`Quota: ${quota.DailyQuota} today, ${quota.MonthlyQuota} this month`)
if (quotaOnly) process.exit(0)

const urls = only ? only.map((path) => SITE + path) : [...new Set(await readSitemap(sitemap))]
const batch = urls.slice(0, quota.DailyQuota)
console.log(`${urls.length} address(es)${batch.length < urls.length ? `, ${batch.length} within today's quota` : ''}`)
if (dryRun) {
  batch.forEach((url) => console.log(`  ${url}`))
  process.exit(0)
}
if (!batch.length) process.exit(0)
await call('SubmitUrlbatch', { siteUrl: SITE, urlList: batch })
console.log(`Sent ${batch.length} address(es) to Bing`)

// Reads the dive log (src/content/docs/collecte/journal-des-plongees.mdx, and its English version under en/) at build
// time: the Markdown table `No | Date | Activité | Zones | Durée (minutes) | Participants | Notes`. The home page shows
// its totals and its latest entries, so they never need to be typed by hand.

import { m } from '../paraglide/messages.js'

/** @typedef {import('./i18n.js').Lang} Lang */

const files = /** @type {Record<string, string>} */ (
  import.meta.glob(
    ['/src/content/docs/collecte/journal-des-plongees.mdx', '/src/content/docs/en/collecte/journal-des-plongees.mdx'],
    { query: '?raw', import: 'default', eager: true },
  )
)
/** @param {Lang} lang */
const source = (lang) =>
  files[`/src/content/docs/${lang === 'en' ? 'en/' : ''}collecte/journal-des-plongees.mdx`] ??
  files['/src/content/docs/collecte/journal-des-plongees.mdx'] ??
  ''

/**
 * @typedef {Object} Dive
 * @property {number} no
 * @property {string} date
 * @property {string} activity
 * @property {string} zones
 * @property {number} minutes
 * @property {string} notes
 */

// Cell text without HTML, footnote references or Markdown emphasis
/** @param {string} cell */
const clean = (cell) =>
  cell
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * @param {string} source
 * @returns {Dive[]}
 */
function parse(source) {
  return source
    .split('\n')
    // A row starts with its number, possibly carrying a footnote (dive 27: `27[^1]`)
    .filter((line) => /^\|\s*\d+(\[\^[^\]]+\])?\s*\|/.test(line))
    .map((line) => line.split('|').slice(1, -1).map(clean))
    .map(([no, date, activity, zones, minutes, , notes]) => ({
      no: Number(no),
      date,
      activity,
      zones,
      minutes: Number.parseFloat(minutes) || 0,
      notes: notes ?? '',
    }))
}

// Totals from the French log (the reference); notes in the page's language (the English log, when there is one)
/** @type {Dive[]} */
export const dives = parse(source('fr'))
/** @param {Lang} lang */
const divesIn = (lang) => (lang === 'fr' ? dives : parse(source(lang)))

export const totalMinutes = dives.reduce((sum, d) => sum + d.minutes, 0)

/**
 * "3 j 13 h" (instrument panel) and "3 j 13 h 14 min" (journal total); "3 d 13 h" in English
 * @param {number} minutes
 * @param {boolean} [withMinutes]
 * @param {Lang} [lang]
 */
export function formatDuration(minutes, withMinutes = false, lang = 'fr') {
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = Math.round(minutes % 60)
  return `${days} ${m.site_days({}, { locale: lang })} ${hours} h` + (withMinutes ? ` ${rest} min` : '')
}

/**
 * The latest dives that have a note, newest first
 * @param {number} count
 * @param {Lang} [lang]
 * @returns {Dive[]}
 */
export function latestWithNotes(count, lang = 'fr') {
  return divesIn(lang).filter((d) => d.notes).slice(-count).reverse()
}

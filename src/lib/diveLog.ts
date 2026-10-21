// Reads the dive log (src/content/docs/collecte/journal-des-plongees.mdx, and its English version under en/) at build
// time: the Markdown table `No | Date | Activité | Zones | Durée (minutes) | Participants | Notes`. The home page shows
// its totals and its latest entries, so they never need to be typed by hand.
import type { Lang } from './i18n'

const files = import.meta.glob(
  ['/src/content/docs/collecte/journal-des-plongees.mdx', '/src/content/docs/en/collecte/journal-des-plongees.mdx'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>
const source = (lang: Lang) =>
  files[`/src/content/docs/${lang === 'en' ? 'en/' : ''}collecte/journal-des-plongees.mdx`] ??
  files['/src/content/docs/collecte/journal-des-plongees.mdx'] ??
  ''

export interface Dive {
  no: number
  date: string
  activity: string
  zones: string
  minutes: number
  notes: string
}

// Cell text without HTML, footnote references or Markdown emphasis
const clean = (cell: string) =>
  cell
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

function parse(source: string): Dive[] {
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
export const dives: Dive[] = parse(source('fr'))
const divesIn = (lang: Lang) => (lang === 'fr' ? dives : parse(source(lang)))

export const totalMinutes = dives.reduce((sum, d) => sum + d.minutes, 0)

// "3 j 13 h" (instrument panel) and "3 j 13 h 14 min" (journal total); "3 d 13 h" in English
export function formatDuration(minutes: number, withMinutes = false, lang: Lang = 'fr') {
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = Math.round(minutes % 60)
  return `${days} ${lang === 'en' ? 'd' : 'j'} ${hours} h` + (withMinutes ? ` ${rest} min` : '')
}

// The latest dives that have a note, newest first
export function latestWithNotes(count: number, lang: Lang = 'fr'): Dive[] {
  return divesIn(lang).filter((d) => d.notes).slice(-count).reverse()
}

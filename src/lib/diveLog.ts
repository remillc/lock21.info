// Reads the dive log (src/content/docs/collecte/journal-des-plongees.mdx) at build time: the Markdown table
// `No | Date | Activité | Zones | Durée (minutes) | Participants | Notes`. The home page shows its totals and its
// latest entries, so they never need to be typed by hand.
const files = import.meta.glob('/src/content/docs/collecte/journal-des-plongees.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

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

export const dives: Dive[] = parse(Object.values(files)[0] ?? '')

export const totalMinutes = dives.reduce((sum, d) => sum + d.minutes, 0)

// "3 j 13 h" (instrument panel) and "3 j 13 h 14 min" (journal total)
export function formatDuration(minutes: number, withMinutes = false) {
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = Math.round(minutes % 60)
  return `${days} j ${hours} h` + (withMinutes ? ` ${rest} min` : '')
}

// The latest dives that have a note, newest first
export function latestWithNotes(count: number): Dive[] {
  return dives.filter((d) => d.notes).slice(-count).reverse()
}

// Reads the 3D model's manifest (tiles.lock21.info/manifest.json) at build time: how many zones are online and which
// one was added last. If it can't be fetched (offline build), the home page shows the values below and the
// build log says so.
import { site } from '../data/site'

export interface ZonesOnline {
  count: number
  latest: string // the zone added last, e.g. "16"
  updated: string | null // date of the latest publication, "2026-10-19"
}

const fallback: ZonesOnline = { count: 12, latest: '16', updated: null }

export async function zonesOnline(): Promise<ZonesOnline> {
  try {
    const response = await fetch(site.manifest)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const manifest: { tilesets: { id: string; url: string; added?: string }[]; updated?: string } = await response.json()
    // The zone added last: the latest "added" date (first publication, update_manifest.py); zones without one were
    // published before it was recorded. A republished zone (new version in its url) doesn't count as added. With no
    // date at all (manifest from before), the highest version ("<zone>/<yyyy-MM-dd-HHmm>/tileset.json") decides.
    const latest = manifest.tilesets
      .map((t) => ({ zone: t.id.replace('zone-', ''), added: t.added ?? '', version: t.url.split('/')[1] ?? '' }))
      .sort((a, b) => a.added.localeCompare(b.added) || a.version.localeCompare(b.version))
      .at(-1)
    return { count: manifest.tilesets.length, latest: latest?.zone ?? fallback.latest, updated: manifest.updated?.slice(0, 10) ?? null }
  } catch (error) {
    console.warn(`[manifest] ${site.manifest} unreachable (${(error as Error).message}): using fallback values`)
    return fallback
  }
}

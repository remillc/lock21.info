// Reads the 3D model's manifest (tiles.lock21.info/manifest.json) at build time: how many zones are online and which
// one was published last. If it can't be fetched (offline build), the home page shows the values below and the
// build log says so.
import { site } from '../data/site'

export interface ZonesOnline {
  count: number
  latest: string // e.g. "13"
  updated: string | null // date of the latest publication, "2026-10-19"
}

const fallback: ZonesOnline = { count: 10, latest: '13', updated: null }

export async function zonesOnline(): Promise<ZonesOnline> {
  try {
    const response = await fetch(site.manifest)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const manifest: { tilesets: { id: string; url: string }[]; updated?: string } = await response.json()
    // Each url is "<zone>/<version yyyy-MM-dd-HHmm>/tileset.json": the highest version is the latest publication
    const latest = manifest.tilesets
      .map((t) => ({ zone: t.id.replace('zone-', ''), version: t.url.split('/')[1] ?? '' }))
      .sort((a, b) => a.version.localeCompare(b.version))
      .at(-1)
    return { count: manifest.tilesets.length, latest: latest?.zone ?? fallback.latest, updated: manifest.updated?.slice(0, 10) ?? null }
  } catch (error) {
    console.warn(`[manifest] ${site.manifest} unreachable (${(error as Error).message}): using fallback values`)
    return fallback
  }
}

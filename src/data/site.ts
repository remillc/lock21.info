// Facts about the site used across the pages (SYSTEM-DESIGN.md). Values that change with the work (dives, zones online)
// are computed at build time instead: see src/lib/diveLog.ts and src/lib/manifest.ts.
export const site = {
  bottomDepthFt: 55,
  bottomDepthM: 16.8,
  zonesTotal: 25,
  // Lock 21: 44°59.809' N, 74°53.997' W (degrees and decimal minutes)
  coordinates: {
    lat: 44.996817,
    lon: -74.89995,
    label: { fr: '44°59.809′ N · 74°53.997′ O', en: '44°59.809′ N · 74°53.997′ W' },
  },
  viewer: '/modele/',
  manifest: 'https://tiles.lock21.info/manifest.json',
  // Downloads on R2 (tools/publish-model/upload_downloads.mjs, built by tools/google-earth/): the KMZ only links to the
  // parts on the server, so zones added later show up without a new download
  downloads: {
    kmz: 'https://tiles.lock21.info/downloads/google-earth/lock-21.kmz',
    kmzTriangles: '600 000',
    glb: 'https://tiles.lock21.info/downloads/lock-21.glb',
    glbSize: '108 Mo',
    glbTriangles: '2 millions',
  },
}

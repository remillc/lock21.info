// Facts about the site used across the pages (docs/system-design.md). Values that change with the work (dives, zones online)
// are computed at build time instead: see src/lib/diveLog.js and src/lib/manifest.js.
export const site = {
  bottomDepthFt: 60, // canal floor: 60 ft (SOS Ottawa, 1989: lock floor and base of the approach cribs; docs/sos-ottawa-files.md)
  bottomDepthM: 18.3,
  zonesTotal: 25,
  // Lock 21: 44°59.814' N, 74°53.983' W (degrees and decimal minutes; Christian, 2026-10-25, was 44°59.809', 74°53.997')
  coordinates: {
    lat: 44.996900,
    lon: -74.899721,
    label: { fr: '44°59.814′ N · 74°53.983′ O', en: '44°59.814′ N · 74°53.983′ W' },
  },
  viewer: '/modele',
  manifest: 'https://tiles.lock21.info/manifest.json',
  // Downloads (built by tools/google-earth/). The KMZ, on the site (public/downloads/), only links to the list of parts
  // on R2 (tools/publish-model/upload_downloads.mjs), so zones added later show up without a new download or a site
  // deploy; the GLB is on R2
  // Google Analytics 4 measurement ID (G-...), public; empty: no analytics (Analytics.astro; refusing:
  // AnalyticsOptOut.astro on the privacy page)
  analytics: {
    ga4: 'G-796S6VL5P8',
  },
  downloads: {
    kmz: '/downloads/lock-21.kmz',
    kmzTriangles: '700 000',
    glb: 'https://tiles.lock21.info/downloads/lock-21.glb',
    glbSize: '122 Mo',
    glbTriangles: '2 millions',
    // The model already placed, shared from Google Earth Web (Christian, 2026-10-26)
    googleEarthWeb: 'https://earth.google.com/earth/d/1_xcmUIJH5utm0h7MogaaU-aLEXdErmpp?usp=sharing',
  },
}

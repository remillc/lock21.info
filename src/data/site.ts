// Facts about the site used across the pages (DESIGN.md). Values that change with the work (dives, zones online)
// are computed at build time instead: see src/lib/diveLog.ts and src/lib/manifest.ts.
export const site = {
  bottomDepthFt: 55,
  bottomDepthM: 16.8,
  zonesTotal: 25,
  // Lock 21: 44°59'50.021" N, 74°53'57.365" W
  coordinates: {
    lat: 44.997228,
    lon: -74.899268,
    label: { fr: '44°59′50″ N · 74°53′57″ O', en: '44°59′50″ N · 74°53′57″ W' },
  },
  viewer: '/modele/',
  manifest: 'https://tiles.lock21.info/manifest.json',
}

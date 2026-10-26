// English addresses of the English pages (TODO #63, 2026-10-24): /en/data-collection/dive-log rather than
// /en/collecte/journal-plongees. The files keep the French page's path (src/content/docs/en/<French path>): that is
// how Starlight pairs a page with its translation (language menu, hreflang, sidebar) and how tools/i18n tracks it. The
// English address is given at build by src/integrations/english-paths.mjs, from this table: French path → English
// path, both without /en/. In the source, links to an English page keep its French path (/en/collecte/...); the build
// rewrites them, and redirects the former addresses. A new English page needs its line here.

/** @type {Record<string, string>} */
export const englishPaths = {
  'a-propos': 'about',
  remerciements: 'thanks',
  confidentialite: 'privacy',
  'decoupage-site': 'site-zones',
  'a-propos-ecluse-21': 'about-lock-21',
  modele: 'model',
  'collecte/journal-plongees': 'data-collection/dive-log',
  'collecte/materiel-utilise': 'data-collection/gear',
  'collecte/mise-echelle': 'data-collection/scaling',
  'collecte/rig': 'data-collection/rig',
  'traitement/extraction-photos': 'processing/photo-extraction',
  'traitement/alignement-photos': 'processing/photo-alignment',
  'traitement/nuage-points-dense': 'processing/dense-point-cloud',
  'traitement/generation-modeles': 'processing/building-models',
  'traitement/texture': 'processing/texture',
  'traitement/suivi': 'processing/progress',
  problemes: 'problems',
  'problemes/alignement-chunks': 'problems/aligning-chunks',
  'problemes/calibration-couleurs': 'problems/colour-calibration',
  'problemes/fort-courant-canal': 'problems/strong-current-canal',
  'problemes/charte-couleurs-surexposee': 'problems/overexposed-colour-chart',
  'problemes/dimensions-rig': 'problems/rig-dimensions',
  'problemes/effet-banane': 'problems/banana-effect',
  'problemes/nettete-images': 'problems/image-sharpness',
  'tests/calibration-couleurs': 'tests/colour-calibration',
  'tests/iso-minimum': 'tests/minimum-iso',
  'tests/couleurs-reference-profondeur': 'tests/reference-colours-depth',
}

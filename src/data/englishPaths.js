// English addresses of the English pages (TODO #63, 2026-10-24): /en/data-collection/dive-log rather than
// /en/collecte/journal-des-plongees. The files keep the French page's path (src/content/docs/en/<French path>): that is
// how Starlight pairs a page with its translation (language menu, hreflang, sidebar) and how tools/i18n tracks it. The
// English address is given at build by src/integrations/english-paths.mjs, from this table: French path → English
// path, both without /en/. In the source, links to an English page keep its French path (/en/collecte/...); the build
// rewrites them, and redirects the former addresses. A new English page needs its line here.

/** @type {Record<string, string>} */
export const englishPaths = {
  'a-propos': 'about',
  remerciements: 'thanks',
  confidentialite: 'privacy',
  'decoupage-du-site': 'site-zones',
  modele: 'model',
  'collecte/journal-des-plongees': 'data-collection/dive-log',
  'collecte/materiel-utilise': 'data-collection/gear',
  'workflow/extraction-des-photos': 'workflow/photo-extraction',
  'workflow/alignement-des-photos': 'workflow/photo-alignment',
  'workflow/generation-du-dense-cloud': 'workflow/dense-cloud',
  'workflow/modele': 'workflow/models',
  'workflow/texture': 'workflow/texture',
  'workflow/suivi': 'workflow/progress',
  'questions/alignement-chunks': 'problems/chunk-alignment',
  'questions/calibration-couleurs': 'problems/colour-calibration',
  'questions/canal': 'problems/canal-current',
  'questions/charte-couleurs-surexposee': 'problems/overexposed-colour-chart',
  'questions/dimensions-rig': 'problems/rig-dimensions',
  'questions/effet-bananne': 'problems/banana-effect',
  'questions/nettete-images': 'problems/image-sharpness',
  'tests/calibration-couleurs': 'tests/colour-calibration',
  'tests/iso-minimum': 'tests/minimum-iso',
  'tests/journal-des-plongees': 'tests/dive-log',
  'tests/lumiere-ambiante': 'tests/reference-colours-by-depth',
}

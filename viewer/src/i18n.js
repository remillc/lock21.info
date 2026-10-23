// The viewer's language (French or English) and its texts. French is the source language, as on the site.
// The language: embedded in a page of the site (/modele or /en/modele, same origin), that page's <html lang>; otherwise
// ?lang=fr|en in the address (read before main.js tidies the address); otherwise the browser's language.
//
// Usage: t('reset'), t('percent', { n: 42 }). A text is a string, or a function of the params (plurals, numbers).

/** @typedef {'fr' | 'en'} Lang */

/** @param {string | null | undefined} value @returns {Lang | null} */
function known(value) {
  const code = (value ?? '').toLowerCase()
  if (code.startsWith('fr')) return 'fr'
  if (code.startsWith('en')) return 'en'
  return null
}

/** @returns {Lang} */
function detect() {
  if (window.parent !== window) {
    try {
      const fromPage = known(window.parent.document.documentElement.lang)
      if (fromPage) return fromPage
    } catch {
      // Embedded by another origin: its document can't be read
    }
  }
  return known(new URLSearchParams(location.search).get('lang')) ?? (known(navigator.language) === 'fr' ? 'fr' : 'en')
}

/** @type {Lang} */
export const lang = detect()
document.documentElement.lang = lang

/** @typedef {string | ((params: Record<string, any>) => string)} Text */
/** @type {Record<Lang, Record<string, Text>>} */
const TEXTS = {
  fr: {
    // Page (index.html) and its buttons (main.js)
    pageTitle: 'Écluse 21 en 3D',
    pageDescription: "Modèle 3D photogrammétrique de l'écluse 21 submergée.",
    name: 'Écluse 21',
    home: '← Écluse 21',
    settings: 'Réglages',
    ar: 'Voir en réalité augmentée',
    arFull: 'Voir en réalité augmentée (taille réelle)',
    fullscreen: 'Plein écran',
    fullscreenTitle: 'Plein écran (Échap pour sortir)',
    fullscreenExit: 'Quitter le plein écran',

    // Loading indicator (loading.js)
    loading: 'Chargement',
    loadingBar: 'Chargement du modèle',
    percent: ({ n }) => `${n} %`,
    error: ({ message }) => `Erreur: ${message}`,


    // ?compare= segmented button (main.js)
    compare: 'Comparer deux versions des tuiles (touche B)',
    before: 'Avant',
    after: 'Après',

    // ?stats=1 overlay (main.js)
    statsMemory: ({ phone, used, max, full }) => `${phone ? 'téléphone' : 'ordinateur'} · mémoire ${used} / ${max} Mo${full ? ' (PLEINE)' : ''}`,
    statsZone: ({ zone, visible, loading }) => `${zone} visibles ${visible} · en cours ${loading}`,

    // Settings panel (config-panel.js)
    settingsDialog: 'Réglages du visualiseur',
    settingsClose: 'Fermer les réglages',
    reset: 'Réinitialiser',
    session: ({ code }) => `Session ${code}`,
    lighting: 'Éclairage',
    advanced: 'Avancé',
    skyStrength: 'Force du ciel',
    skyStrengthHint: 'lumière diffuse, de partout',
    sunStrength: 'Force du soleil',
    sunStrengthHint: 'lumière directe, qui fait ressortir le relief',
    sun: 'Soleil (azimut, hauteur)',
    sunHint: 'azimut 0 = du sud, 90 = de l’est',
    exposure: 'Exposition',
    contrast: 'Contraste',
    contrastHint: '1 = celui des textures; plus haut: sombres plus sombres, clairs plus clairs',
    saturation: 'Saturation',
    saturationHint: '1 = celle des textures, 0 = gris',
    wet: 'Aspect mouillé',
    wetHint: 'zones seulement: reflets du ciel, couleurs plus saturées',
    underwaterSection: 'Sous l’eau',
    underwater: 'Ambiance sous-marine',
    underwaterHint: 'l’écluse comme la voit un plongeur (aussi le bouton 🤿)',
    lamp: 'Lampe de plongée',
    swimHint: 'nager · glisser pour regarder · Maj: plus vite',
    swimKeys: 'Touches pour nager',
    swimHelpTitle: 'Nager dans l’écluse',
    swimHelpText: ({ w, a, s, d, icon }) => `<p>Sous l’eau, on se déplace comme un plongeur, là où on regarde.</p><ul><li><kbd>${w}</kbd> avancer, <kbd>${s}</kbd> reculer</li><li><kbd>${a}</kbd> à gauche, <kbd>${d}</kbd> à droite</li><li>les flèches font de même</li><li><kbd>Maj</kbd> maintenue: plus vite</li><li>bouton de la souris enfoncé, glisser: tourner la tête (en haut, en bas, à gauche, à droite)</li></ul><p>On ne traverse pas les murs. Le bouton ${icon} ramène la navigation habituelle.</p>`,
    swimHelpOk: 'Compris',
    lampOn: 'Allumer la lampe',
    lampOff: 'Éteindre la lampe',
    lampHint: 'tenue près de la caméra, dirigée vers l’avant',
    season: 'Saison',
    seasonHint: 'visibilité et couleur de l’eau selon la saison',
    seasonValue: ({ index }) => [['Hiver', 100], ['Printemps', 10], ['Été', 20], ['Automne', 30]].map(([name, ft]) => `${name} · ${ft} pi (${Math.round(ft * 0.3048)} m)`)[index],
    profile: 'Profil',
    profileAuto: 'automatique',
    profileDesktop: 'ordinateur',
    profileMobile: 'téléphone',
    stats: 'Statistiques (mémoire, tuiles)',
    tone: 'Rendu des tons',
    toneNeutral: 'Khronos neutre',
    toneNone: 'aucun',

    // Augmented reality on Android (android-ar.js)
    arClose: 'Quitter la réalité augmentée',
    arOpening: 'Ouverture de la caméra…',
    arSize: 'Taille',
    arSizeLabel: 'Taille de l’écluse, de 1:100 (sur une table) à 1:1 (taille réelle)',
    arLoading: 'Chargement du modèle…',
    arLoadingPercent: ({ n, mb }) => `Chargement du modèle… ${n} % (${mb} Mo)`,
    arLoadingMb: ({ mb }) => `Chargement du modèle… ${mb} Mo`,
    arPreparing: 'Préparation du modèle…',
    arReady: ({ prepare }) => `Modèle prêt (préparation ${prepare} s).`,
    arLoaded: ({ wait, prepare }) => `Modèle chargé: attente ${wait} s, préparation ${prepare} s.`,
    arPoint: 'Pointez le téléphone vers le sol ou une table, puis touchez l’écran pour placer l’écluse.',
    arMove: 'Touchez l’écran pour déplacer l’écluse.',
    arPrepareFailed: 'Le modèle n’a pas pu être préparé.',
    arLoadFailed: 'Le modèle n’a pas pu être chargé.',
  },
  en: {
    // Page (index.html) and its buttons (main.js)
    pageTitle: 'Lock 21 in 3D',
    pageDescription: 'Photogrammetric 3D model of the submerged Lock 21.',
    name: 'Lock 21',
    home: '← Lock 21',
    settings: 'Settings',
    ar: 'View in augmented reality',
    arFull: 'View in augmented reality (real size)',
    fullscreen: 'Full screen',
    fullscreenTitle: 'Full screen (Esc to exit)',
    fullscreenExit: 'Exit full screen',

    // Loading indicator (loading.js)
    loading: 'Loading',
    loadingBar: 'Loading the model',
    percent: ({ n }) => `${n}%`,
    error: ({ message }) => `Error: ${message}`,


    // ?compare= segmented button (main.js)
    compare: 'Compare two versions of the tiles (B key)',
    before: 'Before',
    after: 'After',

    // ?stats=1 overlay (main.js)
    statsMemory: ({ phone, used, max, full }) => `${phone ? 'phone' : 'computer'} · memory ${used} / ${max} MB${full ? ' (FULL)' : ''}`,
    statsZone: ({ zone, visible, loading }) => `${zone} visible ${visible} · loading ${loading}`,

    // Settings panel (config-panel.js)
    settingsDialog: 'Viewer settings',
    settingsClose: 'Close the settings',
    reset: 'Reset',
    session: ({ code }) => `Session ${code}`,
    lighting: 'Lighting',
    advanced: 'Advanced',
    skyStrength: 'Sky strength',
    skyStrengthHint: 'diffuse light, from all around',
    sunStrength: 'Sun strength',
    sunStrengthHint: 'direct light, which brings out the relief',
    sun: 'Sun (azimuth, elevation)',
    sunHint: 'azimuth 0 = from the south, 90 = from the east',
    exposure: 'Exposure',
    contrast: 'Contrast',
    contrastHint: '1 = the textures’ own; higher: darker darks, lighter lights',
    saturation: 'Saturation',
    saturationHint: '1 = the textures’ own, 0 = grey',
    wet: 'Wet look',
    wetHint: 'zones only: sky reflections, more saturated colours',
    underwaterSection: 'Underwater',
    underwater: 'Underwater view',
    underwaterHint: 'the lock as a diver sees it (also the 🤿 button)',
    lamp: 'Dive light',
    swimHint: 'swim · drag to look around · Shift: faster',
    swimKeys: 'Keys to swim',
    swimHelpTitle: 'Swimming in the lock',
    swimHelpText: ({ w, a, s, d, icon }) => `<p>Underwater, you move like a diver, where you look.</p><ul><li><kbd>${w}</kbd> forward, <kbd>${s}</kbd> back</li><li><kbd>${a}</kbd> left, <kbd>${d}</kbd> right</li><li>the arrow keys do the same</li><li>hold <kbd>Shift</kbd>: faster</li><li>mouse button held down, drag: turn your head (up, down, left, right)</li></ul><p>You can’t go through the walls. The ${icon} button brings back the usual navigation.</p>`,
    swimHelpOk: 'Got it',
    lampOn: 'Turn the light on',
    lampOff: 'Turn the light off',
    lampHint: 'held near the camera, pointing ahead',
    season: 'Season',
    seasonHint: 'visibility and water colour by season',
    seasonValue: ({ index }) => [['Winter', 100], ['Spring', 10], ['Summer', 20], ['Autumn', 30]].map(([name, ft]) => `${name} · ${ft} ft (${Math.round(ft * 0.3048)} m)`)[index],
    profile: 'Profile',
    profileAuto: 'automatic',
    profileDesktop: 'computer',
    profileMobile: 'phone',
    stats: 'Statistics (memory, tiles)',
    tone: 'Tone mapping',
    toneNeutral: 'Khronos neutral',
    toneNone: 'none',

    // Augmented reality on Android (android-ar.js)
    arClose: 'Exit augmented reality',
    arOpening: 'Opening the camera…',
    arSize: 'Size',
    arSizeLabel: 'Size of the lock, from 1:100 (on a table) to 1:1 (real size)',
    arLoading: 'Loading the model…',
    arLoadingPercent: ({ n, mb }) => `Loading the model… ${n}% (${mb} MB)`,
    arLoadingMb: ({ mb }) => `Loading the model… ${mb} MB`,
    arPreparing: 'Preparing the model…',
    arReady: ({ prepare }) => `Model ready (prepared in ${prepare} s).`,
    arLoaded: ({ wait, prepare }) => `Model loaded: waited ${wait} s, prepared in ${prepare} s.`,
    arPoint: 'Point the phone at the floor or a table, then tap the screen to place the lock.',
    arMove: 'Tap the screen to move the lock.',
    arPrepareFailed: 'The model could not be prepared.',
    arLoadFailed: 'The model could not be loaded.',
  },
}

/**
 * The text for `key` in the viewer's language (the French one if the English is missing, the key if both are)
 * @param {string} key
 * @param {Record<string, any>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const text = TEXTS[lang][key] ?? TEXTS.fr[key]
  if (text === undefined) return key
  return typeof text === 'function' ? text(params) : text
}

/** The site's home page in the viewer's language */
export const homePath = lang === 'en' ? '/en/' : '/'

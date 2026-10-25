// The viewer's language (French or English) and its texts. French is the source language, as on the site.
// The language: embedded in a page of the site (/modele or /en/modele, same origin), that page's <html lang>; otherwise
// ?lang=fr|en in the address (read before main.js tidies the address); otherwise the browser's language.
//
// Usage: t('reset'), t('error', { message }). A text is a string, or a function of the params (plurals, numbers).

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
    compass: 'Boussole (la pointe rouge indique le nord magnétique)',
    compassWest: 'O',
    homeView: 'Vue de départ',

    // Loading indicator (loading.js)
    loading: 'Chargement',
    loadingBar: 'Chargement du modèle',
    refining: 'Affinage des détails',
    error: ({ message }) => `Erreur: ${message}`,
    retry: 'Réessayer',
    loadSlow: ({ n }) => `C’est plus long que d’habitude (${n} morceaux reçus). La connexion est peut-être lente, ou le modèle lourd pour cet appareil.`,
    loadStalled: 'Le chargement ne progresse plus. Vérifiez la connexion Internet, puis réessayez.',
    loadErrors: ({ n }) => `${n} morceaux du modèle n’ont pas pu être téléchargés. Vérifiez la connexion Internet, puis réessayez.`,
    loadLight: 'La page a été rechargée: l’appareil manquait de mémoire. Le modèle s’affiche en version allégée.',


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
    meshView: 'Maillage',
    meshViewHint: 'les triangles du modèle au lieu de sa texture',
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
    bump: 'Bump map',
    bumpHint: 'zones seulement: le grain tiré de la photo (bois, sédiments)',
    underwater: 'Ambiance sous-marine',
    lamp: 'Lampe de plongée',
    swimHint: 'nager · glisser pour regarder · Maj: plus vite',
    swimKeys: 'Touches pour nager',
    swimHelpTitle: 'Nager dans l’écluse',
    swimHelpText: ({ w, a, s, d, icon }) => `<p>Sous l’eau, on se déplace comme un plongeur, là où on regarde.</p><ul><li><kbd>${w}</kbd> avancer, <kbd>${s}</kbd> reculer</li><li><kbd>${a}</kbd> à gauche, <kbd>${d}</kbd> à droite</li><li>les flèches font de même</li><li><kbd>Maj</kbd> maintenue: plus vite</li><li>bouton de la souris enfoncé, glisser: tourner la tête (en haut, en bas, à gauche, à droite)</li></ul><p>On ne traverse pas les murs. Le bouton ${icon} ramène la navigation habituelle.</p>`,
    swimHelpOk: 'Compris',
    keysHint: 'avancer · Maj: plus vite',
    keyForward: 'Avancer',
    keyBack: 'Reculer',
    keyLeft: 'À gauche',
    keyRight: 'À droite',
    keysLabel: 'Touches pour avancer',
    keysHelpTitle: 'Navigation',
    // The guided tour (tour.js)
    tourButton: 'Visite guidée',
    tourCount: ({ n, total }) => `Étape ${n} sur ${total}`,
    tourPrev: 'Précédent',
    tourNext: 'Suivant',
    tourEnd: 'Terminer',
    tourClose: 'Quitter la visite',
    keysHelpText: ({ w, a, s, d }) => `<p>Les touches déplacent la caméra dans la direction où elle regarde.</p><ul><li><kbd>${w}</kbd> avancer, <kbd>${s}</kbd> reculer</li><li><kbd>${a}</kbd> à gauche, <kbd>${d}</kbd> à droite</li><li><kbd>Maj</kbd> maintenue: plus vite</li></ul><p>Les flèches du clavier <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> peuvent aussi servir.</p>`,
    touchHelpTitle: 'Naviguer du bout des doigts',
    touchHelp: '<ul><li>un doigt: tourner</li><li>deux doigts: déplacer, et pincer pour zoomer vers les doigts</li><li>toucher deux fois: s’approcher de ce point</li></ul>',
    lampOn: 'Allumer la lampe',
    lampOff: 'Éteindre la lampe',
    season: 'Saison',
    seasonValue: ({ index }) => [['Hiver', 100], ['Printemps', 14], ['Été', 20], ['Automne', 30]].map(([name, ft]) => `${name} · ${ft}\u00a0pi\u00a0(${Math.round(ft * 0.3048)}\u00a0m)`)[index],
    profile: 'Profil',
    modelSection: 'Modèle',
    textures: 'Textures',
    texturesHint: 'Automatique: complètes sur ordinateur, et sur un téléphone ou une tablette qui annonce au moins 8 Go de mémoire, 8 cœurs et une connexion rapide; légères (deux fois moins fines, quatre fois moins lourdes) sinon.',
    texturesAuto: 'automatique',
    texturesLight: 'légères',
    texturesFull: 'complètes',
    profileAuto: 'automatique',
    profileDesktop: 'ordinateur',
    profileMobile: 'téléphone',
    stats: 'Statistiques (mémoire, tuiles)',
    dance: 'Écrevisse qui danse',
    danceHint: 'Elle danse dès qu’elle menace le plongeur, sans attendre qu’il reste immobile',
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
    compass: 'Compass (the red tip points to magnetic north)',
    compassWest: 'W',
    homeView: 'Start view',

    // Loading indicator (loading.js)
    loading: 'Loading',
    loadingBar: 'Loading the model',
    refining: 'Refining the details',
    error: ({ message }) => `Error: ${message}`,
    retry: 'Try again',
    loadSlow: ({ n }) => `This is taking longer than usual (${n} pieces received). The connection may be slow, or the model heavy for this device.`,
    loadStalled: 'Loading has stopped making progress. Check the Internet connection, then try again.',
    loadErrors: ({ n }) => `${n} pieces of the model could not be downloaded. Check the Internet connection, then try again.`,
    loadLight: 'The page was reloaded: the device ran short of memory. The model is shown in a lighter version.',


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
    meshView: 'Mesh',
    meshViewHint: 'the model’s triangles instead of its texture',
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
    bump: 'Bump map',
    bumpHint: 'zones only: the grain drawn from the photo (wood, sediment)',
    underwater: 'Underwater view',
    lamp: 'Dive light',
    swimHint: 'swim · drag to look around · Shift: faster',
    swimKeys: 'Keys to swim',
    swimHelpTitle: 'Swimming in the lock',
    swimHelpText: ({ w, a, s, d, icon }) => `<p>Underwater, you move like a diver, where you look.</p><ul><li><kbd>${w}</kbd> forward, <kbd>${s}</kbd> back</li><li><kbd>${a}</kbd> left, <kbd>${d}</kbd> right</li><li>the arrow keys do the same</li><li>hold <kbd>Shift</kbd>: faster</li><li>mouse button held down, drag: turn your head (up, down, left, right)</li></ul><p>You can’t go through the walls. The ${icon} button brings back the usual navigation.</p>`,
    swimHelpOk: 'Got it',
    keysHint: 'move · Shift: faster',
    keyForward: 'Forward',
    keyBack: 'Back',
    keyLeft: 'Left',
    keyRight: 'Right',
    keysLabel: 'Keys to move',
    keysHelpTitle: 'Navigation',
    // The guided tour (tour.js)
    tourButton: 'Guided tour',
    tourCount: ({ n, total }) => `Step ${n} of ${total}`,
    tourPrev: 'Back',
    tourNext: 'Next',
    tourEnd: 'Finish',
    tourClose: 'Leave the tour',
    keysHelpText: ({ w, a, s, d }) => `<p>The keys move the camera in the direction it looks.</p><ul><li><kbd>${w}</kbd> forward, <kbd>${s}</kbd> back</li><li><kbd>${a}</kbd> left, <kbd>${d}</kbd> right</li><li>hold <kbd>Shift</kbd>: faster</li></ul><p>The arrow keys <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> can be used too.</p>`,
    touchHelpTitle: 'Navigating with your fingers',
    touchHelp: '<ul><li>one finger: turn</li><li>two fingers: move around, and pinch to zoom toward your fingers</li><li>double-tap: move closer to that point</li></ul>',
    lampOn: 'Turn the light on',
    lampOff: 'Turn the light off',
    season: 'Season',
    seasonValue: ({ index }) => [['Winter', 100], ['Spring', 14], ['Summer', 20], ['Autumn', 30]].map(([name, ft]) => `${name} · ${ft}\u00a0ft\u00a0(${Math.round(ft * 0.3048)}\u00a0m)`)[index],
    profile: 'Profile',
    modelSection: 'Model',
    textures: 'Textures',
    texturesHint: 'Automatic: full on a computer, and on a phone or tablet that reports at least 8 GB of memory, 8 cores and a fast connection; light (half as fine, four times lighter) otherwise.',
    texturesAuto: 'automatic',
    texturesLight: 'light',
    texturesFull: 'full',
    profileAuto: 'automatic',
    profileDesktop: 'computer',
    profileMobile: 'phone',
    stats: 'Statistics (memory, tiles)',
    dance: 'Dancing crayfish',
    danceHint: 'It dances as soon as it threatens the diver, without waiting for them to keep still',
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

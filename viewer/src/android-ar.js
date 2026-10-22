// Augmented reality on Android: Google's <model-viewer>, loaded only when an Android visitor taps the AR button (its
// standalone build, three.js included: about 300 KB compressed, never loaded on computers or iPhones). It opens a
// full-screen panel showing the AR model in 3D, whose own button starts AR: WebXR in Chrome first (the model placed on
// a surface seen by the camera), Scene Viewer otherwise. Two taps, because Chrome lets a page start AR only right after
// a tap, and the model (about 26 MB) takes longer than that to download on a phone.
// Why not Scene Viewer directly, as before: on a Pixel 10 Pro (2026-10-22) Scene Viewer closed at once for every
// model, Google's samples included and from any page, while <model-viewer>'s demo opened in WebXR.
// Telemetry: the panel's opening and <model-viewer>'s AR statuses (session started, object placed, failed).

let panel = null

export async function openAndroidAr({ src, title, fixed, log }) {
  if (!panel) panel = await createPanel({ src, title, fixed, log })
  panel.hidden = false
  panel.querySelector('.ar-panel-close').focus()
}

async function createPanel({ src, title, fixed, log }) {
  const box = document.createElement('div')
  box.className = 'ar-panel'
  box.setAttribute('role', 'dialog')
  box.setAttribute('aria-label', title)
  box.innerHTML = `
    <div class="ar-panel-head">
      <span class="ar-panel-title"></span>
      <button type="button" class="ar-panel-close" aria-label="Fermer la réalité augmentée">×</button>
    </div>
    <p class="ar-panel-status" role="status">Chargement du module de réalité augmentée…</p>`
  box.querySelector('.ar-panel-title').textContent = title
  box.querySelector('.ar-panel-close').addEventListener('click', () => {
    box.hidden = true
  })
  document.body.append(box)
  const status = box.querySelector('.ar-panel-status')

  try {
    await import('@google/model-viewer/dist/model-viewer.min.js')
  } catch (error) {
    status.textContent = 'Le module de réalité augmentée n’a pas pu être chargé.'
    log('ar-status', { status: 'module-failed', msg: String(error?.message ?? error).slice(0, 300) })
    return box
  }

  const viewer = document.createElement('model-viewer')
  viewer.setAttribute('src', src)
  viewer.setAttribute('alt', title)
  viewer.setAttribute('ar', '')
  viewer.setAttribute('ar-modes', 'webxr scene-viewer')
  // The table version may be resized with two fingers; the real size stays at its size
  viewer.setAttribute('ar-scale', fixed ? 'fixed' : 'auto')
  viewer.setAttribute('camera-controls', '')
  viewer.setAttribute('touch-action', 'pan-y')
  viewer.setAttribute('shadow-intensity', '1')
  const start = document.createElement('button')
  start.type = 'button'
  start.slot = 'ar-button'
  start.className = 'ar-panel-start'
  start.textContent = 'Placer l’écluse autour de moi'
  viewer.append(start)
  box.insertBefore(viewer, status)
  status.textContent = 'Chargement du modèle (26 Mo)…'

  viewer.addEventListener('progress', (event) => {
    const pct = Math.round((event.detail?.totalProgress ?? 0) * 100)
    if (pct < 100) status.textContent = `Chargement du modèle… ${pct} %`
  })
  viewer.addEventListener('load', () => {
    status.textContent = viewer.canActivateAR
      ? 'Touchez le bouton, puis pointez le téléphone vers le sol ou une table.'
      : 'La réalité augmentée n’est pas disponible sur cet appareil; le modèle reste visible en 3D.'
    log('ar-status', { status: 'loaded', canActivate: viewer.canActivateAR })
  })
  viewer.addEventListener('error', (event) => {
    status.textContent = 'Le modèle n’a pas pu être chargé.'
    log('ar-status', { status: 'model-failed', msg: String(event.detail?.type ?? '') })
  })
  viewer.addEventListener('ar-status', (event) => {
    log('ar-status', { status: event.detail?.status })
    if (event.detail?.status === 'failed') status.textContent = 'La réalité augmentée n’a pas pu démarrer.'
  })
  return box
}

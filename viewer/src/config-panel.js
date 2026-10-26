// <l21-settings-panel>: native Custom Element (docs/guidelines.md) with one control per query parameter of the viewer, opened
// by the ⚙ button. Every setting applies at once through its "live" handler (main.js), sliders while they move: the
// page never reloads. The settings are not written into the address (it keeps only the camera): the browser keeps
// them between visits (localStorage, see savedSettings), and a link's query parameters override them at load.
// Labels in the viewer's language (i18n.js).
//
// Usage: const panel = document.createElement('l21-settings-panel')
//        panel.configure({ schema, values, live, button }); document.body.append(panel)

// type: toggle | range | select | text | angles (two ranges stored as "a,b")
// format: (value) => text shown for a range's value instead of the number (« Saison »)
// dependsOn: key of a toggle (the row is shown only while it is on), or [key, value] (shown only while that setting
// has that value)
// remember: false: not kept between visits (underwater: each visit starts in the air, Christian 2026-10-23; a link's
// ?underwater=1 still applies)
// Settings kept by the browser (localStorage of this origin: lock21.info, where the /modele page embeds the viewer):
// through reloads of the /modele page; forgotten when a visitor arrives there from another page (?reset=1,
// forgetSettings). Saved at every change, cleared by "Réinitialiser"; unavailable storage (private browsing,
// blocked site data) only means nothing is kept.
import { track } from './analytics.js'
import { m } from './i18n.js'
import { icon } from './icons.js'

const STORAGE_KEY = 'l21-viewer-settings'

/**
 * The underwater season of a date (underwater.js SEASONS: 0 winter, 1 spring, 2 summer, 3 autumn), by meteorological
 * seasons: December to February, March to May, June to August, September to November. The season shown until one is
 * chosen (Christian, 2026-10-23)
 * @param {Date} [date]
 * @returns {number}
 */
export function seasonOfDate(date = new Date()) {
  return Math.floor(((date.getMonth() + 1) % 12) / 3)
}

export function savedSettings() {
  try {
    return new URLSearchParams(localStorage.getItem(STORAGE_KEY) ?? '')
  } catch {
    return new URLSearchParams()
  }
}

/** The settings kept between visits: the panel's, except those marked remember: false */
export function rememberedKeys(schema) {
  return new Set(schema.flatMap((section) => section.items).filter((item) => item.remember !== false).map((item) => item.key))
}

/** Forgets the saved settings (the /modele page asks for it when a visitor arrives from another page: ?reset=1) */
export function forgetSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing was kept
  }
}

function saveSettings(params, schema) {
  const keys = rememberedKeys(schema)
  const kept = new URLSearchParams([...params].filter(([key]) => keys.has(key)))
  try {
    if (kept.size) localStorage.setItem(STORAGE_KEY, kept.toString())
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: the settings last until the page is closed
  }
}

export function settingsSchema({ mobile }) {
  return [
    // No underwater section (Christian, 2026-10-25): the diver's button and its strip (season, lamp) are the controls
    {
      title: m.lighting(),
      items: [
        { key: 'hdriIntensity', label: m.skyStrength(), hint: m.skyStrengthHint(), type: 'range', min: 0, max: 2, step: 0.05, def: '0.35' },
        { key: 'sunIntensity', label: m.sunStrength(), hint: m.sunStrengthHint(), type: 'range', min: 0, max: 3, step: 0.05, def: '1' },
        { key: 'light', label: m.sun(), hint: m.sunHint(), type: 'angles', def: '320,65', ranges: [[0, 360, 1], [0, 90, 1]], unit: '°' },
        { key: 'exposure', label: m.exposure(), type: 'range', min: 0.25, max: 3, step: 0.05, def: '1.2' },
        { key: 'contrast', label: m.contrast(), hint: m.contrastHint(), type: 'range', min: 0.5, max: 2, step: 0.05, def: '1' },
        { key: 'saturation', label: m.saturation(), hint: m.saturationHint(), type: 'range', min: 0, max: 2, step: 0.05, def: '1.3' },
        // Bump map from the photo (Christian, 2026-10-25: to try strengths), 0 to 5 times its default 2.4 cm
        { key: 'bump', label: m.bump(), hint: m.bumpHint(), type: 'range', min: 0, max: 5, step: 0.05, def: '0.45' },
      ],
    },
    {
      title: m.modelSection(),
      items: [
        { key: 'textures', label: m.textures(), hint: m.texturesHint(), type: 'select', def: '', options: [['', m.texturesAuto()], ['light', m.texturesLight()], ['full', m.texturesFull()]] },
        // Out of the advanced settings (Christian, 2026-10-25)
        { key: 'mesh', label: m.meshView(), hint: m.meshViewHint(), type: 'toggle', def: '0', remember: false },
      ],
    },
    {
      title: m.advanced(),
      advanced: true,
      items: [
        { key: 'profile', label: m.profile(), type: 'select', def: '', options: [['', m.profileAuto()], ['desktop', m.profileDesktop()], ['mobile', m.profileMobile()]] },
        { key: 'stats', label: m.stats(), type: 'toggle', def: '0' },
        // The crayfish dancing all through its threat posture (crawfish.js; Christian, 2026-10-25: to tune the dance)
        { key: 'dance', label: m.dance(), hint: m.danceHint(), type: 'toggle', def: '0' },
        { key: 'tone', label: m.tone(), type: 'select', def: 'agx', options: [['agx', 'AgX'], ['neutral', m.toneNeutral()], ['aces', 'ACES'], ['none', m.toneNone()]] },
      ],
    },
  ]
}

class SettingsPanel extends HTMLElement {
  /** @type {Map<string, number>} The pending setting_change of each setting (set) */
  trackTimers = new Map()

  configure({ schema, values, live, button, session }) {
    this.schema = schema
    // Telemetry session code (telemetry.js), shown at the bottom so that a tester can read it out
    this.session = session
    // Current values (URLSearchParams); a setting at its default is absent
    this.params = new URLSearchParams(values)
    this.live = live
    this.button = button
  }

  connectedCallback() {
    this.hidden = true
    this.setAttribute('role', 'dialog')
    this.setAttribute('aria-label', m.settingsDialog())
    this.render()
    this.button.hidden = false
    this.button.addEventListener('click', () => {
      if (this.hidden) track('viewer_button', { button: 'settings' })
      this.toggle(this.hidden)
    })
    // The wheel stays in the panel: at the end of its list (or when it has nothing to scroll), the page around the
    // viewer (the /modele page) would scroll instead. style.css: overscroll-behavior does the same for touch
    this.addEventListener('wheel', (e) => {
      const atTop = this.scrollTop <= 0 && e.deltaY < 0
      const atBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 1 && e.deltaY > 0
      if (atTop || atBottom) e.preventDefault()
    }, { passive: false })
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.hidden) this.toggle(false)
    })
  }

  // Keyboard focus follows the panel (accessibility audit, 2026-10-26): into its first control when it opens, back to
  // the ⚙ button when it closes with the focus inside it
  toggle(open) {
    const focusInside = this.contains(document.activeElement)
    this.hidden = !open
    this.button.setAttribute('aria-expanded', String(open))
    if (open) this.querySelector('input, select, button:not(.settings-close)')?.focus()
    else if (focusInside) this.button.focus()
  }

  // Keeps the value (forgotten when it equals the default), then applies it
  set(item, value) {
    if (value === item.def || value === '') this.params.delete(item.key)
    else this.params.set(item.key, value)
    this.live[item.key]?.(value)
    saveSettings(this.params, this.schema)
    // Analytics (analytics.js): the setting changed, once it settles (a slider sends many values while dragged)
    clearTimeout(this.trackTimers.get(item.key))
    this.trackTimers.set(item.key, setTimeout(() => track('setting_change', { setting: item.key, value }), 1000))
    this.showDependents()
  }

  // Rows with dependsOn: shown only while their toggle is on. Revealed and hidden with the MD3 enter / exit motion
  // (docs/system-design.md, Motion); instantly when the panel is drawn or when the system asks for reduced motion.
  // A row may depend on a setting no longer in the panel (the relief: ?relief=sun in a link only): then only the
  // link's value counts
  showDependents(animate = true) {
    const still = !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    for (const item of this.schema.flatMap((section) => section.items)) {
      if (!item.dependsOn) continue
      const [key, value] = Array.isArray(item.dependsOn) ? item.dependsOn : [item.dependsOn, '1']
      const on = (this.params.get(key) ?? this.item(key)?.def) === value
      const row = this.querySelector(`[data-key="${item.key}"]`)
      if (row.dataset.shown === String(on)) continue
      row.dataset.shown = String(on)
      if (still) row.hidden = !on
      else reveal(row, on)
    }
  }

  // A value changed elsewhere (the 🤿 button for « Ambiance sous-marine »): kept, saved and shown, without applying
  // it again
  reflect(key, value) {
    const item = this.item(key)
    if (!item) return
    if (value === item.def) this.params.delete(key)
    else this.params.set(key, value)
    saveSettings(this.params, this.schema)
    const row = this.querySelector(`[data-key="${key}"]`)
    if (row) {
      const fresh = control(item, value, (v) => this.set(item, v))
      fresh.dataset.key = key
      fresh.dataset.shown = row.dataset.shown ?? ''
      row.replaceWith(fresh)
    }
    this.showDependents()
  }

  item(key) {
    return this.schema.flatMap((section) => section.items).find((item) => item.key === key)
  }

  render() {
    const head = document.createElement('div')
    head.className = 'settings-head'
    const title = document.createElement('h2')
    title.textContent = m.settings()
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'settings-close'
    close.setAttribute('aria-label', m.settingsClose())
    // Material Symbols Rounded « close »
    close.innerHTML = icon('close-rounded')
    close.addEventListener('click', () => this.toggle(false))
    head.append(title, close)
    // What these settings are (usability audit V29, 2026-10-26): the display, kept by the browser (saveSettings)
    const intro = document.createElement('p')
    intro.className = 'settings-hint settings-intro'
    intro.textContent = m.settingsIntro()
    this.append(head, intro)

    for (const section of this.schema) {
      const box = document.createElement(section.advanced ? 'details' : 'section')
      box.className = 'settings-section'
      const heading = document.createElement(section.advanced ? 'summary' : 'h3')
      heading.textContent = section.title
      box.append(heading)
      for (const item of section.items) {
        const row = control(item, this.params.get(item.key) ?? item.def, (v) => this.set(item, v))
        row.dataset.key = item.key
        box.append(row)
      }
      this.append(box)
    }

    const actions = document.createElement('div')
    actions.className = 'settings-actions'
    const reset = button(m.reset(), () => {
      // Back to the defaults, keeping the view; the controls are drawn again with their default values
      for (const item of this.schema.flatMap((section) => section.items)) {
        if (!this.params.has(item.key)) continue
        this.params.delete(item.key)
        this.live[item.key]?.(item.def)
      }
      saveSettings(this.params, this.schema)
      this.replaceChildren()
      this.render()
    })
    actions.append(reset)
    this.append(actions)
    if (this.session) {
      const code = document.createElement('p')
      code.className = 'settings-hint settings-session'
      // and what it is for (usability audit V29)
      const value = document.createElement('span')
      value.className = 'settings-session-code'
      value.textContent = m.session({ code: this.session })
      code.append(value, ` · ${m.sessionHint()}`)
      this.append(code)
    }
    this.showDependents(false)
  }
}
customElements.define('l21-settings-panel', SettingsPanel)

// MD3 motion tokens (material-web, md.sys.motion): entering content decelerates over a longer duration, exiting
// content accelerates over a shorter one
const MOTION = {
  enter: { duration: 400, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' }, // duration.medium4, easing.emphasized-decelerate
  exit: { duration: 200, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)' }, // duration.short4, easing.emphasized-accelerate
}

// Opens or closes a row: its height (the rows below follow) and its opacity
function reveal(row, show) {
  row.getAnimations().forEach((a) => a.cancel())
  row.hidden = false
  const style = getComputedStyle(row)
  const open = { height: `${row.offsetHeight}px`, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, opacity: 1 }
  const closed = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 }
  row.style.overflow = 'hidden'
  const animation = row.animate(show ? [closed, open] : [open, closed], show ? MOTION.enter : MOTION.exit)
  animation.onfinish = () => {
    row.style.overflow = ''
    row.hidden = !show
  }
}

function button(text, onClick) {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = text
  b.addEventListener('click', onClick)
  return b
}

function control(item, value, onChange) {
  const row = document.createElement('div')
  row.className = `settings-row settings-${item.type}`
  const id = `setting-${item.key}`
  const label = document.createElement('label')
  label.htmlFor = id
  label.textContent = item.label
  row.append(label)

  if (item.type === 'toggle') {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.id = id
    input.checked = value === '1'
    input.addEventListener('change', () => onChange(input.checked ? '1' : '0'))
    row.prepend(input)
  } else if (item.type === 'range' || item.type === 'angles') {
    const values = item.type === 'angles' ? value.split(',') : [value]
    const ranges = item.type === 'angles' ? item.ranges : [[item.min, item.max, item.step]]
    const output = document.createElement('output')
    const inputs = ranges.map(([min, max, step], i) => rangeInput(i ? `${id}-${i + 1}` : id, min, max, step, values[i] ?? String(min)))
    const show = () => (output.textContent = inputs.map((r) => (item.format ? item.format(r.value) : `${r.value}${item.unit ?? ''}`)).join(', '))
    show()
    const current = () => inputs.map((r) => r.value).join(',')
    // Applied while the slider moves, not only when it is released
    for (const input of inputs) {
      input.addEventListener('input', () => {
        show()
        onChange(current())
      })
    }
    label.append(output)
    row.append(...inputs)
  } else if (item.type === 'select') {
    const select = document.createElement('select')
    select.id = id
    for (const [v, text] of item.options) select.append(new Option(text, v, false, v === value))
    select.addEventListener('change', () => onChange(select.value))
    row.append(select)
  } else if (item.type === 'text') {
    const input = document.createElement('input')
    input.type = 'url'
    input.id = id
    input.value = value
    input.placeholder = item.hint ?? ''
    input.addEventListener('change', () => onChange(input.value.trim()))
    row.append(input)
  }
  if (item.hint && item.type !== 'text') {
    const hint = document.createElement('p')
    hint.className = 'settings-hint'
    hint.textContent = item.hint
    row.append(hint)
  }
  return row
}

function rangeInput(id, min, max, step, value) {
  const input = document.createElement('input')
  input.type = 'range'
  input.id = id
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = value
  return input
}

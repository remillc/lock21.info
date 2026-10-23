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
// Settings kept by the browser between page loads (localStorage of this origin: lock21.info, where the /modele/ page
// embeds the viewer). Saved at every change, cleared by "Réinitialiser"; unavailable storage (private browsing,
// blocked site data) only means nothing is kept.
import { t } from './i18n.js'

const STORAGE_KEY = 'l21-viewer-settings'

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
    {
      title: t('underwaterSection'),
      items: [
        { key: 'underwater', label: t('underwater'), hint: t('underwaterHint'), type: 'toggle', def: '0', remember: false },
        { key: 'season', label: t('season'), hint: t('seasonHint'), type: 'range', min: 0, max: 3, step: 1, def: '2', format: (v) => t('seasonValue', { index: Number(v) }), dependsOn: 'underwater' },
        { key: 'lamp', label: t('lamp'), hint: t('lampHint'), type: 'toggle', def: '1', dependsOn: 'underwater' },
      ],
    },
    {
      title: t('lighting'),
      items: [
        { key: 'hdriIntensity', label: t('skyStrength'), hint: t('skyStrengthHint'), type: 'range', min: 0, max: 2, step: 0.05, def: '0.35' },
        { key: 'sunIntensity', label: t('sunStrength'), hint: t('sunStrengthHint'), type: 'range', min: 0, max: 3, step: 0.05, def: '1' },
        { key: 'light', label: t('sun'), hint: t('sunHint'), type: 'angles', def: '320,65', ranges: [[0, 360, 1], [0, 90, 1]], unit: '°' },
        { key: 'exposure', label: t('exposure'), type: 'range', min: 0.25, max: 3, step: 0.05, def: '1.2' },
        { key: 'contrast', label: t('contrast'), hint: t('contrastHint'), type: 'range', min: 0.5, max: 2, step: 0.05, def: '1' },
        { key: 'saturation', label: t('saturation'), hint: t('saturationHint'), type: 'range', min: 0, max: 2, step: 0.05, def: '1.2' },
        { key: 'wet', label: t('wet'), hint: t('wetHint'), type: 'range', min: 0, max: 1, step: 0.05, def: '0.15' },
      ],
    },
    {
      title: t('advanced'),
      advanced: true,
      items: [
        { key: 'profile', label: t('profile'), type: 'select', def: '', options: [['', t('profileAuto')], ['desktop', t('profileDesktop')], ['mobile', t('profileMobile')]] },
        { key: 'stats', label: t('stats'), type: 'toggle', def: '0' },
        { key: 'tone', label: t('tone'), type: 'select', def: 'agx', options: [['agx', 'AgX'], ['neutral', t('toneNeutral')], ['aces', 'ACES'], ['none', t('toneNone')]] },
      ],
    },
  ]
}

class SettingsPanel extends HTMLElement {
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
    this.setAttribute('aria-label', t('settingsDialog'))
    this.render()
    this.button.hidden = false
    this.button.addEventListener('click', () => this.toggle(this.hidden))
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

  toggle(open) {
    this.hidden = !open
    this.button.setAttribute('aria-expanded', String(open))
  }

  // Keeps the value (forgotten when it equals the default), then applies it
  set(item, value) {
    if (value === item.def || value === '') this.params.delete(item.key)
    else this.params.set(item.key, value)
    this.live[item.key]?.(value)
    saveSettings(this.params, this.schema)
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
    title.textContent = t('settings')
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'settings-close'
    close.setAttribute('aria-label', t('settingsClose'))
    close.textContent = '×'
    close.addEventListener('click', () => this.toggle(false))
    head.append(title, close)
    this.append(head)

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
    const reset = button(t('reset'), () => {
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
      code.textContent = t('session', { code: this.session })
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

// <l21-settings-panel>: native Custom Element (GUIDELINES.md) with one control per query parameter of the viewer, opened
// by the ⚙ button. Every setting applies at once through its "live" handler (main.js), sliders while they move: the
// page never reloads. The settings are not written into the address (it keeps only the camera); they start from the
// query parameters read at load. Labels in French, like the rest of the viewer.
//
// Usage: const panel = document.createElement('l21-settings-panel')
//        panel.configure({ schema, values, live, button }); document.body.append(panel)

// type: toggle | range | select | text | angles (two ranges stored as "a,b")
// dependsOn: key of a toggle (the row is shown only while it is on), or [key, value] (shown only while that setting
// has that value)
export function settingsSchema({ mobile }) {
  return [
    {
      title: 'Éclairage',
      items: [
        { key: 'hdri', label: 'Éclairage par le ciel', type: 'toggle', def: '1' },
        { key: 'hdriIntensity', label: 'Force du ciel', type: 'range', min: 0, max: 3, step: 0.05, def: '1' },
        { key: 'sky', label: 'Ciel en arrière-plan', type: 'toggle', def: '0' },
        { key: 'wet', label: 'Aspect mouillé', hint: 'zones seulement: reflets du ciel, couleurs plus saturées', type: 'range', min: 0, max: 1, step: 0.05, def: '0.15', dependsOn: 'hdri' },
      ],
    },
    {
      title: 'Couleurs',
      items: [
        { key: 'neutral', label: 'Neutralisation de la teinte', hint: "0 = teinte jaune-vert de l'eau gardée, 1 = gris neutre", type: 'range', min: 0, max: 1, step: 0.05, def: '0.3' },
        { key: 'despill', label: 'Retrait du vert', hint: 'retire le vert dominant pixel par pixel (algues, reflets)', type: 'range', min: 0, max: 1, step: 0.05, def: '1' },
      ],
    },
    {
      title: 'Occlusion ambiante',
      items: [
        { key: 'ao', label: 'Ombres dans les creux', type: 'toggle', def: mobile ? '0' : '1' },
        { key: 'aoRadius', label: 'Rayon', type: 'range', min: 0.1, max: 5, step: 0.1, def: '1', unit: ' m', dependsOn: 'ao' },
        { key: 'aoIntensity', label: 'Force', type: 'range', min: 0, max: 10, step: 0.1, def: '3', dependsOn: 'ao' },
      ],
    },
    {
      title: 'Avancé',
      advanced: true,
      items: [
        { key: 'profile', label: 'Profil', type: 'select', def: '', options: [['', 'automatique'], ['desktop', 'ordinateur'], ['mobile', 'téléphone']] },
        { key: 'stats', label: 'Statistiques (mémoire, tuiles)', type: 'toggle', def: '0' },
        { key: 'aoDebug', label: 'Occlusion seule', type: 'toggle', def: '0', dependsOn: 'ao' },
        { key: 'tiles', label: 'Source des tuiles', hint: 'adresse, ex. http://localhost:8081', type: 'text', def: '' },
        { key: 'relief', label: 'Relief (normal maps des zones)', type: 'select', def: '1', options: [['1', 'oui'], ['0', 'non'], ['sun', 'soleil (essai)'], ['debug', 'normal map']] },
        { key: 'light', label: 'Soleil (azimut, hauteur)', type: 'angles', def: '135,45', ranges: [[0, 360, 5], [0, 90, 5]], unit: '°', dependsOn: ['relief', 'sun'] },
        { key: 'shade', label: 'Part de lumière directe', type: 'range', min: 0, max: 1, step: 0.05, def: '0.6', dependsOn: ['relief', 'sun'] },
      ],
    },
  ]
}

class SettingsPanel extends HTMLElement {
  configure({ schema, values, live, button }) {
    this.schema = schema
    // Current values (URLSearchParams); a setting at its default is absent
    this.params = new URLSearchParams(values)
    this.live = live
    this.button = button
  }

  connectedCallback() {
    this.hidden = true
    this.setAttribute('role', 'dialog')
    this.setAttribute('aria-label', 'Réglages du visualiseur')
    this.render()
    this.button.hidden = false
    this.button.addEventListener('click', () => this.toggle(this.hidden))
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
    this.showDependents()
  }

  // Rows with dependsOn: shown only while their toggle is on. Revealed and hidden with the MD3 enter / exit motion
  // (SYSTEM-DESIGN.md, Motion); instantly when the panel is drawn or when the system asks for reduced motion
  showDependents(animate = true) {
    const still = !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    for (const item of this.schema.flatMap((section) => section.items)) {
      if (!item.dependsOn) continue
      const [key, value] = Array.isArray(item.dependsOn) ? item.dependsOn : [item.dependsOn, '1']
      const on = (this.params.get(key) ?? this.item(key).def) === value
      const row = this.querySelector(`[data-key="${item.key}"]`)
      if (row.dataset.shown === String(on)) continue
      row.dataset.shown = String(on)
      if (still) row.hidden = !on
      else reveal(row, on)
    }
  }

  item(key) {
    return this.schema.flatMap((section) => section.items).find((item) => item.key === key)
  }

  render() {
    const head = document.createElement('div')
    head.className = 'settings-head'
    const title = document.createElement('h2')
    title.textContent = 'Réglages'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'settings-close'
    close.setAttribute('aria-label', 'Fermer les réglages')
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
    const copy = button('Copier le lien de cette vue', async () => {
      const href = this.live.shareUrl ? this.live.shareUrl() : location.href
      await navigator.clipboard?.writeText(href).catch(() => {})
      copy.textContent = 'Lien copié'
      setTimeout(() => (copy.textContent = 'Copier le lien de cette vue'), 1500)
    })
    const reset = button('Réinitialiser', () => {
      // Back to the defaults, keeping the view; the controls are drawn again with their default values
      for (const item of this.schema.flatMap((section) => section.items)) {
        if (!this.params.has(item.key)) continue
        this.params.delete(item.key)
        this.live[item.key]?.(item.def)
      }
      this.replaceChildren()
      this.render()
    })
    actions.append(copy, reset)
    this.append(actions)
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
    const show = () => (output.textContent = inputs.map((r) => `${r.value}${item.unit ?? ''}`).join(', '))
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

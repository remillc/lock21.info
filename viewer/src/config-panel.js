// <l21-settings-panel>: native Custom Element (GUIDELINES.md) with one control per query parameter of the viewer, opened
// by the ⚙ button. Every change goes into the address (?neutral=0.5…), so a configuration can be shared like a view;
// the page that embeds the viewer is told too. Settings with a "live" handler apply at once; the others decide
// materials or loading, so the viewer reloads (the camera is in the address, so the view is kept). A value equal to
// its default is removed from the address. Labels in French, like the rest of the viewer.
//
// Usage: const panel = document.createElement('l21-settings-panel')
//        panel.configure({ schema, live, button, onAddressChange }); document.body.append(panel)

// type: toggle | range | select | text | angles (two ranges stored as "a,b")
export function settingsSchema({ mobile, errorDefault }) {
  return [
    {
      title: 'Affichage',
      items: [
        { key: 'error', label: 'Niveau de détail', hint: 'plus bas = plus net, plus lourd', type: 'range', min: 1, max: 40, step: 1, def: String(errorDefault), unit: ' px' },
      ],
    },
    {
      title: 'Éclairage',
      items: [
        { key: 'hdri', label: 'Éclairage par le ciel', type: 'toggle', def: '1' },
        { key: 'hdriIntensity', label: 'Force du ciel', type: 'range', min: 0, max: 3, step: 0.05, def: '1' },
        { key: 'sky', label: 'Ciel en arrière-plan', type: 'toggle', def: '0' },
      ],
    },
    {
      title: 'Couleurs',
      items: [
        { key: 'balance', label: 'Équilibre entre les zones', hint: 'ramène toutes les zones à une même couleur', type: 'toggle', def: '1' },
        { key: 'neutral', label: 'Neutralisation de la teinte', hint: "0 = teinte jaune-vert de l'eau gardée, 1 = gris neutre", type: 'range', min: 0, max: 1, step: 0.05, def: '0.3' },
        { key: 'despill', label: 'Retrait du vert', hint: 'retire le vert dominant pixel par pixel (algues, reflets)', type: 'range', min: 0, max: 1, step: 0.05, def: '1' },
      ],
    },
    {
      title: 'Occlusion ambiante',
      items: [
        { key: 'ao', label: 'Ombres dans les creux', type: 'toggle', def: mobile ? '0' : '1' },
        { key: 'aoRadius', label: 'Rayon', type: 'range', min: 0.1, max: 5, step: 0.1, def: '1', unit: ' m' },
        { key: 'aoIntensity', label: 'Force', type: 'range', min: 0, max: 10, step: 0.1, def: '3' },
      ],
    },
    {
      title: 'Avancé',
      advanced: true,
      items: [
        { key: 'profile', label: 'Profil', type: 'select', def: '', options: [['', 'automatique'], ['desktop', 'ordinateur'], ['mobile', 'téléphone']] },
        { key: 'stats', label: 'Statistiques (mémoire, tuiles)', type: 'toggle', def: '0' },
        { key: 'aoDebug', label: 'Occlusion seule', type: 'toggle', def: '0' },
        { key: 'tiles', label: 'Source des tuiles', hint: 'adresse, ex. http://localhost:8081', type: 'text', def: '' },
        { key: 'relief', label: 'Relief (tuiles d’essai)', type: 'select', def: '0', options: [['0', 'non'], ['1', 'oui'], ['debug', 'carte de relief']] },
        { key: 'light', label: 'Soleil (azimut, hauteur)', type: 'angles', def: '135,45', ranges: [[0, 360, 5], [0, 90, 5]], unit: '°' },
        { key: 'shade', label: 'Part de lumière directe', type: 'range', min: 0, max: 1, step: 0.05, def: '0.6' },
        { key: 'wet', label: 'Aspect mouillé', type: 'range', min: 0, max: 1, step: 0.05, def: '0.15' },
      ],
    },
  ]
}

class SettingsPanel extends HTMLElement {
  configure({ schema, live, button, onAddressChange }) {
    this.schema = schema
    this.live = live
    this.button = button
    this.onAddressChange = onAddressChange
  }

  connectedCallback() {
    this.params = new URLSearchParams(location.search)
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

  // Writes the value into the address (removed when it equals the default), then applies it
  set(item, value) {
    if (value === item.def || value === '') this.params.delete(item.key)
    else this.params.set(item.key, value)
    this.updateAddress()
    if (this.live[item.key]) this.live[item.key](value)
    else location.reload()
  }

  updateAddress() {
    const query = this.params.toString().replace(/%2C/g, ',')
    const search = query ? `?${query}` : ''
    history.replaceState(null, '', location.pathname + search)
    this.onAddressChange?.(search)
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
        box.append(control(item, this.params.get(item.key) ?? item.def, (v) => this.set(item, v)))
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
      // Back to the defaults, keeping the view
      const cam = this.params.get('cam')
      this.params = new URLSearchParams(cam ? { cam } : {})
      this.updateAddress()
      location.reload()
    })
    actions.append(copy, reset)
    this.append(actions)
  }
}
customElements.define('l21-settings-panel', SettingsPanel)

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
    for (const input of inputs) {
      input.addEventListener('input', show)
      input.addEventListener('change', () => onChange(inputs.map((r) => r.value).join(',')))
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

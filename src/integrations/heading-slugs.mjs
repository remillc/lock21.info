// Heading anchors as plain slugs (TODO #125, Christian, 2026-11-03): « État des zones » is #etat-des-zones, not
// #état-des-zones, which an address escapes as #%C3%A9tat-des-zones. The Markdown processor's own step keeps an id
// that a heading already has, and so does Starlight's, which adds the heading's link and reads the id: this plugin runs
// before them (added before Starlight in astro.config.mjs). A heading whose anchor changes keeps the former one too, on
// an empty <span> at its start: links from elsewhere still arrive at the heading, without a script.
import Slugger from 'github-slugger'

/** Without accents; œ and æ have no decomposition @param {string} text */
const plain = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')

/** Sätteri hast plugin for one document (its own sluggers: a second « Test effectué » is -1) */
function plugin() {
  const slugs = new Slugger()
  const former = new Slugger()
  return {
    name: 'l21-heading-slugs',
    element: {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      /**
       * @param {{ properties?: Record<string, unknown>, children?: unknown[] }} node
       * @param {{ textContent: (node: unknown) => string }} ctx
       */
      visit(node, ctx) {
        if (typeof node.properties?.id === 'string') return
        const text = ctx.textContent(node)
        const id = slugs.slug(plain(text))
        const old = former.slug(text)
        const children = old === id ? node.children : [{ type: 'element', tagName: 'span', properties: { id: old }, children: [] }, ...(node.children ?? [])]
        return { ...node, properties: { ...node.properties, id }, children }
      },
    },
  }
}

/** @returns {import('astro').AstroIntegration} */
export default function headingSlugs() {
  return {
    name: 'l21-heading-slugs',
    hooks: {
      'astro:config:setup': ({ config }) => {
        const processor = /** @type {{ options?: { hastPlugins?: unknown[] } }} */ (config.markdown.processor)
        processor?.options?.hastPlugins?.push(plugin)
      },
    },
  }
}

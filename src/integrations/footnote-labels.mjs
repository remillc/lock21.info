// Footnotes in the page's language (usability audit V19). Markdown's footnotes ([^1]) end in a section headed
// « Footnotes », with « Back to reference 1 » links, in English whatever the page (the Markdown processor's defaults,
// Sätteri, one setting for the whole site); the heading also shows in the page's table of contents. This plugin writes
// them in French on the French pages, and leaves the English pages (src/content/docs/en/) as they are.
// Added to the Markdown processor's plugins, as Starlight adds its own; the processor reads the table of contents'
// headings after them, so it gets « Notes » too.
import { fileURLToPath } from 'node:url'

/** The French labels: the heading, and the back links' « Back to reference 1 » (« 1-2 » for a note cited twice) */
const LABEL = 'Notes'
const BACK = "Retour à l'appel de note"

/**
 * Sätteri hast plugin for one document: null (nothing to do) outside the French pages
 * @param {{ fileURL?: URL }} ctx
 */
function plugin({ fileURL }) {
  const path = fileURL ? fileURLToPath(fileURL) : ''
  if (!/[\\/]content[\\/]docs[\\/]/.test(path) || /[\\/]content[\\/]docs[\\/]en[\\/]/.test(path)) return null
  return {
    name: 'l21-footnote-labels',
    element: {
      filter: ['h2', 'a'],
      /**
       * @param {{ tagName: string, properties?: Record<string, unknown> }} node
       * @param {{ setProperty: (node: unknown, key: string, value: unknown) => void }} ctx
       */
      visit(node, ctx) {
        const props = node.properties ?? {}
        if (node.tagName === 'h2' && props.id === 'footnote-label') {
          return { ...node, children: [{ type: 'text', value: LABEL }] }
        }
        if (node.tagName === 'a' && 'dataFootnoteBackref' in props && typeof props.ariaLabel === 'string') {
          ctx.setProperty(node, 'ariaLabel', props.ariaLabel.replace(/^Back to reference/, BACK))
        }
      },
    },
  }
}

/** @returns {import('astro').AstroIntegration} */
export default function footnoteLabels() {
  return {
    name: 'l21-footnote-labels',
    hooks: {
      'astro:config:setup': ({ config }) => {
        const processor = /** @type {{ options?: { hastPlugins?: unknown[] } }} */ (config.markdown.processor)
        processor?.options?.hastPlugins?.push(plugin)
      },
    },
  }
}

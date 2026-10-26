// The placeholders of unfinished sections, « *(à compléter)* » / “*(to be completed)*” alone in their paragraph
// (AGENTS.md, Conventions for docs), marked with the class l21-todo, which custom.scss draws as a dashed note. Added to
// the Markdown processor's plugins, as footnote-labels.mjs does; the Markdown stays as it is written.

/** The paragraph's text, when it is one <em> and nothing else (white space aside) @param {any} node */
function soleEmphasis(node) {
  const children = (node.children ?? []).filter((child) => !(child.type === 'text' && !child.value.trim()))
  if (children.length !== 1 || children[0].type !== 'element' || children[0].tagName !== 'em') return null
  const text = (/** @type {any} */ n) => (n.type === 'text' ? n.value : (n.children ?? []).map(text).join(''))
  return text(children[0]).trim()
}

/** Sätteri hast plugin for one document */
function plugin() {
  return {
    name: 'l21-placeholder-marks',
    element: {
      filter: ['p'],
      /**
       * @param {any} node
       * @param {{ setProperty: (node: unknown, key: string, value: unknown) => void }} ctx
       */
      visit(node, ctx) {
        const text = soleEmphasis(node)
        if (text && /^\((à compléter|to be completed)\b/i.test(text)) ctx.setProperty(node, 'className', ['l21-todo'])
      },
    },
  }
}

/** @returns {import('astro').AstroIntegration} */
export default function placeholderMarks() {
  return {
    name: 'l21-placeholder-marks',
    hooks: {
      'astro:config:setup': ({ config }) => {
        const processor = /** @type {{ options?: { hastPlugins?: unknown[] } }} */ (config.markdown.processor)
        processor?.options?.hastPlugins?.push(plugin)
      },
    },
  }
}

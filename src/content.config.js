import { defineCollection } from 'astro:content'
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders'
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // Starlight's own interface texts, where its defaults don't suit (src/content/i18n/fr.json, en.json): the search's
  // results in the page's language, « Sélectionner » with its accent (usability audit V8, V19)
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
}

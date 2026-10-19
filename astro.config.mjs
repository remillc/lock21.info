// Site lock21.info: Astro + Starlight (see GUIDELINES.md). French is the root locale; the structure is ready for
// English (/en/), which ships when pages are translated. The 3D viewer is a separate app (viewer/), built into
// public/modele/ and served as is at /modele/.
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://lock21.info',
  integrations: [
    starlight({
      // Site name per language (DESIGN.md): Écluse 21 in French, Lock 21 in English
      title: { fr: 'Écluse 21', en: 'Lock 21' },
      description: "Photogrammétrie sous-marine de l'écluse 21 (Dickinson Landing): carnet de terrain et modèle 3D",
      logo: { src: './src/assets/logo.svg', alt: 'Écluse 21' },
      favicon: '/images/favicon.ico',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Français', lang: 'fr' },
        en: { label: 'English', lang: 'en' },
      },
      // Not public yet: no indexing (robots.txt does the same for crawlers that read it first)
      head: [
        { tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } },
        // Click a figure image to see it full size (public/scripts/image-zoom.js)
        { tag: 'script', attrs: { type: 'module', src: '/scripts/image-zoom.js' } },
      ],
      customCss: ['./src/styles/custom.scss'],
      sidebar: [
        { label: 'Modèle 3D', link: '/modele/', attrs: { target: '_self' } },
        { label: 'Découpage du site', link: '/decoupage-du-site/' },
        { label: 'La collecte des données', items: [{ autogenerate: { directory: 'collecte' } }] },
        { label: 'Workflow', items: [{ autogenerate: { directory: 'workflow' } }] },
        { label: 'Problèmes rencontrés', items: [{ autogenerate: { directory: 'questions' } }] },
        // tests/ stays out of the sidebar, as before
      ],
    }),
  ],
})

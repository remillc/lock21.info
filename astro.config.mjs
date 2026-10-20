// Site lock21.info: Astro + Starlight (see GUIDELINES.md). French is the root locale; the structure is ready for
// English (/en/), which ships when pages are translated. The 3D viewer is a separate app (viewer/), built into
// public/modele/viewer/ and served as is at /modele/viewer/ (in development, forwarded to the viewer's dev server).
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// Dev server only: /modele/viewer/ (embedded by the /modele/ page) is forwarded to the viewer's own dev server
// (npm run viewer:dev, port 3100, same path), so the page shows the viewer's source and reloads with it, websocket
// included. In production, GitHub Pages serves the built viewer from public/modele/viewer/.
const viewerDev = { target: 'http://localhost:3100', changeOrigin: true, ws: true }

export default defineConfig({
  site: 'https://lock21.info',
  vite: { server: { proxy: { '/modele/viewer': viewerDev } } },
  integrations: [
    starlight({
      // Site name per language (SYSTEM-DESIGN.md): Écluse 21 in French, Lock 21 in English
      title: { fr: 'Écluse 21', en: 'Lock 21' },
      description: "Photogrammétrie sous-marine de l'écluse 21 (Dickinson Landing): carnet de terrain et modèle 3D",
      // Logo S4 "21 en écho" (SYSTEM-DESIGN.md); figures drawn as outlines, no font needed
      logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg', alt: 'Écluse 21' },
      favicon: '/favicon.svg',
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
      // Fonts self-hosted (SYSTEM-DESIGN.md), then the MD3 tokens, then the global styles
      customCss: [
        '@fontsource/archivo/400.css',
        '@fontsource/archivo/500.css',
        '@fontsource/archivo/700.css',
        '@fontsource/archivo/800.css',
        '@fontsource/jetbrains-mono/400.css',
        '@fontsource/jetbrains-mono/500.css',
        '@fontsource/jetbrains-mono/700.css',
        '@fontsource/jetbrains-mono/800.css',
        './src/styles/tokens.scss',
        './src/styles/custom.scss',
      ],
      components: {
        // Client-side routing (ClientRouter) and the search kept across pages
        Head: './src/components/Head.astro',
        Search: './src/components/Search.astro',
        SiteTitle: './src/components/SiteTitle.astro',
        SocialIcons: './src/components/HeaderActions.astro',
        PageTitle: './src/components/PageTitle.astro',
        Footer: './src/components/Footer.astro',
        Sidebar: './src/components/Sidebar.astro',
      },
      sidebar: [
        { label: 'Modèle 3D', link: '/modele/' },
        { label: 'Découpage du site', link: '/decoupage-du-site/' },
        { label: 'La collecte des données', items: [{ autogenerate: { directory: 'collecte' } }] },
        { label: 'Workflow', items: [{ autogenerate: { directory: 'workflow' } }] },
        { label: 'Problèmes rencontrés', items: [{ autogenerate: { directory: 'questions' } }] },
        // tests/ stays out of the sidebar, as before
      ],
    }),
  ],
})

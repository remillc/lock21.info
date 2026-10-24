// Site lock21.info: Astro + Starlight (see docs/guidelines.md). French is the root locale; the structure is ready for
// English (/en/), which ships when pages are translated. The 3D viewer is a separate app (viewer/), built into
// public/modele/viewer/ and served as is at /modele/viewer (in development, forwarded to the viewer's dev server).
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import homeSlash from './src/integrations/home-slash.mjs'

// Dev server only: /modele/viewer (embedded by the /modele page) is forwarded to the viewer's own dev server
// (npm run viewer:dev, port 3100, same path), so the page shows the viewer's source and reloads with it, websocket
// included. In production, the hosting serves the built viewer from public/modele/viewer/.
const viewerDev = { target: 'http://localhost:3100', changeOrigin: true, ws: true }

export default defineConfig({
  site: 'https://lock21.info',
  // Page addresses without a final slash (/modele, /collecte/materiel-utilise): a page is a resource, not a folder.
  // The two home pages are collections and keep it, / and /en/ (homeSlash below, worker/index.js).
  // Pages are still built as <path>/index.html; the hosting serves them at <path> and redirects <path>/ there
  // (wrangler.jsonc, html_handling)
  trailingSlash: 'never',
  // Former addresses (TODO #58, 2026-10-24: the About page under its French name)
  redirects: { '/about': '/a-propos', '/en/about': '/en/a-propos' },
  // preview.proxy: {} because Vite's preview server would otherwise inherit the forwarding and serve the dev viewer
  // instead of the build (astro preview must show what the hosting serves)
  vite: { server: { proxy: { '/modele/viewer': viewerDev } }, preview: { proxy: {} } },
  integrations: [
    starlight({
      // Site name per language (docs/system-design.md): Écluse 21 in French, Lock 21 in English
      title: { fr: 'Écluse 21', en: 'Lock 21' },
      description: "Photogrammétrie sous-marine de l'écluse 21 (Dickinson Landing): carnet de terrain et modèle 3D",
      // Logo S4 "21 en écho" (docs/system-design.md); figures drawn as outlines, no font needed
      logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg', alt: 'Écluse 21' },
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Français', lang: 'fr' },
        en: { label: 'English', lang: 'en' },
      },
      head: [
        // Click a figure image to see it full size (public/scripts/image-zoom.js)
        { tag: 'script', attrs: { type: 'module', src: '/scripts/image-zoom.js' } },
      ],
      // Fonts self-hosted (docs/system-design.md), then the MD3 tokens, then the global styles
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
        MobileMenuFooter: './src/components/MobileMenuFooter.astro',
        PageFrame: './src/components/PageFrame.astro',
        // Theme and language selects: in the footer (Footer.astro), not in the header nor the mobile menu
        ThemeSelect: './src/components/Omitted.astro',
        LanguageSelect: './src/components/Omitted.astro',
      },
      sidebar: [
        { label: 'À propos', translations: { en: 'About' }, link: '/a-propos' },
        { label: 'Remerciements', translations: { en: 'Thanks' }, link: '/remerciements' },
        { label: 'Modèle 3D', translations: { en: '3D model' }, link: '/modele' },
        { label: 'Découpage du site', translations: { en: 'Site zones' }, link: '/decoupage-du-site' },
        { label: 'La collecte des données', translations: { en: 'Data collection' }, items: [{ autogenerate: { directory: 'collecte' } }] },
        { label: 'Workflow', translations: { en: 'Workflow' }, items: [{ autogenerate: { directory: 'workflow' } }] },
        { label: 'Problèmes rencontrés', translations: { en: 'Problems encountered' }, items: [{ autogenerate: { directory: 'questions' } }] },
        // tests/ stays out of the sidebar, as before
      ],
    }),
    // After Starlight (and its search index): / and /en/ for the home pages
    homeSlash(),
  ],
})

// Site lock21.info: Astro + Starlight (see docs/guidelines.md). French is the root locale; the structure is ready for
// English (/en/), which ships when pages are translated. The 3D viewer is a separate app (viewer/), built into
// public/modele/viewer/ and served as is at /modele/viewer (in development, forwarded to the viewer's dev server).
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import sitemap from '@astrojs/sitemap'
import icon from 'astro-icon'
import homeSlash from './src/integrations/home-slash.mjs'
import englishPaths from './src/integrations/english-paths.mjs'
import footnoteLabels from './src/integrations/footnote-labels.mjs'
import placeholderMarks from './src/integrations/placeholder-marks.mjs'
import contentImages from './src/integrations/content-images.mjs'

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
  // Former addresses (TODO #58, 2026-10-24: the About page under its French name; /en/about is the English page's own
  // address again since TODO #63, its French path /en/a-propos redirected by src/integrations/english-paths.mjs)
  redirects: { '/about': '/a-propos' },
  // preview.proxy: {} because Vite's preview server would otherwise inherit the forwarding and serve the dev viewer
  // instead of the build (astro preview must show what the hosting serves)
  // build.cssTarget: the components' native CSS nesting (docs/system-design.md) flattened for browsers before 2023
  // (Safari 16.5 and Chrome 112 read it; older ones, an old iPad included, would drop the nested rules)
  vite: {
    server: { proxy: { '/modele/viewer': viewerDev } },
    preview: { proxy: {} },
    build: { cssTarget: ['chrome100', 'safari15', 'firefox100', 'edge100'] },
    // The components' texts: Paraglide JS messages (messages/site.inlang), compiled into src/paraglide (gitignored).
    // Each call names the page's language (m.home_lead({}, { locale })): rendered at build time, no runtime shipped
    plugins: [
      paraglideVitePlugin({
        project: './messages/site.inlang',
        outdir: './src/paraglide',
        strategy: ['globalVariable', 'baseLocale'],
        emitReadme: false,
      }),
    ],
  },
  // Images in several widths (srcset): the page loads the one its column needs, the lightbox (public/scripts/image-zoom.js)
  // the widest; no extra styles from Astro (custom.scss sizes the figures)
  image: {
    layout: 'constrained',
    responsiveStyles: false,
  },
  integrations: [
    // Icons by name (src/components: <Icon name="material-symbols:…-rounded" />), from Iconify's Material Symbols set
    // (@iconify-json/material-symbols, a dev dependency: npm update to follow Google's drawings); only the ones listed
    // here are bundled, the names a component builds at run time included (TODO #74, 2026-10-26)
    icon({
      include: {
        'material-symbols': ['deployed-code-outline-rounded', 'public-outline-rounded', 'download-rounded', 'expand-more-rounded',
          'home-outline-rounded', 'scuba-diving-rounded', 'tour-outline-rounded', 'help-outline-rounded', 'view-in-ar-outline-rounded'],
      },
    }),
    // Footnotes headed « Notes » on the French pages, « Footnotes » on the English ones (usability audit V19)
    footnoteLabels(),
    // The « (à compléter) » placeholders drawn as a dashed note (class l21-todo, custom.scss)
    placeholderMarks(),
    // The sitemap, as Starlight would add it (same i18n), without the test pages (in no menu: usability audit V9) and the 404 pages
    sitemap({
      i18n: { defaultLocale: 'root', locales: { root: 'fr', en: 'en' } },
      filter: (page) => !/\/tests\/|\/404$/.test(new URL(page).pathname),
    }),
    starlight({
      // Site name per language (docs/system-design.md): Écluse 21 in French, Lock 21 in English
      title: { fr: 'Écluse 21', en: 'Lock 21' },
      // No site-wide description (Christian, 2026-10-26): a page has its own, or none, and the search engine then
      // quotes the page's text (SEO audit S1, docs/audits/seo-2026-10-26.md). The share image, og:locale and the
      // structured data: src/routeData.js
      routeMiddleware: './src/routeData.js',
      // Logo S4 "21 en écho" (docs/system-design.md); figures drawn as outlines, no font needed
      logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg', alt: 'Écluse 21' },
      favicon: '/favicon.svg',
      // Our own 404 pages, French and English, with links onward (src/pages/404.astro, src/pages/en/404.astro)
      disable404Route: true,
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
        { label: 'Modèle 3D', translations: { en: '3D model' }, link: '/modele' },
        { label: 'À propos', translations: { en: 'About' }, link: '/a-propos' },
        { label: 'Remerciements', translations: { en: 'Thanks' }, link: '/remerciements' },
        { label: "À propos de l'écluse 21", translations: { en: 'About Lock 21' }, link: '/a-propos-ecluse-21' },
        { label: 'Découpage du site', translations: { en: 'Site zones' }, link: '/decoupage-site' },
        // collapsed: each group closed in the page's HTML, except the current page's (Starlight opens that one), so that
        // nothing opens then closes as the page loads (TODO #87; the memory of the open groups: Head.astro)
        { label: 'La collecte des données', translations: { en: 'Data collection' }, collapsed: true, items: [{ autogenerate: { directory: 'collecte' } }] },
        { label: 'Le traitement', translations: { en: 'Processing' }, collapsed: true, items: [{ autogenerate: { directory: 'traitement' } }] },
        { label: 'Problèmes rencontrés', translations: { en: 'Problems encountered' }, collapsed: true, items: [{ autogenerate: { directory: 'problemes' } }] },
        // tests/ stays out of the sidebar, as before
      ],
    }),
    // The notebook's images: sizes for the content column, the first one loaded first (content-images.mjs)
    contentImages(),
    // After Starlight (and its search index): / and /en/ for the home pages
    homeSlash(),
    // Then the English pages at their English addresses, and the search index rebuilt (TODO #63)
    englishPaths(),
  ],
})

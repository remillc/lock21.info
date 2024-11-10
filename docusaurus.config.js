// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import 'dotenv/config'
import { themes as prismThemes } from 'prism-react-renderer'

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Lock 21 3D',
  tagline: 'Dive into history',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://lock21.info',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'remillc', // Usually your GitHub org/user name.
  projectName: 'lock21.info', // Usually your repo name.
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'ignore',
  onBrokenMarkdownLinks: 'ignore',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
  },
  future: {
    experimental_faster: true,
    experimental_storage: {
      type: 'localStorage',
    }
  },

  plugins: [
    'docusaurus-plugin-sass',
    'docusaurus-plugin-image-zoom'
  ],

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'i18n/fr/docusaurus-plugin-content-docs/current/',
          routeBasePath: '/', // Serve the docs at the site's root
          sidebarPath: './src/sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/remillc/lock21.info/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/remillc/lock21.info/',
        },
        theme: {
          customCss: './src/scss/custom.scss',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      // Replace with your project's social card
      image: 'images/docusaurus-social-card.jpg',
      navbar: {
        title: 'Lock21.info',
        logo: {
          alt: 'Lock21.info',
          src: 'images/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'makingOfSidebar',
            position: 'left',
            label: 'Projet',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            type: 'dropdown',
            label: 'Langues',
            position: 'right',
            items: [
              {
                label: 'Français',
                to: '/',
              },
              {
                label: 'English',
                to: '/en/',
              },
            ],
          },
          {
            href: 'https://github.com/remillc/lock21.info',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Tutorial',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/docusaurus',
              },
              {
                label: 'Discord',
                href: 'https://discordapp.com/invite/docusaurus',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/docusaurus',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/facebook/docusaurus',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
      zoom: {
        // selector: '.markdown :not(em) > img',
        // options: {
        //   background: 'rgba(0, 0, 0, 0.5)',
        // },
      }
    }),
}

export default config

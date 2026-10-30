# Changelog

Versions follow [semantic versioning](https://semver.org/) (major.minor.patch): below 1.0.0 while the site was not
public, 1.0.0-beta.N while it is tried out in public, 1.0.0 at its launch.

## Unreleased

- About page: Lock 23 3D described as it is, measured underwater and redrawn in 3D piece by piece (it was « the same
  work », photogrammetry).
- « Installer l'app » / “Install the app” on the About page (TODO #110): what the app gives (offline reading by the
  water, the home screen) and a button, always shown: it opens the browser's install where it offers one (Chrome,
  Edge, Android; their own bar at arrival stopped), else shows the steps (Safari on iPhone and iPad, or the browser's
  menu); « installed » once it is. Also a « Installer l'app » link in the footer bar and at the end of the ☰ menu on
  phones (its icon orange), and, once only, an MD3 snackbar at the bottom (« Lire le site hors ligne, au bord de
  l'eau ? Installer ✕ »): from the 3rd visit or the 5th page read, where the browser offers the install, never at
  arrival nor on /modele. Analytics: install_offer, app_install (accepted, dismissed, steps; source about or snackbar)
  and app_installed.
- Google Analytics, the guided tour: `tour_step` says whether the visitor went forward or back (`direction`), and
  `tour_step`, `tour_return`, `tour_stop` and `tour_complete` the time spent on the step left (`step_seconds`).
- The site is a web app (TODO #81): installable on a phone or a computer (its manifest in French or English, icons
  from the logo), and readable offline. A service worker fetches pages from the network first and keeps each page read
  on the device (with its images and styles); without network, the kept copy, or an offline page listing the kept
  pages. The 3D model is not kept offline.
- Google Analytics: the theme as user properties, `theme_setting` (auto, dark, light: the footer's choice) and
  `theme_color_scheme` (the theme shown, dark or light, the system's when the choice is auto), set before each page
  view and at each change; the privacy page says so.
- The language select moved from the footer to the header bar, between the search and « Modèle 3D » (wide screens),
  and to the end of the ☰ menu on phones; the theme select stays in the footer.
- Google Earth: each opening of the downloaded KMZ (its list asked for by Google Earth) counted in Google Analytics as a
  `kmz_open` event, by the site's Worker; the privacy page says so (French and English).
- 3D viewer: the settings (the ⚙ panel and the « Équilibre » slider) hidden on the live site, shown in development or
  with `?settings=1` in a link; without them, the settings kept by the browser no longer apply. On touch screens the « ? » (the gestures' help) takes the
  settings' place, top right.

## 1.0.0-beta.4 - 2026-10-29

- Downloads (GLB, Google Earth, AR) rebuilt (`AR_VERSION` 2026-10-29b): the context's fillers smooth-shaded, as in
  the .blend, instead of faceted.
- 3D model: zones 3, 4, 11 and 13 republished with the .blend's boolean modifiers enabled again, and the mockups
  republished.
- The 404 page redesigned (TODO #86): « Trop profond. » / “Too deep.”, the home page's dive computer in alarm at
  404 ft and the depth gauge running past the lock's bottom down to it, the address asked for, the 3D model, the home
  page and the zone map as buttons, and a search that opens the site's own with the address's words.
- The publishing Blender file moved out of the repo, to `O:\modeles\lock-21\lock-21-publishing.blend` with its
  textures (Christian, 2026-10-28): the tools read it there by default; its earlier versions stay in the Git history.
- 3D viewer: a « Équilibre » slider under the settings button (?balance=0..1): how much of the colour balance between zones
  is applied; at 0 each texture shows as it is (the balance brought a zone graded at the source back to the other
  zones' yellow-green).
- 3D model: zone 3 retextured from colour-graded footage (TODO #75; the same mesh and texture size, online since
  2026-10-29), along with zone 12, the context and the mockups republished on 2026-10-27.
- Downloads rebuilt with the new zone 3 (GLB, Google Earth, AR: `AR_VERSION` 2026-10-29); the Google Earth list now
  points to its parts at `lock21.info/downloads`. The context no longer carries a helper box of the .blend's `terrain`
  collection (« boolean.032 », left visible to the render: a white block over the site from afar, online for an hour).
- 3D viewer, diving: the right button drags the diver sideways, up or down, and the wheel swims by a share of the
  distance ahead, as in the standard view (it was 0.5 m a notch).
- 3D viewer: the navigation's help opens by itself at the first visit, once the first view shows in the standard
  mode (remembered by the browser). It is drawn as the /modele page's « Naviguer »
  box: the mouse gestures with the small mouse and the keys as key caps, side by side, or the fingers on a touch
  screen (the first touch's card then not shown again). The « ? » of the keys opens the same.
- 3D viewer: the contrast of the lit surfaces at 1.3 by default (was 1, the textures' own).
- Guided tour: back is quicker and straight (about 3 s from step 3 to 2, was 5.4 s: up to 25 m/s and 20 m/s², no
  rise), and back again during a flight sets off at once toward the step before, from where the camera is and at its
  speed (it braked first, and went on toward the step it left for seconds).

## 1.0.0-beta.3 - 2026-10-29

- Downloads at the site's address, `lock21.info/downloads/…` (TODO #103): the whole-model GLB, the AR models and
  the Google Earth list, read from R2 by the site's Worker (too large for the static assets: 25 MiB a file), with
  ranges for resumed downloads. The files stay on R2 and their `tiles.lock21.info` addresses keep working.
- Analytics: a viewer setting's new value is sent as `setting_value` (was `value`, a parameter Google Analytics keeps
  for money), so it can be registered as a dimension.
- Tiles: the responses of `tiles.lock21.info` without the headers the viewer doesn't use (`Report-To`, `NEL`,
  `Speculation-Rules`, `Last-Modified`; a Cloudflare rule, docs/installation.md): 363 bytes of headers instead of 783 per
  tile (TODO #104).
- `?no-analytics=1` in an address turns Google Analytics off for the rest of the visit, for tests and Claude's checks
  of the live site (TODO #95); the 3D viewer's telemetry is not affected.
- 3D viewer, a faster start on /modele (TODO #96): its scripts preloaded with the page (`modulepreload`), a connection
  opened to the tiles' server and the manifest asked for in the `<head>`, instead of one after the other; the sky in two
  sizes, a 512 × 256 one (229 KB instead of 784 KB compressed) for the light and the background at first, the full one
  replacing the background once the first load is done. Measured on a simulated 4G connection: the first view's tiles
  arrive about 2 s sooner (34.5 → 32.4 s), the first one asked for 0.35 s sooner.
- « À propos de l'écluse 21 » is now « L'écluse 21 » (“Lock 21”; the tab keeps « À propos de l'écluse 21 »), at `/ecluse-21` (`/en/lock-21`); the former
  addresses redirect there for good (301). Its description names the depth, the current and the size, not only
  the history (TODO #102).
- Accessibility (TODO #43): every Markdown table's header cells named (8 pages, French and English), and the progress
  table's two empty spacer columns removed.
- Figure captions start where the image's straight edge does: inset by its corner radius (TODO #100).
- Notebook pages, wide screens: « Sur cette page » gives up width with the content as the window narrows (3 : 1,
  down to 14.5rem), and its entries use the column's whole width (Starlight held them to 16.75rem) (TODO #101).
- 3D viewer: its shader patches go through one function that reports a missing hook (console and telemetry) instead
  of failing silently after a three.js update; the relief's normal no longer copies a piece of three.js's own shader
  code (TODO #26).
- New page « Étalonnage des couleurs » (Processing, first step; French only for now): why the footage turns
  green-yellow under water (a drawing of the colours' absorption), the colour chart, and the common correction per dive
  in DaVinci Resolve (a LUT, TODO #75). It was a section of « Extraction des photos », which now links to it.
- Each page its own share image (TODO #98): its first photo, cropped to 1200 × 630; on /modele, the 3D viewer's start
  view; the home pages and the pages without a photo keep the site's image.
- The 3D viewer is part of the site (TODO #80): on /modele in an element of the page (<l21-viewer>, its controls in a
  shadow root) instead of an iframe of a separate app; one project, one build and one dev server (4321: `viewer:dev`,
  `build:viewer` and port 3100 gone; the bare /modele/viewer address too). Its code loads on /modele only and is taken
  down when the visitor leaves the page; the keys are the viewer's only while it has the focus (a press on the model);
  full screen on the viewer (the whole window on an iPhone); its texts are the site's messages (`viewer_…`).
- Underwater view: schools of young yellow perch where plants grow, at the « perches » empties of the .blend (zone 1's
  filler, zone 6's floor; exported with the mockups), 40 fish a school, 16 on a phone; they mill slowly close to the
  bottom and draw back from a diver closer than 1 m. They turn as the bass does, about a point near the head, the bend running down to the tail. The fish is
  made from a public-domain photo (U.S. Fish and Wildlife Service, credited on /modele); its spiny dorsal fin lies
  folded at rest, rises as the diver comes close and is laid down again after a few seconds.
- Underwater view: the swimming help (?) no longer says that the walls stop the diver. The movement keys' card says only « Maj : plus vite » (Shift: faster).
- Underwater view: the mouse wheel swims forward and back where the diver looks, 50 cm a notch (three times that with
  Shift), smoothly; the swimming help says so.
- 3D model: zone 18 republished (its mesh had changed in the .blend, its `source` property lost then restored).
- Underwater view: the bass turns as a fish does, about a point a third of its length from the snout (the head swings
  into the turn, the tail out of it), the bend starting at the head and running down to the tail (it pivoted on its
  centre, its whole body turning at once). The curious bass stops closer, about 3 ft from the diver (was about 4 ft).
  Swimming away, its body waves less widely.
- 3D viewer: the address no longer becomes `?cam=0.00,…` while the view loads in the underwater mode (it was written
  before the camera was placed, and a reload then started from there); such an address now gives the start view.
- `/modele`: the 3D viewer's frame enters as the page loads, rising to its place while growing and fading in (MD3
  entering motion, 450 ms; none with reduced motion).
- Underwater view: what stands at the season's visibility distance still shows, faintly; the water hides it
  completely at 1.5 times that distance (it was gone at the visibility itself: zone 18, 8 m away in autumn's 30 ft,
  barely showed).
- 3D viewer: a wider view, 60° high instead of 50° (things looked closer than they are: zone 18's wall, 24 ft away,
  looked about 8 ft).

## 1.0.0-beta.2 - 2026-10-26

Fixes to the 3D viewer: no more holes in the walls on large screens, a steady start view, faster panning and zoom;
and page descriptions for the search engines.

- 3D viewer: panning with the right button (standard view) twice as fast: the point pressed follows the pointer at
  half its pace (was a quarter).
- 3D viewer: the mouse wheel's zoom twice as fast (0.5 of OrbitControls' speed per notch, was 0.25).
- 3D viewer: no more missing pieces of the walls on large screens. The start view alone filled the 1 GB tile budget on
  a 1600 x 1000 canvas (960 MB) and overflowed it on Christian's (2394 x 1344): with lean loading the parts not loaded
  stayed empty. The detail now follows the screen's size (the error target grows past 1000 px of canvas height), the
  computers' error target is 8 (was 6: 600 MB at the start view, no difference to the eye, at 2 m from a wall none at
  all), and while the budget is full and tiles are refused the detail drops a step at a time (up to 4 times coarser),
  coming back once the tiles in use take under half the budget (telemetry: `detail-reduced`, `detail` in the facts).
- 3D viewer: the start view no longer jumps about 7 m forward (one load in three): the site's bounds, which keep the
  camera in, were computed once the context arrived even if some zones' roots were still loading, and stayed too small.
- Page descriptions (SEO audit S1, TODO #90) for the nine pages that answer a question: the dive log, the gear, the
  zones, and the problems encountered (current, banana effect, sharpness, colour chart, colour calibration, rig
  dimensions), in French and English; the processing steps and the tests still have none, on purpose.
- 3D model: the context (chart terrain, fillers, north and south walls) republished from the `.blend` of
  2026-10-26, its textures baked again (online on R2, `context/2026-10-26-1606`).

## 1.0.0-beta.1 - 2026-10-26

The first public beta. In short:

- **Audits:** usability (simulated visitors, Nielsen's heuristics, information architecture), accessibility (WCAG 2.2
  AA) and SEO, their records in `docs/audits/`, and most of their findings fixed.
- **Pages:** « À propos de l'écluse 21 », « Mise à l'échelle », « Le rig », an index of the problems encountered,
  « Alignement de chunks » written; every address, title and menu label made to agree (the former addresses
  redirected).
- **Design:** the notebook pages' own look (eyebrow, numbered headings, figures with dated captions, data chips), a
  lightbox with zoom, MD3 menus in the footer, no more flickering menu.
- **Search engines:** titles, a share image, structured data, a page description only where it says something, Bing
  Webmaster Tools set up.
- **3D viewer:** the guided tour on phones, Escape leaves dive mode, the depth from one constant, the analytics of the
  visitors' actions (unless refused).

Everything, in detail:

- « Le rig »: an assembly of 20 × 20 mm T-slot aluminium profiles (the 2020 series), in its first sentence; the four
  SecurityIng dive lights (10 white LEDs at 6000 K, 4 red, 4 blue, a 120° beam, 12,000 lumens claimed by the seller)
  with the seller's side view and its dimensions; what the floor brushes are for (clearing silt and shells off the
  surfaces before filming them).
- « La collecte des données »: its pages in a set order (dive log, gear, the rig, scaling).
- « À propos de l'écluse 21 »: the chip « Ennoyée » (the word for land a dam puts under water) instead of « Noyée ».
- `npm run bing:submit` (`tools/bing/submit-urls.mjs`): the live sitemap's addresses sent to Bing Webmaster Tools' URL
  Submission API (key in `.env.local`), cut to the daily quota.
- Claude Code skills for SEO, `seo-audit` and `schema` (coreyhaines31/marketingskills, MIT), copied after reading
  every file; the SEO audit of 2026-10-26 (`docs/audits/seo-2026-10-26.md`) made with them.
- Performance: the first image of a notebook page loads at once and first (it was lazy, and the page's largest
  element), and every content image tells the browser its column's width (`sizes`), so a smaller file is chosen
  (`src/integrations/content-images.mjs`).
- Lightbox: the next and previous figures are loaded ahead (widest size), so changing figure doesn't wait.
- Lightbox: as it opens, the scrim from 0 to 300 ms, the image, its caption and its buttons from 100 to 400 ms.
- Lightbox: the page behind no longer scrolls while it is open.
- Images in several sizes (Astro's responsive images): the page loads what its column needs, the lightbox the widest;
  « Le rig »'s photos regenerated from the originals up to 2400 px. In the lightbox, a click zooms to the image's own
  pixels where it has more than the screen shows (a drag moves around, a click shows it whole), animated on the spot.
  « Le rig »'s figures have short ids (`#rig`, `#lampes`, `#materiel`…) that the lightbox puts in the address.
- Lightbox: no more black flash as it opens (the scrim fades in steadily from the first frame).
- The lightbox (a figure opened on click): the image as large as the screen allows over a near-black scrim, never
  larger than its own pixels, its caption with its figure number, a counter, ✕ to close and ‹ › (or the arrow keys,
  or a swipe) to the page's other figures; the open figure in the address (`#fig-03`), so a link opens it.
  Its motion, MD3: the image grows from its thumbnail as it opens and shrinks back to it as it closes, the scrim
  fading with it; the next and previous figures slide along a shared axis.
- Notebook pages laid out as in « Le rig »'s mock-up: the text column set in, the wide photos across the whole column,
  the title tight above the lead, smaller section headings, 1.5rem between blocks, captions on two lines, paired
  photos the same shape.
- Accents on four pages (data chips of their facts, dated captions): « Effet de banane » (the curled and the corrected
  segment side by side), « Mise à l'échelle », « À propos de l'écluse 21 », « Matériel utilisé » (with a lead).
- The notebook's pages get a look of their own (from « Le rig »'s mock-up): the menu group's name above the title, a
  lead, numbered section headings, figures the column's width with mono captions numbered FIG. 01…, and the
  « (à compléter) » placeholders as dashed notes; « Le rig » also gets data chips, an opening photo and photos side by
  side. The link in its last caption fixed (Markdown is not read inside a figcaption).
- Left menu: its labels drawn bold from the first frame (Archivo 700 preloaded with the other fonts; they first showed
  in a lighter weight, then bold).
- Left menu: no more groups opening then closing as a page loads (TODO #87): the groups are closed in the page's HTML
  except the current page's (`collapsed: true`), and Starlight's memory of the open groups is forgotten between pages
  (`Head.astro`; the menu's scroll position kept).
- Changing the language from the footer opens the other language's page at its bottom, where the select is, not at its
  top (`Head.astro`).
- Footer: the theme and language lists open as MD3 menus (`appearance: base-select`, Chrome and Edge; the system's
  list elsewhere).
- New page « Le rig » / “The rig” in « La collecte des données »: the rig on the Seacraft Future 1000 scooter, with
  Christian's photos (2024), Sylvain Marcotte's 3D model of it, the lights' positions, the scooter's speed; the
  construction, the lights' model and the brushes still to complete. Linked from « Matériel utilisé » and the thanks.
- « Matériel utilisé »: a photo of the GoPro Hero6 Black (GoPro's product photo, credited, until Christian's own).
- Analytics (TODO #88): the visitors' actions go to Google Analytics (unless refused on the privacy page): on the site,
  a search, the menu, the theme and language, the home cards, an image enlarged (links out and scrolls: GA4's own
  measurement); in the 3D viewer, its buttons, the guided tour step by step, the dive (start, end, season, lamp), a
  setting changed, the first move, and the time in the normal view and diving (`viewer_end`). The viewer passes them to
  `/modele` (`viewer/src/analytics.js`); the telemetry keeps only technical facts. The privacy page lists them.
- Home page: « PROFONDEUR » / “DEPTH” instead of « PROFONDEUR DU FOND » / “BOTTOM DEPTH”.
- The 404 pages declare no canonical address nor language versions (SEO audit S16). The 3D model's mockups (zones
  not yet surveyed) are compressed with meshopt, in the publishing pipeline too (step 6b; online 2026-10-26).
- Hosting: an address with a final slash (`/modele/`) redirects to the page with a 301 instead of Cloudflare's 307
  (SEO audit S12; `/` and `/en/` keep their slash).
- Hosting: the Worker's `lock21-info.lock21.workers.dev` address is off, the site is only at lock21.info (SEO audit
  S11; branch previews keep their own addresses).
- The home page's description and the « À propos » page say what the site is: « le site du projet de numérisation de
  l'écluse 21 » / “the site of the project to digitize Lock 21”.
- « À propos de l'écluse 21 » opens with what divers look for: 60 feet (18.3 m) at the bottom, the piers' tops at 40
  feet (12 m), the current measured in the lock in June 2024 (SEO audit S4). « Canal » / “the lock” for the lock's
  chamber, the local words, added to the writing skill's terms.
- SEO (audit S2): the home page's title names the place and the topic, « Écluse 21 (Lock 21) : plongée et modèle 3D,
  Long Sault » / “Lock 21, Long Sault: dive site and 3D model”, and the model page's matches its heading, « Modèle 3D de
  l'écluse 21 » / “3D model of Lock 21” (`head` in their frontmatter; the menu and the headings unchanged).
- SEO (audit `docs/audits/seo-2026-10-26.md`, S3, S6, S7, S8, S13, S16): a share image for every page
  (`public/images/og-lock21.jpg`), `og:locale` `fr_CA` / `en_CA`, no site-wide description any more (a page has its
  own or none, and the search engine quotes its text), structured data (the site and its author on the home pages, the 3D model on `/modele`),
  all through `src/routeData.js`; « Dickinson's Landing » everywhere; 301s for the Docusaurus addresses (`/blog`,
  its feeds, `/docs/…`); no heading level skipped on « Netteté des images ».
- Site texts (usability audit V8, V19, V20, V27, V28, V35): the search dialog in French on French pages (a link to the
  other language now loads the page in full, so Pagefind takes its language); footnotes headed « Notes » on French
  pages; « Sélectionner »; English number formats on `/en/model`; the no-download Google Earth Web link before the
  import steps, « 150° »; the spaces in the phone AR line; the home's cards and panel out of the search; the extraction
  page links to the gear page.
- Site (usability audit V13, V18, V21, V36): the 404 page links onward (home, 3D model, zone map) and is in English
  under `/en/`; the dive log's total row reads « Total : N plongées » and its header stays in view on wide screens; the
  footer's theme and language selects show their whole text; a table wider than the column fades at the edge it
  scrolls toward.
- 3D viewer (usability audit V24, V25, V26, V29, V38): Escape leaves dive mode when nothing else is open; the tour's
  previous button is « Étape précédente » / “Previous step”; after a manual move during the tour, « Revenir à la vue »
  on the card replays the step; the settings panel opens with a line on what it keeps, and the session code says what
  it is for; the tour's last card names the ⌂ button.
- 3D model on a phone held upright: « Visite guidée » on its own line above the buttons, no longer cut off at the
  frame's left edge (usability audit V11).
- 3D model: the navigation help names the mouse button (« glisser (bouton gauche) » to turn, « (bouton droit) » to
  pan), and the viewer's « ? » card lists the mouse actions (turn, pan, wheel, double-click) before the keys (usability
  audit V10).
- The test pages (`/tests/…`, in no menu) are out of the site search and the sitemap; the empty test dive log is
  gone, its addresses redirected to the dive log (usability audit V9).
- The four processing pages (alignment, dense point cloud, models, texture) open with a line naming Agisoft
  Metashape, so the site search finds them (usability audit V7).
- Unfinished sections now show one mark, « *(à compléter)* » in French and “*(to be completed)*” in English, in place
  of `awef`, `???`, `[TODO …]` and empty headings; zones 18 to 25 at the same heading level as the others (usability
  audit V6).
- « À propos de l'écluse 21 »: the 1904 photo as wide as Nick Baets' plan (`figure-wide`).
- « Suivi du travail par zone »: a line at the top, the table is a working tool that may not be up to date, with a link
  to the 3D model for what is online (usability audit V5).
- « À propos de l'écluse 21 »: Nick Baets' plan of the lock, the bilingual version displayed at the divers' pavilion on
  Macdonell Island (photo from David Gibbins' « Diving Lock 21 », 2016; the drawing from the SOS field guide n° 2, 1989,
  `docs/sos-files/Lock 21 - No. 2/img383.jpg`), wide, after the SOS paragraph.
- Figures: a `figure-center` class (usual size, image and caption centred), used for the 1904 photo.
- « À propos de l'écluse 21 »: a photo of the lock around 1904 (Seaway History; a Canadian photo from before 1949, in
  the public domain).
- « À propos de l'écluse 21 » / “About Lock 21” (`/a-propos-ecluse-21`, before « Découpage du site » in the menu): the
  lock's main points (the Cornwall Canal, the guard lock rebuilt in 1883-1886, the flooding of July 1, 1958, the SOS
  survey of 1988-1989) and links to the Lost Villages Historical Society, the Ontario Heritage Trust, Wikipedia and
  SOS (usability audit V4). The guided tour's step 2: the piers' tops at 40 ft (12 m).
- The tops of the lock's walls at 35 ft (10,7 m) everywhere (Christian, 2026-10-26; « À propos » and the tour's step 2
  said 40 ft): usability audit V15.
- 3D viewer, guided tour on a touch screen (Christian, 2026-10-26): the card hides while the camera flies to the next
  step and comes back 1.5 s after it has arrived (MD3 motion: out 200 ms, in 400 ms), the new step's texts put in
  while hidden; outside full screen the buttons at the bottom go away while the tour runs, and the card takes their
  place. On every screen, the buttons at the top right (settings, the gestures' help) hide during the tour.
- While the tour's card is hidden for a flight, a close button at the top right stops the tour; it fades out as the
  card comes back (Christian, 2026-10-26).
- 3D viewer, guided tour on a phone held upright (usability audit V2): the /modele frame there (358 × 316) counted as
  « landscape » and got the sideways phones' layout, the card squeezed to 100 px with its arrows over the AR and dive
  buttons. The sideways layout now needs a wide window (600 px); in a short, narrow frame the card sits above the
  buttons, its arrows on the top row beside the step's number and the close button, the text scrolling inside if long.
- « Mise à l'échelle »: a photo of both target types side by side (zone 5's floor, 2024-08-02, frame GX046201.0366,
  found from the targets Metashape detected in zone 5's project).
- « Effet de banane »: Christian's two views of the 300-foot test on the canal's south wall (dive 27), curled up, then
  corrected.
- Addresses rule (docs/system-design.md): lowercase whole words, hyphens, no articles or small linking words
  (`a-propos` kept as a fixed expression). Renamed: `journal-plongees` (dive log and its test page), `mise-echelle`,
  `decoupage-site` (and its map images), `alignement-photos`, `extraction-photos`, `generation-modeles`,
  `nuage-points-dense`, English `tests/reference-colours-depth`. `public/_redirects` rebuilt: every former address
  straight to the current one (78 redirects with the English ones; checked under Wrangler).
- « Mise à l'échelle » / “Scaling” (`/collecte/mise-echelle`): the coded targets (7,5 and 15 cm) and how their ring
  encodes each target's number, the scales, the link to « Suivi »; the photos of both types, the targets' making and
  the Metashape steps « à compléter » by Christian. « Alignement de chunks » links to it.
- « Alignement de chunks » written (it was empty), French and English: each zone's model comes out slightly
  distorted, targets set each one's scale, the distortion not yet solved (link to « Effet de banane »).
- Page names (docs/system-design.md, « Page names »): addresses, titles and menu labels made to agree. Folders
  `questions/` → `problemes/`, `workflow/` → `traitement/` (English `processing/`); « Le fort courant dans le canal »
  → `fort-courant-canal` (`strong-current-canal`), « Effet de banane » (was « bananne », address too), « Nuage de
  points dense » (`dense-point-cloud`), « Génération des modèles » (`building-models`), « Matériel utilisé » / “Gear
  used”, `aligning-chunks`, `tests/couleurs-reference-profondeur`. Every former address redirects for good (301,
  `public/_redirects`; checked under Wrangler).
- « Problèmes rencontrés » has an index page (`/problemes`, English `/en/problems`): each problem in a line with its
  link; the home page's third card leads there (it opened the empty « Alignement de chunks »).
- Notebook pages on wide screens (over about 1,580 px): the content slid under the navigation since the cascade
  layers; the centring rule now sits outside the layers, as Starlight's own rule does.
- Design brief: « Page names », one name per page for its address, its title (`<h1>` and `<title>`) and its menu label.
- Underwater view: the water's surface 60 ft above the lock floor, as on the rest of the site (it was 55 ft): the dive
  computer reads about 55.7 ft at eye height on the floor (50.7 before), and the surface, light and depth follow.
- The lock's depth is one constant, `src/data/site.js` (60 ft; the metres computed from it), read by the pages and by
  the 3D viewer (its water surface and dive computer).
- Usability audit (TODO #44, 2026-10-26): three simulated first-time visitors (diver, heritage enthusiast,
  photogrammetrist), a Nielsen heuristics review and an information-architecture audit, by agents in a browser, then a
  verification pass: 38 findings (3 major, 13 minor), in `docs/audits/usability-2026-10-26.md`; the work in TODO
  #82–#85. Three skills for such audits in `.claude/skills/` (mastepanoski/claude-skills, MIT).
- Underwater view: dragging with the left button no longer inverts the vertical axis (Christian, 2026-10-26), as in
  the standard view.
- Underwater view: the particles' 15 % trim on the current removed (Christian, 2026-10-26): they drift at the season's
  factor times the measured current (35 ft/min): × 1.5 in winter, × 9 in spring (8 until 2026-10-26), × 6 in summer, × 4 in autumn.
- French typography (Christian, 2026-10-26): the standard non-breaking spaces in every French text (pages, interface
  messages, the tour): before « : », inside « », a narrow one before « ; ? ! », between a number and its unit and in
  thousands. Applied and checked by `tools/text-check/french-spaces.mjs` (`--fix`); the rule, the OQLF reference and
  the agreed terms in the `natural-writing` skill (`.claude/skills/`), adapted from blader/humanizer with French
  examples. The sidebar's « Workflow » is now « Le traitement » (English “Processing”).
- Inner padding (Christian, 2026-10-26): a rule in `docs/system-design.md` (a drawn box keeps 8 px between its edge
  and its content at the sides, 4 px above and below; inline boxes 3 px) and its check,
  `tools/design-check/inner-padding.mjs` (every page, both themes, desktop and phone). Fixed: the /modele navigation
  table's first column against its outline (TODO #79), the QR codes' white frames (6 → 8 px).
- /modele: « (jusqu'à 16 384 px) » removed from the model's description; the full model's download says the model
  grows with each new zone (« revenez chercher la dernière version »).
- Accessibility audit (TODO #43; axe-core, WCAG 2.2 AA, every page in both themes on desktop and phone, plus keyboard,
  reflow and text spacing) and its fixes: the /modele navigation table's headings readable in the light theme, and its
  first column named for screen readers; the download buttons' format at full contrast; the phone's « Sur cette page »
  bar readable in the light theme; tables that scroll sideways reachable with the keyboard (`ScrollTables.astro`); the
  opt-out button's text in the page before its script runs; heading levels of the banana-effect and ambient-light
  pages. The viewer: its content in a `<main>` landmark, the tooltip's role only while shown, the settings panel
  taking the focus as it opens and giving it back as it closes.
- Interface texts in Paraglide JS (TODO #77): the components' and the 3D viewer's French and English texts moved from
  hand-made dictionaries to message files (`messages/site/`, `messages/viewer/`, one JSON per language), compiled at
  build time into one plain JS function per message. The site renders them into its pages (no JavaScript added); the
  viewer bundles only the messages it uses (about 3 KB more). The opt-out button now gets its texts from the page.
- /modele: under the downloads, a short line linking to the model already placed in Google Earth Web (a project
  shared by Christian), nothing to download.
- CSS cascade layers on the site (docs/system-design.md, CSS layers): `starlight`, then `l21.tokens`, `l21.base`,
  `l21.layout`, `l21.components`, `l21.utilities`, declared first in `tokens.scss`; every component's `<style>` in its
  layer. Starlight's few unlayered rules are overridden outside the layers (the splash pages' content width). Two
  pages changed by it, as intended: the dive log's Notes column takes the remaining width, and the /modele tables'
  columns are equal (the component's rules now win over the global table rule).
- The project's CSS variables renamed `--lk-…` → `--l21-…` (and the class `lk-menu-overlay`), one prefix for everything
  of ours (custom elements, layers, storage keys); the built CSS the same apart from the prefix.
- No colour written in a rule (docs/system-design.md): the site and the viewer's colours as MD3 roles and tokens
  (state-layer opacities, shadow and scrim, elevation level 1, the viewer's container roles), state layers as the
  content colour at the state's opacity; the « 3D model » pill's stray blue state layer now its own content colour; the
  viewer's filled buttons' hover darker (their content colour over them, as MD3) instead of lighter.
- Styles nested (Christian, 2026-10-26): plain CSS with native nesting in the components and the viewer (SCSS only
  where Sass is needed), rewritten by a tool that checked the compiled CSS unchanged; in `.astro` files only the same
  element's states (Astro leaves a nested descendant unscoped). Both builds flatten the nesting for browsers before
  2023 (`build.cssTarget`); the site's and the viewer's built CSS identical before and after. The rules, and the
  planned `l21.*` cascade layers, in `docs/system-design.md`.
- Every icon of the site and the 3D viewer in Material Symbols' Rounded style (TODO #74), now referenced by name from
  the library instead of drawings pasted in (Christian: « what if the library is updated? »): Iconify's Material
  Symbols set (`@iconify-json/material-symbols`), through astro-icon in the site and unplugin-icons in the viewer
  (`viewer/src/icons.js`, `index.html`'s `<svg data-icon>` placeholders); an update is `npm update` and a rebuild. The
  « 3D model » pill's own cube replaced by « deployed_code ».
- 3D viewer, underwater: the dive light twice as strong on the surfaces and creatures it lights (its beam in the
  water unchanged).
- TODO #55 removed (light shards on the floor in the start view): checked on 2026-10-26, the start view uses 722 of
  the desktop's 1000 MB and its floor shows no shards (the lighter tiles of 2026-10-23 and 24).
- 3D viewer: the bump map's default at 0.45 (1.1 cm at full contrast; was 0.55).
- 3D viewer: the flight to a double-clicked or double-tapped point slower (2 s, was 0.7 s), stopping 3.5 m from it (was
  2.5 m).
- 3D viewer, guided tour: step 5's camera above the chart terrain (it was under it), its flight in level (no rise and
  fall); step 6's view lower, looking up at the gates (Christian), its flight level too; steps 5 to 6 in one flight, no stop
  (step 6 a view reached through its old start); steps 7 to 8 about 1 m over the ground all the way, looking at zone 18's centre (not its top), 25 % faster.
- 3D viewer, phone held sideways: the compass on the screen's left edge with the tour's card; the season slider's touch
  target 48 dp high, 8 dp clear of the buttons' targets (MD3).
- 3D viewer, phone held sideways, diving: the season's slider above the buttons on the right, leaving room for the
  tour's card on the left.
- 3D viewer, phones: the season slider shows the season's name only, without its visibility, to save room.
- 3D viewer: no tooltips on phones and tablets (no hover pointer), not even on focus.
- 3D viewer, guided tour: back and next as MD3 icon buttons, both round (back filled tonal, next filled; arrows, a
  check mark on the last step; their names as label and tooltip).
- 3D viewer, guided tour on a phone held sideways: a wider, shorter card in two columns (the text on the left, close,
  back and next on the right), squeezed to the left of the buttons at the bottom right (their row measured, diving
  included) rather than above them.
- 3D viewer, phones: pinching back to its full strength (the wheel's gentler zoom had slowed it too).
- The menu button (☰) in the dark theme as in the light one: no disc behind it, the icon in the bar's light text colour.
- /modele: « Navigating » shorter (Christian, 2026-10-26: too much text, too little space): a table of the visitor's own
  gestures (the mouse and keys on a computer, the fingers on a phone or tablet; each mouse gesture with a small mouse
  showing the part used in orange), one row per move key with its letter
  and its arrow as key caps, then the
  viewer's buttons by their own icons with a few words (not full screen nor settings); the long underwater
  explanation dropped.
- /modele: the Google Earth Web steps behind an MD3 text button (a Rounded « expand_more » icon that turns over, state
  layers, 48 dp target), unfolding and folding with MD3 motion (400 ms in, 200 ms out; none with reduced motion).
- /modele: the licence's and credits' missing spaces put back (« CC BY 4.0: free… », « Crayfish » by ucdavisterc, CC BY
  4.0), and English quotation marks on the English page.
- 3D viewer: the wheel's zoom stronger (0.25 of OrbitControls' default; 0.075, then 0.15, too slow).
- /modele: brief steps to place the full model (GLB) in Google Earth Web, which reads no position in a GLB: its
  Placement and Rotation fields as it names them in each language, with the values to type (latitude, longitude,
  altitude 4 m relative to ground, heading 150: the KMZ's -30 turned half round, Google Earth Web taking the GLB's
  other forward axis; a decimal comma in French, as Google Earth shows it).
- Augmented reality: the models rebuilt with zone 7 as now published (both at 1:100 and full size; `AR_VERSION`
  2026-10-26, so phones fetch them again).
- `check_model.mjs` checks a model's size on the site's scale (the 1:100 augmented reality model was « too small »).
- TODO #25 removed (the zones' wetness in the manifest: no wet look any more).

## 0.16.0 - 2026-10-25

- 3D viewer, underwater: many more particles in spring (800 per m³, was 300; up to 250,000 drawn, 40 % of that on a
  phone).
- 3D viewer, underwater: the particles follow the river's flow around the lock (Christian, 2026-10-25): a field
  computed once (`tools/flow/`: the site voxelized at 60 cm from the downloadable model and the mockups of the zones
  not yet surveyed, an ideal flow from the west solved around it, a turbulence index in the obstacles' wake), in
  `viewer/public/flow/` (555 kB, loaded when the view first goes underwater). Each particle is born, follows the field
  for 6 s in nearly straight lines (bending around the walls, faster through the gaps, slower in their lee, a
  little swirl in the wake), fading in and out; outside the field, the even current as before.
- 3D viewer, underwater: the fish's body and tail wave 20 % slower (their swimming speed unchanged).

## 0.15.1 - 2026-10-25

- The site's Google Earth file (`public/downloads/lock-21.kmz`) rebuilt: its description with links to the site and the
  model page.
- Google Earth: a new arrival view (Christian): 44.996898, -74.899692, 132 m, heading -89°, tilt 48°.
- 3D viewer: panning (right button) at a quarter of the pointer's pace (too strong).
- 3D viewer: the wheel's zoom much gentler (0.075 of its former speed: it was far too strong).
- 3D viewer, standard view: the left button's vertical axis back as it was (the background follows the pointer up and
  down); diving keeps it inverted.
- `tools/publish-model/check_model.mjs`: checks a downloadable model before it goes online (one UV set per object, a
  readable texture on every textured material, triangles and size plausible, copyright and licence); in the
  downloads' steps (docs/processing-the-blend-file.md, step 6).
- The context's export (`export_context.py`) applies the objects' modifiers before keeping only the baked UV map: the
  chart terrain's Boolean added its cutter's UV map, and the export carried two, the first all zero (no texture in
  Google Earth, which reads only the first).
- Google Earth: the model raised just enough for its lowest point to meet the ground (`make_kmz.py -a/--altitude`,
  auto by default): the chart terrain's channel, about 4 m below the lock's floor, went under Google Earth's ground.
- Google Earth: the KML descriptions in HTML, the site (lock21.info) and the model page (lock21.info/modele) as links.
- Google Earth: the Macdonnel Island mark (first named « Lock 21 Scuba Park ») pinned on the model's terrain (its height in the .blend plus the model's
  altitude), not on Google Earth's ground under it.
- Google Earth: a new arrival view (Christian), farther out to show the chart terrain: 44.997063, -74.899483, 485 m,
  heading -15°, tilt 28°.
- Google Earth: the folders of parts open in « Places » (the model's own folder closed at first) and each part numbered (« Zone 3 (3/19) »): Google Earth shows no
  progress for models, only each part's spinning icon while it downloads.

## 0.15.0 - 2026-10-25

- 3D viewer: a fine relief drawn from the photo (Christian, 2026-10-25: the wooden floor lacked roughness): the
  photogrammetry's mesh, and the relief baked from it, are smooth where the wood's grain and the planks' seams are only
  in the photo; its brightness taken as a height (2.4 cm at full contrast) tilts the zones' normals (bump mapping).
  Settings « Bump map » (`?bump=0..5`, 0.55 by default: 1.3 cm; Christian, 2026-10-25).
- 3D viewer: no more wet look (`?wet=`, its setting « Aspect mouillé »): barely seen, it made the surfaces read
  smoother, cost the heaviest material, and the site is under water.
- 3D viewer: the crayfish dances (Christian, 2026-10-25, after Family Guy's dancing lobster): in its threat posture,
  once the diver has kept still for 8 to 12 s, about one time in 3.5 (one draw each time the diver stops before it),
  it stands up on its rear legs, plays the « Iraq lobster » GIF, then
  sits back down; moving ends it. The GIF measured frame by frame (46 frames at 10 per second: the keypoints of every
  joint read off a grid, `tools/creatures/dance-keypoints.json`), the crayfish's skeleton fitted to them seen from the
  front (`tools/creatures/fit_dance.mjs`: every segment within 10° of the GIF's, most within 1 to 4°), into
  `viewer/src/crawfish-dance.json`: the claws (arm, elbow, wrist, pincer), the rear legs (hip, knee, ankle; the
  body on the lower foot), the small legs fanned and limp, the tail always behind it, the antennae whipping. The
  joints down a chain now turn about the crayfish's frame as their parent is posed (about the rest axes, a knee or
  the tail's end swept a cone instead of the plane facing the diver). `?dance=1` (debug; also in the settings'
  advanced section, « Écrevisse qui danse »): it dances all through its threat posture.
- 3D viewer: panning (right button) drags the point pressed with the pointer, at its depth: it crept, the orbit's
  centre often a metre ahead.
- 3D viewer: the left button's vertical axis inverted, in both views (the orbit around the point pressed, and diving,
  looking around and the orbit around the pivot: up and down turn the other way).
- 3D viewer: the dive light's beam as the Light & Motion Sola Dive 1200's: a 12° hotspot in a 60° spill 5 times weaker
  (was 16° and 40°, 3 times weaker).
- 3D viewer, the curious bass: turning the head toward it (to light it) no longer sends it off nor, with ?bass=1,
  makes it vanish; it is gone only once out of sight (out of the view or beyond the visibility), never in plain view.
  Its flight faster: 3.3 m/s once lined up (was 2.2), and 60 % of that while it turns away (was 30 %), so about three
  times its former speed in the turn.
- 3D viewer, underwater: the dive light at 5000 K (#ffe4ce; it was a 3800 K warm white, #ffcc9c), the warm end of
  dive lights (5000–6500 K; the Light & Motion Sola 1200, its model, 6000–6500 K).
- A terrain from the Boating app's chart of the lock's surroundings (TODO #73, `tools/chart-terrain/`): the depth
  contours and soundings turned into a 550 × 302 m height grid, in the publishing .blend (collection `chart terrain`,
  the riprap material, green above the water), against the zones without gaps and never above the model.
- 3D viewer in the site's fonts and colours (TODO #39): Archivo for text and titles, JetBrains Mono for labels and
  data (self-hosted, @fontsource), the site's dark tokens for its colours.
- Google Earth: the model at 700,000 triangles (was 600,000: it still opens in Google Earth Pro); the downloads rebuilt
  with the zones republished on 2026-10-25.
- Home page: hovering a card shades all of it (a light rectangle stayed in its middle).
- Home page: the « L'histoire » card (no history page planned; it led to the zone map) replaced by « Les problèmes »,
  leading to the problems encountered.
- 3D viewer: a pan no longer makes the camera jump forward (it used to come in front of any surface between it and the
  point it turns around; the soft floor now keeps it above the model).
- 3D viewer, the guided tour: a step in the address at load (`#tour-3`) starts the tour at that step, the camera
  straight at its view (no flight); step 4 is one flight, without the stop at the gate passage's mouth.
- 3D viewer, the camera's limits, in both views (TODO #71): up to 30 m past the terrain to the west, north, east and
  south; no higher than 245 m (zooming out stops there, the view keeps its angle); never under the model: a soft floor,
  0.2 m above the surface below (0.6 m underwater), that a pan or a quick move can't cross, and never below the
  model's lowest point.
- 3D viewer, in the /modele page: nothing done in the viewer scrolls the page any more (TODO #70): the wheel while
  the orbit is off (the guided tour, swimming), the middle button's autoscroll, the scrolling keys (Page Down, Space...),
  and the page's context menu after a right-button drag released outside the viewer.
- 3D viewer, the settings: saturation 1.3 by default (was 1.2); no underwater section (the diver's button and its strip
  hold the season and the lamp, no longer remembered between visits); the mesh view moved from the advanced settings to
  the model's.
- 3D viewer: a compass at the top left, its card (N, E, S, W) turning with the view, the red tip toward magnetic north on the day
  of the visit (the declination from NOAA's IGRF 2025: -12.87° in 2026, +0.08° a year).
- Google Earth: the model turned to -30° (was 0°), after Nick Baets' north arrow on the zone map, taken as true north;
  the landing view turned with it.
- The site's coordinates moved to 44°59.814′ N, 74°53.983′ W (44.996900, −74.899721; was 44°59.809′ N, 74°53.997′ W):
  the header, the Google Earth model and the GLB's metadata.
- 3D viewer: a home button (between full screen and the diver's button) jumps straight back to the start view;
  it stops the guided tour if it is on, and in dive mode the swim goes on from there.
- 3D viewer: a new start view (Christian, 2026-10-25), at `cam=-19.06,4.02,-16.60,-20.06,3.96,-16.63`.

## 0.14.0 - 2026-10-24

- 3D model online (R2): zones 1, 4, 10, 11, 12 and 13 republished with Christian's new boolean cuts (zone 13's
  `boolean.019` now applied: its Show in Render was off), zone 3 with its changed modifiers, all with their relief;
  zone 16 at 15,000 triangles per m² (the gate door's planks and frame finer: 467,000 triangles, within 0.3 mm of the
  source); the context with the resurfaced terrain (the hillside by the north wall's west stairs at the steps'
  height, the ledge at their foot and the ridge east of them lowered); the mockups from the reworked .blend.
- Publishing: a zone may have its own density (`tools/publish-model/zone-density.json`, used by `publish_zones.ps1`
  without `-Density`; zone 16: 15,000).
- 3D viewer, the guided tour: Back goes straight and quickly to the step before (up to 12 m/s and 6 m/s², the line of
  sight turning twice as fast), no longer replaying that step's way in; the camera's place follows the planned one as a
  critically damped spring and the motions keep their own clock (no jump after a slow frame, no hard braking when Next
  interrupts a motion: it brakes at 1 m/s² first); flights take as long as 6 m/s and 2 m/s² allow; the step in the
  address (`#tour-3`), replaced at each step, gone on free movement, kept through a reload.
- 3D viewer, the tour's camera moves naturally (Christian, 2026-10-24: no turn may go from a speed to zero at once):
  its line of sight follows the one wanted as a critically damped spring, at most 0.8 rad/s and 1.5 rad/s² (a bell-shaped
  speed, as a natural head turn: Flash and Hogan's minimum jerk; a game camera's SmoothDamp); a way with paces is
  driven from rest to rest at limited acceleration, its speeds smoothed into an S-curve; turns glide between lines of
  sight, not between the points looked at (which overshot).
- 3D viewer, turning with the left button around the point pressed (Christian, 2026-10-24; viewer/src/pointer-orbit.js):
  the camera and its orbit's centre turn around the model's point under the pointer, which stays where it is on the
  screen; a pixel dragged turns by the angle a pixel covers, so the background moves with the pointer; Ctrl or Shift
  with the left button still pans. Diving, a double-click makes a point the one the drag turns around (the head turns
  to face it; a movement key forgets it). The pick skips hidden objects (the mockups of the zones online) and is never
  left short by another use of its ray. The /modele page's navigation help says so, and lists the guided tour.
- 3D viewer, a guided tour (TODO #48, Christian, 2026-10-24): « Visite guidée », first in the bottom-right row, plays
  eight steps, each with a card (its number, title and text; back, next, close; Esc). A view: the camera flies there,
  then the usual navigation. A move: it travels along its points at its pace (through a gate passage, up to the
  gates). Flights rise above the walls on long ways and arrive along the step's line of sight; a step may give its
  own approach (down to the floor east of the spillway before the gate door), turn toward its point first, or pause
  before a move. Every way checked against all surfaces (tiles, context, mockups). `?tour=1` starts it. Hidden
  underwater; the movement keys hidden while it plays.
- 3D viewer, tiles: the library's requests for another pass (needs-update: a tile's children prepared a few at a
  time) now redraw; unheard, the tiles waited for the camera to move. The less-detail-far-away factor softened
  (half its effect at about 17 m, was 8 m: zone 18 stayed coarse 13 m away).
- 3D viewer, zone 18 shown again from afar (Christian, 2026-10-24): the less-detail-far-away falloff subtracted from
  each tile's error, which reached 0 for zone 18's first tile 118 m away, and its root (refine ADD) then drew nothing.
  The error is now multiplied by a factor (down to a third far away), never 0. At the four views checked for 0.13.0,
  0.46 to 0.75 GB.
- 3D viewer, the navigation bounds are the whole terrain (Christian, 2026-10-24): the zones' bounds plus 10 m stopped
  the camera at zone 18 going west; now the context's extent (x from -115 to 100 m), the zones with their margin
  included.
## 0.13.0 - 2026-10-24

- 3D viewer, memory on a computer (Christian, 2026-10-24: most visitors' graphics cards have far less memory): tiles
  budget 1 GB (was 1.2); lean loading, only the tiles in view (not their siblings nor their coarser ancestors as a
  fallback; a part of the view newly turned to stays empty a moment instead of coarse; phones keep the fallback);
  less detail far away (the library's error falloff: the finest level was asked for up to about 25 m); normal maps at
  1024 px (at 2048 they outweighed the tiles' photos). At four reported views, 0.54 to 0.88 GB, nothing refused and
  nothing coarse within 6 m (they needed 1.3 to 1.75 GB before); the browser's own memory 0.12 to 0.16 GB (was 0.77).
- 3D viewer, the mesh view: tiles loaded but not shown when it was turned on kept their texture when they came back
  into view (Christian, 2026-10-24).
- 3D model online (R2): zones 16 (2026-10-24-0839) and 2 (2026-10-24-1107: its Boolean.004 cut changed in the .blend)
  republished, with their light sets; the mockups from the latest .blend (2026-10-24-1049).
- 3D viewer, the finest detail loads again up close (TODO #69): the library shows a tile's finer children only once
  all of them are in, and since the relief each finest tile carried a 4096 px normal map (22 of its 34 MB); the 1.2 GB
  budget ran out first (zone 3: 6 of a wall's 7 children loaded, the wall still coarse). As each tile arrives, its
  normal map is kept at 2048 px and a coarse level's photo at 2048 px (larger mipmap levels dropped): a finest tile
  about 17 MB. At the reported view, 43 finest tiles shown instead of 7, in the same budget.
- Site, English pages at English addresses (TODO #63): /en/data-collection/dive-log, /en/model, /en/about,
  /en/problems/banana-effect... instead of their French paths. The files keep the French path (Starlight pairs the
  translations by it: language menu, hreflang, sidebar; tools/i18n too); `src/data/englishPaths.js` gives each its
  English address, applied after the build by `src/integrations/english-paths.mjs` (pages moved, links rewritten,
  search index rebuilt); the former addresses redirected (`_redirects`, 301); the dev server the same (pages served
  at their English addresses with their links rewritten, the former addresses redirected).
- Site menu: « Modèle 3D » first, before « À propos » (Christian, 2026-10-24).
- 3D viewer, underwater: the creatures lit by the daylight as the surfaces around them (Christian, 2026-10-24): the
  bass's glTF had no metallic factor (1 by default, a metal), so it took no diffuse light from the environment and was
  dark outside the beam; creature materials are now not metallic.
- 3D viewer, the curious bass: turning the head never scares it, only swimming does (Christian, 2026-10-24: turning
  the light toward it sent it off, and its visit started over); a quick turn and the start of a drag counted as
  sudden moves.
- 3D viewer, underwater: the creatures (bass, crayfish) lit only by the dive light's beam, as the walls: the wider cone
  they had (up to 25° from its axis at 60 % of the hotspot) lit a fish beside the beam (Christian, 2026-10-24).
- 3D model, texture resolution (TODO #9): measured on the zones as published (`measure_prepared.py`), 0.91 to 1.74 mm
  per texel; the closest viewing distance is set at 2 m, where every zone meets a screen pixel. No retexturing.
- 3D viewer, within the site (TODO #66): in both views and whatever the navigation, the camera stays within the
  zones' bounds plus 10 m; leaving them, it is brought back to their edge, the orbit's point with it. Underwater it
  already stays below the surface.
- 3D viewer, the bass in real colours (Christian, 2026-10-24): golden brown, bronze, olive green or dark brown, drawn
  for each fish and for the curious bass on each visit (a multiplier of the model's light tan texture), darker in clear
  water and paler in murky water as the species (WDFW, Tackleshare); one GPU program for all (the colour a uniform:
  `prepareCreatureMaterial(…, { tint: true })`).
- 3D viewer, the background fish more natural (Christian, 2026-10-24): at rest about half the time (two times in three
  at a waypoint or when placed, 5 to 15 s, hovering, the heading drifting), and level: their height set once per
  stretch and reached at 3 cm/s (they bobbed with every bump of the floor), faster only over a floor coming near.
- 3D viewer, the diver's hand light 20 % smaller (Christian, 2026-10-24), still seated on the back of the hand.
- 3D viewer, underwater: the diver never goes under the floor (Christian, 2026-10-24): a ray up from the camera that
  meets a floor seen from below brings it back 60 cm above it, the orbit's point with it (orbiting or panning have no
  collisions, and a gap between tiles or tiles not yet loaded let it through).
- 3D viewer, the diver's dive computer a Shearwater Perdix 3 (TODO #65, shearwater.com pictures): 81 × 71 mm, its thick
  body, the strap bars across its ends, the bezel scalloped around its 8 screws, the black glass; light (about a
  thousand triangles, no texture in the file). Its screen live, drawn by the viewer (`viewer/src/dive-computer.js`)
  in the Perdix's « Big » layout, once a second: the depth (the camera's below the surface, ft) with the ascent
  chevrons, NDL on air for that depth less the time spent, with the nitrogen bar, TIME since entering the water, T1
  (an 80 cu ft tank emptied with depth), 21 % AIR, MAX, the compass, the battery (78 %). Turned toward the eye,
  centred on the forearm as seen from the eye and along it (both measured on the sleeve itself), at 72 % of its real size
  (Christian, 2026-10-24). The whole arm smooth-shaded (edges sharper than 40° kept).
- 3D viewer, the diver's arm lighter (TODO #64): its geometry compressed with meshopt and simplified to 60 % where the
  error stays under 0.1 % (`pack_creature.mjs -m -s`), and the hand light without what the diver's eye never sees
  (Christian, 2026-10-24: its front, reflector, LED cups, glass; the bezel at 96 segments instead of 288;
  `make_dive_light.py --front` builds it whole): 638 KB and 19,000 triangles → 98 KB and 8,900, no visible change;
  it had no textures. The hand light's own model (an input of the arm) leaves `viewer/public/` for
  `tools/diver/` (it was copied to the site for nothing).
- 3D viewer, underwater: a few fish here and there (`viewer/src/fishes.js`; 4 on a computer, 2 on a phone): the
  bass's model shared, each fish going its own way to waypoints clear of the walls, calm, swerving away from the diver;
  placed only where the diver may see them (in the view, nothing in between, where the water still hides them, so they
  come out of the haze), placed again once out of reach or out of the view for 10 s; never through the model (the water
  ahead checked as it swims). Loaded after the first view, once underwater. Near the bottom, as bass keep to structure
  (Christian, 2026-10-24: not in open water): each keeps its own height above the floor below it (25 to 70 cm),
  placed, at its waypoints and as it swims; placed 8 to 15 m away at most (near the floor, farther spots were hidden
  from the camera).
- 3D viewer, the bass model lightened: 40,000 → 6,000 triangles (`tools/creatures/rig_bass.py --faces`), 2 MB → 0.6 MB.
- 3D viewer, bass lengths as in Ontario's waters (25 to 50 cm for an adult, ontario.ca): drawn around 36 cm, for the
  fish and for the curious bass on each visit (it was 40 cm).
- 3D viewer, the bass leaving (Christian, 2026-10-24: its turn away didn't look natural): it swims where its body
  points, along an arc while it turns, slow facing away and faster as it lines up with its way out (it pivoted on the
  spot, then slid there in a straight line); fleeing, a C-start: the turn snaps in, the body bends into a C, then
  the dash. The turn runs down its body (each spine bone 60 ms behind the one before: the head leads, the tail follows
  its line; the whole body bent at once), and each bone's whole bend is capped, 0.2 rad at the head to 0.6 at the
  tail (the swimming wave and the turn added up to 1.25 rad at the tail). It faces the diver at a slightly different
  angle on each visit (up to 0.3 rad to either side, drawn when it arrives, held for the visit).
- About page (TODO #58): at `/a-propos` (`/en/a-propos` for now: English addresses are TODO #63), the former `/about`
  and `/en/about` redirected; a « Mes autres projets » section: Lock 23 3D (lock23.ca), Thousand Islands Shipwrecks,
  Open Caves (opencaves.org, without www).
- Docs (TODO #62): `docs/project-organization.md` says what the AI (Claude) does and doesn't in the project: Christian
  dives, films, runs Metashape, works the .blend and writes the French pages; Claude writes the code, runs the
  publishing steps (going online only with his OK), translates, keeps the guides, tests; what it never does. The
  processing guide points to it.
- 3D viewer, underwater: an empty area could show in the distance (Christian, 2026-10-24): the tiles beyond the
  visibility were no longer drawn, but the context behind them was, its haze a little darker than the water column.
  The whole view now stops at 1.2 times the visibility (tiles, context, mockups), and the water column fits inside it;
  the distant silhouettes go too.
- 3D viewer: the help that opens by itself on entering the water was the keys' help (« Navigation ») instead of the
  swimming one (since 0.12.0).
- 3D viewer, the movement keys' card (TODO #61): its W A S D are buttons, held with the mouse or a finger they move
  the camera as the keys do (lit while held; several at once); 40 px keycaps in 48 px touch targets, each with its
  name (« Avancer », « Reculer », « À gauche », « À droite »).
- 3D viewer, the bass (TODO #60): its swim in and its turn toward the diver are one movement: it slows over its last
  30 cm (to 15 % of its speed) and starts turning over its last 35 cm, its aim shifting from its path to the diver;
  it used to stop, then turn.
- 3D viewer, standard view: looking up (it couldn't: the camera stayed above the height of the point it turns
  around). The camera may now go below that point, up to 171° from straight above it; a surface between them (the
  floor, a wall) brings it in front of that surface, so it never looks from under the floor.
- 3D viewer, the mockups (Christian, 2026-10-24): their look from the .blend, the 1988 drawing (Nick Baets, via Save
  Ontario Shipwrecks) or its version without text through each mockup's colour ramps, computed by `export_mockups.py`
  as Blender does (one 2,048 px WebP image per image-and-ramps chain); zones 5, 6, 14 and 15 a uniform purple paper
  (the drawing's paper grain, tinted #b7a3d6). The author's address and phone numbers are covered with the paper's
  colour in both scans, his name kept for the credit. Lit as the context. They were the south wall's texture tinted
  purple, projected by the viewer.
- 3D model, zone 16 republished: moved in the .blend (it sat under its mockup in the viewer).
- About page (TODO #57): the site's version at the bottom, in its own section, « Version », with its date and a link
  to the release notes (`SiteVersion.astro`, read from package.json and CHANGELOG.md at build time); the page becomes
  `about.mdx`, in French and English.
- Buttons MD3 everywhere on /modele (TODO #59), measured on a computer and a phone: the header's magnifier (32 or 40 px,
  square corners) and ☰ (32 px) are 40 px rounds in 48 px touch targets, « Modèle 3D » has its 48 px target; the
  downloads are MD3 filled buttons (40 px, full corners, were 48 px with 12 px corners) with Material Symbols icons
  and pressed and focus state layers; in the viewer, the keys' « ? » (32 px) is 40 in 48 with a 24 px icon, the
  settings' close button a Material Symbols « close » (was a « × » character, 36 px), « Réinitialiser » an MD3
  outlined button (was a wide rectangle), « Compris » and « Réessayer » have 48 px targets. Form fields (theme and
  language selects, the settings' selects) are not buttons and were left as they are.

## 0.12.1 - 2026-10-24

- 3D viewer, the light tiles: a phone or tablet that reports at least 8 GB of memory and 8 cores on a fast connection
  (Chrome's class « 4g », no data saver) gets the full set (Christian's Pixel 10 Pro handled it well); every iPhone and
  iPad, which report neither, the light one. A « Textures » setting (⚙, « Modèle »: automatique, légères,
  complètes; `?textures=`) to choose; the visit's report says which set it got (`tile-set`).

## 0.12.0 - 2026-10-24

- 3D model, phones and tablets (an old iPad and an iPhone 14 waited one to two minutes): a light set of tiles per
  zone, the same tiling with textures halved and no relief maps (`tile_zone.ps1`, made after each version, or alone
  with `-Light` for a version already online; `halve_texture.mjs`; `light` in the manifest). The finest tiles go from
  about 1.4 MB to 260 KB (zone 12), the whole model from 1.34 GB to 232 MB; a phone's first load from 136 to 49 MB.
  The viewer takes it on phones and tablets. `upload_r2.mjs` sends both sets; the clean-ups keep both.
- 3D model, coarse levels standardized: their textures capped at 2,048 px (1,024 in the light set) by dropping their
  largest mip levels, without a new encoding (`cap_coarse_textures.mjs`, in `tile_zone.ps1`). The coarsest tile
  followed the size of the zone's photo, 1,004 to 4,096 px (0.4 to 3.6 MB); in the light set now 0.26 to 0.66 MB.
  The light set's halved photo is a multiple of 32 px (zone 7's coarsest came to 798 px, not a multiple of 4).
- 3D viewer, loading order: every zone's coarsest tiles first, 6 downloads at a time on phones (25 before), the texture
  decoder fetched at once, the crayfish after the first view, the bass and the diver's arm only once underwater; the
  first view waits only for tiles in view. At 5 Mbit/s, the decoder came at 20 s and nothing showed for 20 to 40 s;
  now the decoder at 5 s, the first tiles at 9 s.
- 3D viewer, underwater: the tiles beyond the visibility (1.2 times, about 5 m in spring) are neither loaded nor drawn
  (they had the water's colour anyway): 111 MB instead of 134 on a phone, in spring.

- 3D viewer, loading (an iPad Air stayed on « Chargement » with no word why): the card now says what is going on.
  After 20 s, that it takes longer than usual (with the pieces received); no piece in for 20 s, or 5 failed: that
  loading is stalled or failing, with a « Réessayer » button (MD3 text button); when nothing could load, the error
  instead of an empty view. After Safari reloaded the page for lack of memory, a lighter model (150 MB of tiles,
  coarser detail, pixel ratio 1), and the card says why.
- 3D viewer, memory: each tile's downloaded file is no longer kept once the tile is in (the tiles library kept the
  whole glTF result, its parser holding the file), and the textures' data goes once on the GPU (the model loads again
  after a lost WebGL context). In Chrome, the data held drops from 470 to 233 MB on the phone profile.
- 3D viewer, telemetry: a progress report every 10 s while loading (tiles, queue, errors, canvas), the notes shown,
  « Réessayer »; at most 5 tile errors sent per visit (all counted), and the visit's end always sent (39 tile errors
  had used up the quota of an iPad visit).
- 3D viewer, telemetry on textures: whether WebAssembly works (the decoders run on it; Lockdown Mode turns it off), the
  texture formats the GPU takes, the first texture's decoding time, and a report when one takes over 10 s or fails.
- Site and viewer: the `hidden` attribute always hides (one global rule, no rule per element).

- 3D viewer, outside the water too: the movement keys (W A S D, or the arrows; Shift faster) move the camera
  forward, back and sideways, with the orbit's centre, so the mouse's orbit carries on from there; faster the farther
  the camera is from that centre (the swimming speed, 1.2 m/s, times the distance over 4 m), and never through the
  model. The keys' legend (bottom left, on a computer) shows outside the water too, with its own line (« avancer · Maj:
  plus vite ») and help (« ? »); underwater, the swimming ones. The /modele page's navigation help says so.
- 3D viewer, the bass: once in a while only. The camera still for 10 to 30 s (drawn at random again at each move),
  then 30 s to 2 min before its next visit, and not before 45 s after the viewer opens; it watches the diver 8 to 15 s
  (was: 6 s still, every 30 s, 8 to 20 s).
- 3D viewer, the bass: it tolerates movement most of the time. It keeps watching the diver, turning to follow them, and
  flees only from a sudden move (faster than 2.5 m/s, as when swimming with Shift, or a turn faster than 3 rad/s), the
  camera nearer than 40 cm, or, 15 % of the time, when the camera sets off; out of view for 2 s, or three times as far
  as when it came, it loses interest and swims off calmly, away from the diver, where its way is clear.

## 0.11.0 - 2026-10-23

- 3D viewer, the bass: its swimming wave's pace and size follow how fast it actually goes (its turns included): slow
  and small hovering, quicker and wider swimming, fastest in its dash, twice as wide as the first try; its body much more supple in turns.
- 3D viewer, the bass: it turns as a fish does, its turn easing in and out, its body curving into a supple C (the body
  lagging behind the head) and gliding forward a little, instead of pivoting evenly; it comes closer (1 m, was 1.4).
- 3D viewer, underwater, the bass: its path must be seen from the camera (a spot far from every surface could be inside
  the masonry: it came, but hidden), and it tries both sides, closer distances (1, 0.7, 0.5 m) and higher paths (from
  just below eye level to 45 cm above: a camera near the floor) before giving up.
- 3D viewer: the mockups of the zones not yet online opaque, with the south wall's texture (projected in world space)
  tinted purple.
- 3D viewer: a reload keeps the camera where it was, even right after a move (kept in the tab's session storage at
  every move; the address follows only 300 ms later); arriving from another page still starts from the link's view.
- 3D publishing: `lock-21-publishing.blend` cleaned up (unused data purged), 2.79 -> 1.14 GB, under Git LFS's 2 GB
  limit (TODO #38); boolean.023 enlarged: zone 2's sliver in front of zone 3's pillar gone (republished).
- 3D viewer, underwater: the haze that closes in when looking up only in murky water (full at 14 ft of visibility,
  none from 30 ft): in autumn and winter the tops of the walls show again.
- 3D viewer, underwater, winter: the particles drift 1.5 times the river's current (was 2).
- 3D viewer: the library's « tiles versions at 1.1 or higher have limited support » warning (12 per visit) silenced;
  our tiles use none of the features it lacks.
- 3D viewer, underwater: the dive light dimmer, twice by 25 % (surfaces and its glow in the water).
- 3D viewer, swim mode: the diver stops 60 cm from any surface, the floor included (was 40 cm).
- 3D viewer, underwater: the dive light reaches the creatures (crayfish, bass) in a wider cone than the surfaces (up to
  25° from its axis at 60 % of the hotspot, none past 55°): a crayfish at the diver's feet, below the beam aimed at the
  view's centre, was a dark silhouette.
- 3D viewer, underwater (TODO #56): a curious smallmouth bass. When the camera stays still for 6 s, it comes slowly from
  one side of the view, swims about a sixth of its width, stops and turns to look at the diver; a move of the camera
  sends it off at once, a quick turn and a dash, gone in about 2 s (at most once every 30 s, only where its path
  stays clear of the walls).
  « Smallmouth bass » by faerbogdan99 (Sketchfab, CC BY 4.0, credited on the /modele page); `viewer/src/bass.js`.
- 3D viewer, the bass: rigged (a spine of five bones, `tools/creatures/rig_bass.py`, packed by
  `tools/publish-model/pack_creature.mjs`), it swims by a slow wave down its spine; it gets bored after 8 to 20 s and
  swims off calmly; its pace follows the water's temperature (winter 40 % of summer's: it saves its energy). Debug:
  `?bass=1` shows it at once and all the time.

## 0.10.0 - 2026-10-23

- 3D viewer, loading (TODO #55): the tiles' coarser levels without normal maps (relief only at the finest level;
  `merge_normal_maps.mjs`, and `strip_coarse_normals.mjs` for the published versions): their download 337 -> 157 MB.
  Phones: no relief at all (TODO #22), a 300 MB budget (was 450) and less fine detail (errorTarget 16, was 12), for old
  iPhones that ran out of memory. Measured on an emulated phone at 9 Mb/s: the first image in 46 s (39 MB), all
  loaded in 66 s (64 MB), against 130 to 150 s (100 to 119 MB) before.
- 3D viewer, loading indicator in two phases: the « Chargement » card (indeterminate bar, no percentage) until the
  first view is drawn, then a thin bar along the top edge with « Affinage des détails » while the detail arrives;
  telemetry: a `first-view` event. The « ← Écluse 21 » link no longer flashes in the /modele frame while it loads.
- 3D viewer, underwater: the dive light dimmer again, twice by 20 % (surfaces and its glow in the water).
- Header, every page: the menu button (☰) drawn in bold 3 px bars that turn into an X and back (MD3 motion, as on
  /modele before); in the light theme, no disc or shadow, the icon in the bar's text colour as the magnifier; the
  magnifier bolder too.
- Header, every page on wide screens: the search as a 24 px magnifier at the bar's right, before « Modèle 3D » (as on
  /modele), instead of the box in the middle; Ctrl+K still opens it. Phones unchanged.
- Navigation: the current page always shown (its group unfolded, the others closed at page load, the list scrolled
  to it when out of view, also when the menu opens on phones and on /modele); MD3 hover state layer on the items and
  the groups' titles (150 ms).
- « Modèle 3D » pill: the navigation's 3D cube instead of the ▶.
- /modele page, wide screens: the header's content 6rem wider than the viewer's frame on each side (not edge to edge),
  the search as a 24 px magnifier at its right, before « Modèle 3D ». The menu opens against the frame, 2rem from it,
  with the depth gauge along its left edge, as on the other pages; without room left of the frame, it opens from the
  window's left edge over the frame, with MD3's level 1 elevation. MD3 motion: unrolled in 400 ms (emphasized
  decelerate), rolled back in 200 ms (emphasized accelerate); the menu button's bars turn into an X and back.
- Navigation, every page: « Modèle 3D » marked with an orange 3D cube (the signal colour).
- /modele page: the site's menu on wide screens too, from the ☰ button (left of the logo on wide screens, at the bar's
  right on phones), as a panel over the page's left side (on phones, on the right, over the 3D display) (a click outside or Esc closes it); the viewer keeps its full width.
- Site: a thanks page (« Remerciements », in the sidebar after « À propos »): the dive buddies, DECOSTOP Outdoor Centre
  and its owner Dan Foster for the sponsorship (its logo, one per theme), Sylvain Marcotte for the rig, Nick Baets and
  Save Ontario Shipwrecks for the 1988 drawings (TODO #53).
- 3D publishing: the modifiers published are those enabled for render (Show in Render), even when hidden in the
  viewport (a slow boolean hidden to keep Blender fluid is still applied); the eye decided before, and zone 3's
  Boolean.024, hidden, had been left out. The change check follows, so zones with such modifiers show as changed.
- 3D viewer, underwater: the dive light's glow in the water fades in over the first metres from the lamp (0.5 to 2.5 m):
  no bright disc around the lamp's head any more.
- 3D viewer, underwater: the sun on the surfaces only as far as it gets through the water above, the rest as diffuse
  light from the sky (no sun patches or caustics in murky water); looking up, the haze closes in (down to 40 % of the
  visibility straight up), so the banks' walls fade into the light from above; spring's visibility 14 ft (was 12).
- 3D viewer, underwater: the mockups of the zones not yet online are opaque (the water hides them with the distance,
  like the zones); in the air they stay translucent ghosts.
- 3D viewer, underwater: looking up, the sun's disc and glare only as far as its light gets through the water above
  (in murky water a few visibilities down, none: a dim, diffuse glow); the particles drift 15 % slower.
- 3D viewer, underwater: the dive light's beam 40° across in all (was 48°, then 32°), its hotspot unchanged (16°).
- 3D viewer, underwater: the dive light 15 % dimmer, on the surfaces and its beam in the water.
- 3D viewer, underwater: until a season is chosen, the season is today's (December to February winter, March to May
  spring, June to August summer, September to November autumn); it was summer.
- 3D viewer: a new start view (`START_VIEW`, chosen by Christian), about a metre from the point it looks at.
- 3D viewer: on a computer the tiles' textures (ETC1S) go to the graphics card as BC1 instead of BC7, half the memory
  for the same look (TODO #55): at the start view twice as many tiles of the finest level fit in the budget.
- 3D viewer: a mesh view (settings, Advanced, « Maillage », or `?mesh=1`; not remembered between visits): the zones and
  the context as a solid, flat-shaded surface with its triangles' edges drawn over it.
- 3D viewer on the /modele page: its settings are kept when the page reloads, and forgotten when a visitor arrives from
  another page (a link, the address bar, back and forward): the viewer then starts from its defaults (`?reset=1`).
- 3D viewer: the relief's normal maps only on the finest level of the tiles, dropped from the coarser levels as they
  load (TODO #55): at the start view they held about 550 MB of the 1.2 GB budget, which kept the finest level from
  loading and left light flakes on the floor.
- 3D viewer on phones (TODO #54, `viewer/src/touch-nav.js`): over the viewer, one finger turns the model and two fingers
  pan it and pinch to zoom, toward the fingers; the page scrolls from outside the viewer. Within a metre of the orbit's
  centre the centre moves ahead, so zooming in never stalls (the wheel too). A double-tap (a double-click) flies to
  that point. The gestures' card shows at the first touch, and a « ? » button shows it again. Where a frame can't go
  full screen (iPhone), the full-screen button opens the viewer on its own page. The /modele page's « Naviguer » list
  follows.
- /modele page: the « Naviguer » list rewritten, about the 3D model only (sharing a view through the page's address
  left out), mouse and fingers apart, with full screen on an iPhone, the underwater view, the help button and
  augmented reality; more space above and below each download button (16 px).

## 0.9.1 - 2026-10-23

- 3D viewer: the desktop memory budget for tiles back to 1.2 GB: at 2 GB (0.9.0) the browser ran out of memory
  ("Array buffer allocation failed"), and tiles and textures failed to load.
- 3D viewer, underwater on narrow screens (phones, the /modele page's frame): the season pill in the bottom-left corner
  beside the buttons' row, on two lines (its value above the slider), the lamp button above it.
- 3D viewer: the season strip keeps its size while the slider moves (the four values stacked in one place, the
  longest sets the size); a value wraps only after the « · ».
- 3D viewer: on a narrow frame (phones: the /modele page's square frame, the tall full screen), the start view steps back
  along its line of sight to show as much across as on a computer (at most 2.2 times as far; TODO #49).
- 3D viewer: the underwater view is no longer remembered between visits (each visit starts in the air; a link's
  `?underwater=1` still opens it). Its season and lamp are still remembered.
- 3D viewer, underwater, spring: the particles drift 8 times the river's current (was 10), and the visibility is 12 ft
  (3.7 m, was 10 ft).

## 0.9.0 - 2026-10-23

- 3D model: zones 2, 3, 4, 11, 12 and 13 republished after their cuts and, for zones 3, 4, 12 and 13, their placement
  changed in the `.blend`, with their relief (normal maps) baked again; the context (terrain, walls, fillers)
  republished too. Downloads rebuilt: Google Earth KMZ, full GLB, and the AR models (`AR_VERSION` 2026-10-23).
- 3D viewer: the desktop memory budget for tiles raised from 1.2 to 2 GB (phones unchanged, 450 MB): with the relief's
  normal maps, the default view no longer fitted, and when the tiles came fast from the CDN's cache, its floor stayed on
  coarse levels (light flakes over the detail).
- Docs: the front-end guidelines moved from `GUIDELINES.md` to `docs/guidelines.md`, beside the design brief.
- 3D viewer: the crayfish's threat posture: its tail held up in an arc of a circle; both arms together, drifting slowly
  and, now and then, a gesture (random length and size): they open out and rise, the pincers opening wide a moment
  later, on a timing of their own, apart from the crayfish's shuffles and turns; gestures snap out with a slight overshoot, hold and ease back, and the posture eases in and out
  (a damped spring). The viewer's timers use `THREE.Timer` (`THREE.Clock` is deprecated).
- 3D viewer: underwater with the dive light on, the diver's arm holds it at the bottom right of the view: a black
  neoprene sleeve and glove (the hand a little closed), a dive computer on the wrist, and the light strapped on the back
  of the hand, modelled after a Light & Motion Sola 1200 (fluted head, knurled blue bezel, LEDs in their cups behind
  glass, slide switch, strap and buckle). The beam starts at the drawn light. Drawn over the view (never into a wall),
  it lags a little behind the camera's turns and sways gently from the shoulder, the beam following the light's aim
  (`viewer/src/diver-arm.js`; built by
  `tools/diver/make_dive_light.py` and `make_diver_arm.py` into `viewer/public/diver/`). The arm's shape: « First
  Person hands rigged » by DavidFischer (Sketchfab, CC BY 4.0, credited on the /modele page).
- 3D viewer: the crayfish's claws keep the model's own colours (the blue tint removed; orange pincer tips kept), and
  its antennae bend downstream with the river's current (hardly fluttering), more in a stronger current (underwater: the season's drift).
- 3D viewer: a crayfish at the `.blend`'s « crawfish » empty (exported with the mockups): « Crayfish » by ucdavisterc
  (Sketchfab, CC BY 4.0, credited on the /modele page), rigged, packed in `viewer/public/creatures/crayfish.glb`, its
  pincer tips orange, after a blue land crayfish (`viewer/src/crawfish.js`). It faces a diver closer than 1.8 m (and turns again 2 s after they
  have moved round it) and takes its threat posture by 0.8 m: front raised, claws raised, spread and open; now and then
  both arms open out wider together, and it shuffles a few centimetres, still facing the diver. Left alone, it often
  walks a few centimetres (5 to 15), within 60 cm of its place, only on its zone's floor (a ray down: same zone, flat).
- 3D viewer: the mockups of the zones not yet digitised as translucent ghosts (TODO #6): exported from the `.blend`'s
  `mockups` collection (`tools/publish-model/export_mockups.py`, `mockups` in the manifest); a zone's ghost disappears
  once the zone is online. Today zones 5, 6, 9, 14, 15, 19 and 20.
- 3D viewer, underwater: the daylight more absorbed at depth (35 % of its strength above water, was half).
- 3D viewer, underwater: the dive light brings back more reds (a warmer light, its colours more saturated).
- 3D viewer, underwater: the keys pad bottom left continues the season strip's sweep out of the 🤿 button (MD3 motion).
- 3D viewer, underwater: particles only where they can be seen: a box ahead of the camera, as deep as the visibility
  (3 to 10 m), with a density per m³ by season; drawn counts winter 25,000, spring 35,000, summer 56,000, autumn
  94,000 instead of up to 200,000 in a cube around the camera.
- 3D viewer, underwater: dramatically more particles, and faster, the murkier the water: they drift 2 times the
  measured current in winter, 4 in autumn, 6 in summer, 10 in spring.
- 3D viewer, underwater: the particles flow around the model instead of through it (a distance field around the
  camera, 32³ cells, built a few milliseconds per frame; on the GPU a particle in a surface's skin is pushed out along
  it). Swim mode: a help dialog (MD3) the first time, then from a « ? » in the keys bottom left.
- 3D viewer, swim mode: the diver can't go through the model (a 40 cm body; each move stops short of the surfaces
  and slides along them; rays on bounding volume hierarchies, three-mesh-bvh, `viewer/src/collide.js`).
- 3D viewer, underwater on a computer: swim mode instead of orbiting (`viewer/src/swim.js`). W, A, S, D (or the
  arrows) move where you look, Shift faster; dragging turns the head. Keys by position (Z, Q, S, D on AZERTY), drawn
  bottom left with the keyboard's own letters, lit while held. Leaving the underwater view brings the orbit back,
  around a point ahead of the diver.
- 3D viewer, underwater: no light band over everything above eye level: the water keeps one colour around the
  horizon and brightens only when looking well up (in the background and in the haze).
- 3D viewer, underwater: the dive light reveals more colour (its beam keeps the forward-scattered light: only a third
  of the scattering dims it; the colours it lights a little more saturated).
- 3D viewer, underwater: the water surface overhead fades out beyond the visibility like the model (from the floor
  in murky water its ripples showed as light bands).
- 3D viewer, underwater: the dive light fades with its distance from the lamp (the water's whole attenuation per
  colour, scattering included): on surfaces, in its glow in the water and on the particles it lights.
- 3D viewer, underwater: no more noise toward the water surface (its ripples and caustics fade out where finer than
  a pixel) and no banding in the water's gradients (dithered).
- 3D viewer, underwater: the dive light has a hotspot (8°) and a spill 3 times wider and weaker; it brings the reds
  back (its light absorbed only from the lamp, the daylight dimmed to half at depth); more particles the murkier the
  season (winter 10,000, autumn 25,000, summer 35,000, spring 60,000).
- 3D viewer, underwater: the view's address (and the /modele page's) carries `&underwater=1&season=` (`&lamp=0`), so
  a copied link reopens the same view. Colours absorbed by distance, red first: daylight from the surface down (half
  the shift shown, the eye adapts), the dive light only from the lamp, so it brings red back up close; the lamp at the
  bottom right of the view, aimed at its middle, its beam visible in the water and in the particles it lights. The
  camera stays above the height of the point it turns around (never under the floor).
- 3D viewer: « Ambiance sous-marine » (TODO #46, from the first attempt #31): the 🤿 button beside full screen, or the
  settings' « Sous l'eau » section. The water column as background, the sun refracted at the surface, caustics, the
  surface seen from below, many small particles drifting with the current (shown 3 times faster than measured). The
  usual lighting stays: the surfaces are seen as they are up close, then fade into the water column's own colour and
  are gone at the season's visibility (no ambient occlusion meanwhile: it redrew the erased lock). A dive light at the
  camera, a 15° beam centred in the view, its glow in the water computed along the line of sight (it only adds light).
  Beside the 🤿 button, a strip that unrolls out of it (MD3 motion): the « Saison » slider (winter 100 ft, spring 10,
  summer 20 by default, autumn 30; visibility and water colour) and the dive light's button; both also in the settings
  (`viewer/src/underwater.js`).
- 3D viewer: MD3 tooltips on its buttons (`<l21-tooltip>`, `viewer/src/tooltip.js`) instead of the browser's own,
  in the page's language; also shown on keyboard focus.
- 3D viewer: gloss by surface (roughness from the relief map: smooth planks glossier, mussels matte) tried and set
  aside: stone, wood and silt reflect about 4 % of light at a direct view, so even a mirror finish hardly showed; the
  wet look's clear coat already gives the sheen.
- 3D viewer: its interface follows the page's language (French or English): loading, buttons, settings and
  augmented reality texts (`viewer/src/i18n.js`).
- 3D viewer: « Rendu photo » (path tracing with three-gpu-pathtracer, computers only) tried and set aside: bounced
  light and soft shadows, but no visible gain in realism, which the source data limits (lighting already in the
  photos, mesh noise). Kept on the branch `feature/photo-render`, not merged.
- 3D viewer settings: « Éclairage (ciel et soleil) » is out of the panel, the lighting is always on (a link can
  still show the raw textures with `?hdri=0`, for tests); the lighting settings are always shown.
- 3D viewer settings: scrolling in the panel no longer scrolls the page around the viewer once the list ends.
- 3D viewer: « Contraste » slider in the settings (0.5 to 2, default 1): the lit surfaces' colours stretched around a
  mid-grey, hue kept.
- Claude Code added to the software used (gear page, French and English; pipeline README).
- 3D viewer: wet look back to 0.15 by default.
- 3D viewer settings: « Ombres du soleil » is out of the panel; the default stays (on computers, off on phones),
  and a link can still set it (`?shadows=`).
- 3D viewer: AgX tone mapping by default again (exposure 1.2), with saturation 1.2 to make up for its greying (1.5
  matched the unlit textures' saturation on zone 3); Khronos neutral stays under Avancé.
- 3D viewer settings: « Occlusion ambiante » (and « Occlusion seule ») and « Ciel en arrière-plan » are out of the
  panel; their defaults stay (occlusion on computers, sky background on), and a link can still set them.
- 3D viewer: the sky that lights the scene also tilts so that its photo's sun (48° up) stands exactly at our sun's
  height, not only its azimuth (tilt up to 25°); the background sky only turns about the vertical.
- 3D viewer: the sun by default from the southwest (320), 65° up; the sun
  direction sliders move by 1°.
- 3D viewer: cascaded sun shadows (three.js CSM, three 2048 px maps following the camera, up to 300 m): sharp up
  close instead of one 4096 px map over the whole site (about 4 cm per texel).
- De-lighting of the lamp bands (TODO #24, `delight_texture.py`): tried on zones 3 and 10 with stronger settings and
  set aside; almost no visible difference, Metashape's blending of many photos already evens out the lamps' large-scale
  light.
- 3D viewer: `?compare=<tiles url>` (tests): an « Avant | Après » segmented button (key B) swaps the tiles between
  the usual ones and those of that address, from the same view; for judging the de-lighting (TODO #24).

## 0.8.0 - 2026-10-22

- Zone 16 online (a spillway gate door on the floor south of the chamber, 69 tiles, 17 MB with its relief); zone 4
  republished (its cutting changed), with the context.
- Context: the walls' vertical faces were black in the viewer. Their UV map (the plan projected from above) gave them no
  room in the baked texture; `export_context.py` now bakes such objects into their own unwrapped UV map, colour only
  (the viewer lights them).
- 3D viewer: new start view (`START_VIEW`), close to the lock floor, chosen by Christian on 2026-10-22.
- The site's last TypeScript (`src/lib/*.ts`, `src/data/site.ts`, `src/content.config.ts`, types in `.astro` files)
  converted to plain JavaScript, types kept as JSDoc annotations: no TypeScript in the project.
- Home page: « Dernière zone » is the zone added last, not the zone republished last (a retouched zone took its
  place); the manifest now records each zone's first publication (`added`, `update_manifest.py`).
- Tested on an iPhone (2026-10-22, iOS 18.7, Safari, Apple GPU, textures up to 16,384 px), through the telemetry: the
  3D model loads in the `/modele` page in about 14 s (2 s on a second visit), no error, no lost WebGL context.
- 3D viewer settings: the colour settings (« Neutralisation de la teinte », « Retrait du vert », « Retrait du cyan »)
  are removed from the panel; their defaults stay (0.2, 0.8, 1.5), and a link can still set them.
- 3D viewer: the sun casts shadows (« Ombres du soleil », on by default on computers), tone mapping Khronos neutral
  (keeps the textures' hues and saturation; AgX greyed them) with an « Exposition » slider (default 1.2; wet look lowered to 0.1), the method
  under Avancé (Khronos neutral, AgX, ACES, none).
- 3D viewer lighting: the sky and the sun together, each with its slider (« Force du ciel », « Force du soleil »,
  plus the sun's direction), realistic defaults (sun 1, sky 0.35, sun from the east-south-east at 65°, « Saturation » slider at 0.8); the sky turns with the sun so that
  the sky photo's own sun stands where ours is (one sun, shadows and glints from the same side); the former sun test
  (`?relief=sun`, `?shade=`) is removed.
- Pointer cursor on every action widget, on the site and in the 3D viewer (a global rule without specificity in
  `custom.scss` and `viewer/src/style.css`; `not-allowed` when disabled).
- Android AR: the AR model downloads in the background once the 3D view has finished loading (about 30 MB,
  kept in memory), so a tap on AR only waits for its preparation.
- AR models: their origin is a point on the lock chamber floor (`make_model.py --origin`, 4 m west of the
  `ar-origin` Empty, at the floor's height, 0.84 m above the reference level), so the floor no longer rises when the
  lock is enlarged in AR. Zone 3's texture is baked anew onto the simplified mesh with an xatlas UV layout
  (`make_model.py --rebake`, `xatlas_uv.py`): simplified 1:20, its texture was scrambled. Baked in two passes (faces
  flipped for the second), so faces turned inwards no longer stay black. During AR the 3D view
  releases its tiles (the AR image froze at times).
- `npm run downloads:upload` compares each file with R2's MD5 (ETag), not only its size: a rebuilt file of the same
  size is sent. The viewer asks for the AR files with a version (`AR_VERSION`), so a rebuild shows at once.
- 3D viewer buttons (settings, augmented reality, full screen) and the AR close button: MD3 filled tonal icon
  buttons (40 dp in a 48 dp touch target, Material Symbols icons, state layers, focus ring). AR size slider drawn by
  the page (follows the finger in AR, in any orientation); touches on the AR controls no longer move the model.
- `SYSTEM-DESIGN.md` moved to `docs/system-design.md`, with a rule: buttons are always MD3-compliant.
- Augmented reality on Android: AR inside Chrome (WebXR, `viewer/src/android-ar.js`, the viewer's three.js). One tap
  opens the camera, the model loads meanwhile, a ring follows the floor or a table and a tap places the lock, its canal floor
  on the surface; a « Taille » slider goes from 1:100 (on a table) to 1:1 (real size, walls about 35 ft high), the lock
  growing from that point without moving. Scene Viewer, which no longer opened on a Pixel
  10 Pro for any model or page, stays the fallback where Chrome has no WebXR AR. AR steps are logged (`ar-status`);
  the `/modele` frame allows WebXR (`xr-spatial-tracking`).
- 3D viewer: the green removal no longer leaves a blue-cyan tint (green capped at the blue turned water-green pixels
  cyan): the cyan left over is removed too, with its own slider « Retrait du cyan » (`?cyan=0..2`, default 1.5: a
  warm grey).
- Terrain (`lock-21-publishing.blend`, not online yet): the north bank east of zone 7 starts under its stairs and has a
  straight foot (y 26.5 in the height field), crest unchanged; around the zones the ground meets each zone's edge
  height, so the floor beside the lock chamber (zones 2 to 4) is level with theirs (it stood 0.3 to 0.5 m higher).
- 3D viewer: new defaults, tint neutralisation 0.2 (was 0.3), green removal 0.8 (was 1) and the sky as background
  (`?sky=0` for the plain backdrop); the tiles' source and the relief are no longer in the settings panel (`?tiles=` and
  `?relief=` still work in a link, for tests; values saved earlier for them are ignored).

## 0.7.0 - 2026-10-22

- Speed (PageSpeed, mobile): Google Analytics loads on the first interaction or 4 s after the page; the fonts at the
  top of the pages are preloaded; a fallback font with Archivo's proportions (Arial, adjusted) removes the home
  panel's layout shift.
- 3D viewer telemetry, for every visit: device, load time, errors, WebGL context lost, a visit that never closed
  (Safari's reload on low memory), AR launches. Sent to `/api/log` (the Worker), kept in Cloudflare's Workers Logs;
  a random session code at the bottom of the settings panel finds one visit. Described on the privacy page.
- New colours, « Moss » (olive), in place of the navy: bars, pages, links, logo, favicon, the zone diagram and the 3D
  viewer's buttons and plain background (`src/styles/tokens.scss`, SYSTEM-DESIGN.md).
- 3D viewer: a visit without `?cam=` starts from a chosen view (`START_VIEW` in `viewer/src/main.js`) instead of a
  view computed from the model's bounds.
- Header: on wide screens the logo starts further left, above the depth gauge's labels.
- Theme and language selects moved to the footer bar, out of the header and the mobile menu.
- What the site is for: an « À propos » / « About » page (`/about`, first in the navigation) and a short block on
  the home page (show the lock to non-divers, help divers plan their dives, document the method).
- Hosting moved from GitHub Pages to Cloudflare (Workers static assets, `wrangler.jsonc`, custom domain `lock21.info`):
  the deploy workflow sends the site there with Wrangler, and a manual run on a branch other than `main` gives a preview
  address (`<branch>-lock21-info.lock21.workers.dev`). `public/CNAME` and the `gh-pages` branch are gone.
  Built files with hashed names (`/_astro/`, the viewer's assets) are cached for a year (`public/_headers`).
- Page addresses without a final slash (`/modele`, `/collecte/materiel-utilise`, the viewer at `/modele/viewer`): a
  page is a resource, not a folder. The two home pages are collections and keep it: `/` and `/en/`. The old addresses
  with a slash redirect to the new ones. Links, canonical addresses, the sitemap and search results follow.
- Wide screens: the "Modèle 3D" button no longer shows at the top of the navigation column (it is in the header).
- Home page render: no more light patch at the bottom right (slanted sunlight slipped past the surface's edge into
  the water volume).

## 0.6.0 - 2026-10-21

- Translation tracking: `npm run i18n:status` (`tools/i18n/status.mjs`) lists the English pages to create, update or
  rename after French changes; `tools/i18n/translations.json` records the French version each was translated from.
- Home page render: sunlight rays through the water (a thin scattering volume and a rippled surface casting the
  shafts), and its link opens the viewer at the same point of view (`/modele/?cam=…`).
- **English version of the site** (`/en/`): every page translated (docs, tests, privacy), the home page, the model
  page, the header, footer, depth gauges (ft), the opt-out button and the sidebar labels in English; the home page's
  dive log excerpts from the English log (`src/lib/i18n.ts`, `src/lib/diveLog.ts`).
- Home page: a new render of zone 12, seen from the west (the sluice gates side) at 10 ft above the floor, warmer
  colours, in the frame's proportions (it showed the back of the zone).
- Home page: the depth gauge as high as the window below the bar (marks spread from the surface to the bottom), and
  it stays in view while scrolling, like the navigation's ruler on the other pages.
- No consent banner anymore: Google Analytics measures every visit, with its cookies. A visitor can refuse (or accept
  again) with the button on `/confidentialite/` (`<l21-analytics-optout>`), which also deletes the GA cookies; those
  who refused in the former banner stay unmeasured. The footer's "Témoins" button is gone; the privacy page rewritten.
- Mobile: the "Modèle 3D" button at the top of the menu (it was at the bottom, next to the theme), and the menu
  (☰) on the home page and `/modele/` too: the bar is the same on every page. Wide screens unchanged.
- **New terrain online** (context): the canal floor at 60 ft, the north bank in two pitches (2 : 1 then 1 1/2 : 1,
  crest about 28 ft as the scans show), the south bank at 2 1/2 : 1 down to the river bed at 70 ft, earth banks past
  the south wall's ends, the floor flat in front of the walls and the ground just under the zones (zone 8's stairs
  climb the bank). Texture: seamless tiles cut from the scans (zone 1's silt and zebra mussels; riprap on the slopes
  from zone 18's crib fill), baked at 4096 px (about 2 in per pixel). The south and north lock walls published with
  it; the drawn base map and banks no longer.
- Relief online for zones 1, 4, 8, 10, 13, 18 (the bakes of 4, 13 and 18 had crashed on a GPU shared with another
  Blender); zones 1, 8 and 10 republished (cutting volumes). Downloads and AR rebuilt with the new context.
- The context (`blend_state.py`, `bake_context_in_blender.py`) never takes the `terrain - drawings` collection (the
  pieces drawn from the plans), even objects named "filler". New terrain in the `terrain` collection (SOS data).
- Depth of the bottom: 60 ft (18.3 m) instead of 55 ft, as in the SOS Ottawa documents (lock floor, base of the
  approach cribs, 1989): home page depth gauge, model page, navigation gauge.
- Augmented reality: the fillers are back in both models (zones and fillers, still without the mockup terrain, walls
  and banks), with `make_model.py --context-objects "filler*"`.
- Registration (`register_zone.py`) tries the identity first: an export of the same Metashape chunk is already in
  place. Zone 18 had been fitted 0.8° off, and the 5 cm clean-up cut its walls; zones 1, 4, 7 and 13 were 1 to 1.5 cm
  off. Now 0 to 3.6 mm; the five zones republished.
- Prepared zones moved from `O:\temp\<zone>\prox\` to `O:\publishing\prepared\<zone>\` (`-PreparedRoot`,
  `--prepared-root`): the relief, the downloads and the AR models are made from them. `O:\temp\` can now be emptied
  at any time, except while a job runs.
- Google Earth: double-sided models (`make_kmz.py`, COLLADA `GOOGLEEARTH` extension); walls of zone 18 that face
  inward were hidden.

## 0.5.0 - 2026-10-21

- Zone 18 online (tiles, relief from its 26.6 M export, 16 384 px normal map), and in the downloads and AR models:
  11 zones. Zone 8 moved and a terrain piece added in the `.blend`: zones 2, 3, 8, 12 and 13 republished. Google
  Earth now in 21 parts.
- Guide `docs/project-organization.md` (French): folders, branches and versions, online services, where to look.
- Guide `docs/augmented-reality.md` (French): how AR works, rebuilding its files, testing on a phone.
- Audience measurement with Google Analytics 4, only after consent (Québec's Loi 25): a consent banner
  (`<l21-consent>`, refusing as easy as accepting, "Témoins" in the footer to change one's mind, cookies deleted on
  withdrawal), page views on client-side navigations, `file_download` (KMZ, GLB), `ar_launch` (table / real size), and
  the QR codes as campaigns (`utm_campaign=ra-table`, `ra-taille-reelle`). Off until the measurement ID is set in
  `src/data/site.ts`. New page `/confidentialite/`: what is measured and why, 14-month retention, contact info@lock21.info.
- Augmented reality: a button in the 3D viewer, on phones and tablets only, puts the surveyed zones (without the
  mockup terrain) on a table at 1:100 (about 70 cm), or at real size with `?ar=full`: AR Quick Look on iPhone and iPad
  (USDZ), Scene Viewer on Android (GLB). No library. Models built by `make_model.py -x 0.01 --usdz` and `-x 1`
  (400 000 triangles), copyright in the files.
- `/modele/`: a "Réalité augmentée" section under the downloads. On a computer, two QR codes (made at build time,
  `qrcode`) open the page on a phone: on a table (1:100) or at real size (70 m, `?ar=full`, read by the viewer); on a
  phone, the same two choices as links.
- Every public model file carries the copyright (© 2024–2026 Christian Rémillard, CC BY 4.0): the GLB in glTF's
  `asset.copyright`, with the origin's coordinates (44.996817° N, 74.89995° W) and orientation in `asset.extras`
  (`glb_metadata.py`); the KMZ, its list, each part and each COLLADA model. `/modele/`: the "Posé au sol" sentence
  removed.
- Guide `docs/processing-the-blend-file.md` (French): the steps after a change to the `.blend`, from the check to the
  live model, the downloads and the site.
- Guide `docs/installation.md` (French): preparing a computer for the project, by kind of work.
- 3D viewer loading indicator (`<l21-loading>`): "Chargement" with dots appearing one by one, the share of tiles
  loaded on an MD3 progress bar (never backwards), on a dark card readable over the terrain; it leaves (MD3 exit) once
  the first view is complete, not as soon as the roots are in.
- `/modele/`: "Licence" and "Téléchargements" are two sections, the licence under "Le modèle"; the two downloads as
  filled buttons in the signal colour (tertiary), with an icon (globe for Google Earth, arrow for the GLB); the KMZ link carries `download`, so the client-side router leaves it to the browser; missing
  space restored in "via Save Ontario Shipwrecks".
- Downloads on `/modele/`: a KMZ for Google Earth Pro, served by the site (`/downloads/lock-21.kmz`), that only links
  to its parts on R2 (600 000 triangles, one model per zone and piece of context), so zones added later show up
  without a new download; it opens on a landing view over the lock; and the whole
  model as a GLB (2 M triangles, 108 MB). Built by `tools/google-earth/`, uploaded by `upload_downloads.mjs`;
  the tiles upload no longer touches `downloads/`.
- The site opens to search engines: `noindex` removed from every page, `robots.txt` allows everything but the bare
  viewer (`/modele/viewer/`) and points to the sitemap.
- `/modele/`: the viewer frame is wider than the text column, up to 1600 px (or the window minus 24 px margins).
- Footer at the bottom of the window on short pages; its bar now reads `ÉCLUSE/21 · carnet de terrain` and
  `© 2024–2026 Christian Rémillard · Licence CC BY 4.0` (the Baets drawings stay credited in their captions).
- Client-side routing (Astro `ClientRouter`): pages change without a full reload, with an MD3 fade-through on the
  content; theme, sidebar scroll and search kept across pages; `/modele/` frame as `<l21-model-frame>`.
- Prefetch: every page on link hover (router default), the likely next steps as soon as they are on screen (home
  buttons and cards, "Modèle 3D", previous / next page), and the 3D viewer's files (about 3 MB) when a `/modele/` link
  is hovered, so the viewer starts at once. `astro preview` serves the built viewer again (it inherited the dev
  forwarding to the viewer's dev server).
- Zone 4 republished from its 36 M export (shape, photo and relief).
- Viewer settings kept by the browser between page loads (`localStorage`); a link's parameters override them,
  "Réinitialiser" clears them.
- Relief and wet look for every zone, online: normal maps baked from the high-res
  exports (zones 1, 4 and 10 from their 8.6 M, 36 M and 22.6 M exports), tiles rebuilt with them by the new
  `relief_zones.ps1`. The viewer lights them under the sky with their normal map and a wet clear coat (0.15 by
  default); walls seen from behind are turned towards the viewer. `?relief=sun` keeps the earlier sun test.
- `bake_relief.py`: Lattice support (zone 4), the high-res export placed at the zone's prepared position (a moved
  zone failed), cage sized on the kept surface (3 cm instead of up to 3.9 m).
- Development: the site's `/modele/` page forwards `/modele/viewer/` to the viewer's dev server (now at
  `localhost:3100/modele/viewer/`), so it shows the viewer's source and reloads with it.
- Viewer settings panel (⚙): one control per query parameter (detail, sky lighting, colours, ambient occlusion,
  advanced). Every setting applies live, sliders while they move: the page never reloads (a new tiles source
  reloads the model only, keeping the view). The address keeps only the camera (`?cam=`); other parameters in a
  link are still read, then removed from the address. `?error=` (level of detail: discrete levels, no visible
  effect from the overview) and `?balance=0` are removed; the colour balance is always on.
- Custom Elements prefixed `l21-` (`l21-image-zoom`, `l21-dev-breakpoints`, `l21-settings-panel`).
- Viewer lit by a partly cloudy sky (HDRI, Poly Haven, CC0) instead of the unlit display: volumes read better;
  `?hdri=0` compares, `?sky=1` shows the sky as background.
- `/modele/` page, Sketchfab-like: the viewer embedded in a large frame with a full-screen button, the camera
  shared through the page's address, model facts, navigation help, licence CC BY 4.0. The viewer moves to
  `/modele/viewer/`.
- Wide figures (`figure-wide`): the zone map shown at 80 % of the column, centred.
- Google Earth test (zone 12): light GLB for Google Earth Web and other 3D tools, KMZ (COLLADA) for Google Earth Pro,
  model on the ground at the lock's coordinates (`tools/google-earth/`).
- Deployment only on demand (Actions tab, Run workflow) or on a version tag; pushing `main` no longer deploys.
- Site design applied (SYSTEM-DESIGN.md: E2 look on the MD3 token system): Archivo and JetBrains Mono self-hosted, navy
  header and footer bars with the S4 logo, the ÉCLUSE/21 wordmark and the lock's coordinates, "Modèle 3D" pill;
  home page with depth gauge, instrument panel (dives, time underwater, zones online computed at build time),
  render, entry cards and journal excerpts; outlined tables, rounded figures; light and dark themes.

## 0.4.0 - 2026-10-19

- Site switched from Docusaurus to Astro + Starlight: same French pages and addresses, search (Pagefind), dive log
  total computed at build time, image zoom (native Custom Element), `noindex` kept; blog samples and the partial
  English translation dropped; deployment pushes `dist/` to `gh-pages` with plain git commands.
- Site name: Écluse 21 in French (Lock 21 in English). Layout: right column 20rem, content fills the space, the dive
  log fits the column (scrolls sideways on phones).
- Design brief (`SYSTEM-DESIGN.md`, E2 look on the Material Design 3 token system) and front-end guidelines (`GUIDELINES.md`);
  zone 13 online (12.5 M-face export, 16384 px texture).

## 0.3.0 - 2026-10-19

- Zones online: 1, 3, 4 (new 16384 px texture), 8, 10 and 11 republished; context (terrain, fillers) updated.

- Viewer: the address bar follows the camera (`?cam=`); key C copies the view.
- Viewer: trilinear filtering of tile textures (less shimmering); gloss blurred where the relief varies within a pixel.
- Relief test (zones 1 and 12): object-space normal maps baked from the high-res exports (`bake_relief.py`, `--high`),
  tiled in a second Obj2Tiles run and merged (`merge_normal_maps.mjs`); viewer `?relief=1`, `?light=`, `?shade=`,
  `?wet=` (default 0.15).
- De-lighting test: lamp bands evened out (`delight_texture.py`, `apply_shade.mjs`).

## 0.2.0 - 2026-10-19

- Viewer: colour balance between zones. Each zone's average texture colour goes in `manifest.json`; the
  viewer brings every zone to a common colour and removes 30 % of the water's yellow-green tint
  (`?neutral=0..1`, `?balance=0` to compare).
- Viewer: green removal per pixel (spill suppression: green capped at max(red, blue)), which clears the green
  patches a per-zone gain leaves (zone 4); `?despill=0..1`, default 1.
- Tiling: 4 levels of detail for long zones (longest horizontal side > 25 m: zones 7 and 8), 3 otherwise; the
  overview of the whole model drops from 24.6 to 19.3 MB.

## 0.1.0 - 2026-10-18

- 3D viewer of the lock at `lock21.info/modele/` (Vite, three.js, 3D Tiles), "Modèle 3D" menu entry: tiled model of
  zones 1, 2, 3, 4, 7, 8, 10, 11, 12 and site context (terrain and fillers, baked materials), ambient occlusion,
  anisotropic filtering, render on demand, phone profile, `?cam=` / `?stats=1` / `?ao=` parameters.
- Tiles hosted on Cloudflare R2 (`tiles.lock21.info`, not indexed), uploaded with `npm run model:upload`.
- Publishing pipeline in `tools/publish-model/`: the `.blend` is the source of truth (`source` property, registration,
  deform modifiers, proximity cleanup), change detection (`npm run model:post-modified`), Obj2Tiles tiling,
  coarse-level simplification, meshopt compression, KTX2 textures. All scripts answer `-h` / `--help`.
- Resolution analysis of the zone meshes (`tools/model-analysis/`).
- `TODO.md` working list.
## 0.0.3 - 2026-10-18

- Deployment works from GitHub Actions: it uses the workflow's own token instead of an SSH key that was never configured.
- `static/CNAME` (lock21.info) is published with every deployment, so the custom domain survives it.

## 0.0.2 - 2026-10-18

- The site is kept out of search engines: every page has `robots: noindex, nofollow` (Docusaurus `noIndex`).
- Deployment fixed (`npm run build` / `npm run deploy` instead of the invalid `npm build` / `npm deploy`).
- GPT translation workflows removed (failing since 2025); English translations are done by Claude on request.
- `AGENTS.md`: guidance for AI coding agents working in this repository.
- Missing favicon path fixed; translation preamble removed from the English dive log.

## 0.0.1

- Docusaurus site: field notebook of the Lock 21 photogrammetry project (zones, dive log, workflow, problems encountered).

# Changelog

Versions follow [semantic versioning](https://semver.org/) (major.minor.patch), below 1.0.0 while the site is not public.

## Unreleased

- 3D viewer: a compass at the top left, its card (N, E, S, W) turning with the view, the red tip toward magnetic north on the day
  of the visit (the declination from NOAA's IGRF 2025: -12.87° in 2026, +0.08° a year).
- Google Earth: the model turned to -30° (was 0°), after Nick Baets' north arrow on the zone map, taken as true north;
  the landing view turned with it.
- The site's coordinates moved to 44°59.814′ N, 74°53.983′ W (44.996900, −74.899721; was 44°59.809′ N, 74°53.997′ W):
  the header, the Google Earth model and the GLB's metadata.

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

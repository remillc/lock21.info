# lock21.info usability audit: verified findings

> Kept as the record of the audit of 2026-10-26 (TODO #82–#85). The screenshots it names were working files and
> were not kept; the published report (with a few of them) is a private page of Christian's on claude.ai.

**Verifier**: `verify` (AI agent). **Date**: 2026-10-26. **Build**: http://localhost:4323 (rebuilt after the evaluators ran, twice; see "Limits"). Production checked read-only with `curl -sI` for `/en` and `/en/` only.
**Inputs**: reports `diver.md`, `heritage.md`, `photogrammetrist.md`, `nielsen.md`, `ia.md`.
**My screenshots**: `C:\Users\chris\AppData\Local\Temp\claude\f--projets-lock21-info\621ec99a-e67d-4c7f-a693-e21ac12358c5\scratchpad\usability\shots\verify*\` (profiles `verify` … `verify6`; `verify6` was a fresh phone profile). Paths below are relative to `shots\`.

Reporter codes: **D** diver, **H** heritage, **P** photogrammetrist, **N** nielsen, **IA** information architecture.

## Summary

- **38 distinct findings** kept after merging about 75 evaluator items (plus 7 dropped).
- **By status**: confirmed 34 (V4, V16, V32, V34 have a confirmed observation and a hypothetical impact, labelled) · confirmed in phone emulation, to check on a real phone 2 (V2, V11) · hypothesis 1 (V30) · to check on a real device 1 (V31).
- **By my severity**: 3 → 3 findings · 2 → 13 · 1 → 20 · 0 → 1 · not rated 1.
- **By kind**: code/design 27 · content 8 · mixed 3.

**The 5 that matter most**
1. **V1 (3)**: the home page's third entry card, « Les problèmes », opens an empty page (« Alignement de chunks »), in FR and EN.
2. **V2 (3)**: on a phone, the guided tour in the framed viewer: a ~100 px card cut off at the top with its ✕ out of view, and « → » replaced by « ← » under the thumb, so a second tap goes back (verified `#tour-2` → `#tour-1`).
3. **V3 (3)**: the divers' door (« Plonger le site · Zones, profondeurs, courant du canal ») goes to a zone page with one depth (-35 ft) and no word on current; the current page reads as a scooter test.
4. **V5 (2)**: « Suivi du travail par zone » has 20 zones of 25, no "online" column, and zone 12 (the home page's render, online) shows only one ✓; it contradicts « 12 / 25 en ligne ».
5. **V6 (2)**: visible placeholders and gaps: « awef » on 3 pages (and EN twins), « ??? » for ISO min, « [TODO: …] », empty « Conclusions » on the banana-effect page, zones 17–25 empty headings.

**Raised by several evaluators independently (higher confidence)**: V2 (D, N), V3 (D, IA), V4 (H, IA), V5 (P, IA), V6 (P, IA, D), V8 (P, N, IA), V10 (H, N, P), V11 (D, N), V13 (N, IA), V19 (D, P, N, IA), V20 (H, N), V21 (D, H, N, IA), V22 (D, P, IA).

**What works well (agreed across reports, and I saw it)**: the home page explains project, depth and status in one screen (60 pi / 18,3 m, 47 plongées, 12/25 zones); one consistent sidebar with the current page open, « Sur cette page », prev/next; search is fast, finds « courant », « 1988 », « banane » first try and lands on the right heading; the model page's licence with a ready credit line, download sizes and purposes, Google Earth Web steps; the desktop viewer: labelled icon buttons, Escape closes help/settings/tour and returns focus, « Vue de départ », settings reset, `?cam=` and `#tour-n` shareable; the tour's texts are the site's best narrative; FR/EN pairing is complete and the language switch keeps the page (and camera); production serves `/en/` (200) and redirects `/en` there (301).

## All findings

| ID | Title | Where | Status | Sev | Effort | Kind | Reported by |
|---|---|---|---|---|---|---|---|
| V1 | Card « 03 Les problèmes » opens an empty page | `/` → `/questions/alignement-chunks` (FR+EN) | confirmed | 3 | S | code/design (+content) | IA, P |
| V2 | Phone: guided tour card unreadable, ✕ out of view, → / ← swap under the thumb, buttons over AR/dive | `/modele`, phone | confirmed in emulation; card sizing to check on a real phone | 3 | M | code/design | D, N |
| V3 | Divers' door doesn't deliver depths or current; current page framed as a rig test | `/` card 01, `/decoupage-du-site`, `/questions/canal` | confirmed | 3 | M (content) | content (+card target) | D, IA |
| V4 | No page on the lock's history (canal, dates, 1958) for heritage visitors | whole site | confirmed (absence); impact hypothesis | 2 | L (content) | content | H, IA |
| V5 | « Suivi » table contradicts « 12 / 25 en ligne »: 20 rows, no online column, stale rows | `/workflow/suivi`, `/`, `/modele` | confirmed | 2 | S–M | content | P, IA |
| V6 | Placeholders and empty sections shown to visitors | 6 pages + EN twins, `/decoupage-du-site` | confirmed | 2 | S (content) | content | P, IA, D |
| V7 | Search « Metashape » misses the Metashape procedure pages | search, `/workflow/*` | confirmed | 2 | S | content | P |
| V8 | Search UI in English on the French site | search dialog, FR | confirmed | 1 | S | code/design | P, N, IA |
| V9 | Unlisted `/tests/` pages in search and sitemap; one empty table titled « Journal des plongées » | `/tests/*` | confirmed | 2 | S | code/design | P, IA |
| V10 | Mouse help: « Tourner » and « Déplacer » both « glisser »; in-frame « ? » covers keys only | `/modele` desktop | confirmed | 2 | S | code/design | H, N, P |
| V11 | Phone: « Visite guidée » pill clipped at the left; in dive mode it covers the season slider | `/modele`, phone | confirmed in emulation (geometry, fairly sure) | 2 | S | code/design | D, N |
| V12 | Phone dive mode: no swim help, the « ? » shows ordinary touch help | `/modele`, phone, dive | confirmed | 2 | S–M | code/design | N |
| V13 | 404 page has no way onward; French on `/en/…` | any bad URL | confirmed | 2 | S | code/design | N, IA |
| V14 | Phone: no coordinates or map link anywhere | all pages, phone | confirmed | 2 | S | code/design | D |
| V15 | Wall-top depth: « -35 pieds » vs « 40 pieds » | `/decoupage-du-site` vs `/a-propos`, tour step 2 | confirmed | 2 | S | content | D |
| V16 | Zones aren't linked: no overview/zone labels/« go to zone » in the viewer, no zone → model links | `/modele`, `/decoupage-du-site` | observation confirmed; effect hypothesis | 2 | M–L | mixed | D, IA |
| V17 | Zone map on phone: small numbers, zoom only to screen width; « 26 » on the map, not in the list | `/decoupage-du-site`, phone | confirmed | 1 | S | mixed | D |
| V18 | Dive log table: total row unlabelled, no participants summary, header not sticky, phone columns off-screen | `/collecte/journal-des-plongees` | confirmed | 1 | S | code/design | D |
| V19 | English / unaccented UI strings: « Footnotes », « Back to reference », « Selectionner » | gear, dive log, footer | confirmed | 1 | S | code/design | D, P, N, IA |
| V20 | French number formats on the English model page (« 122 Mo », « 2 millions », « 700 000 ») | `/en/model` | confirmed | 1 | S | code/design | H, N |
| V21 | Footer selects truncated « Somb… », « Franç… »; language only in the footer | all pages, desktop | confirmed | 1 | S | code/design | D, H, N, IA |
| V22 | « Modèle 3D » twice (pill + first sidebar entry) | phone menu, desktop sidebar | confirmed | 0 | S | code/design | D, P, IA |
| V23 | Desktop home has no menu; ☰ on `/modele` but not on `/` or 404 | `/`, 404 | confirmed | 1 | S | code/design | H, N |
| V24 | Dragging during the tour drops `#tour-1` but the card still says « Étape 1 sur 8 » | `/modele` desktop | confirmed | 1 | S | code/design | N |
| V25 | Escape doesn't leave dive mode | `/modele` desktop | confirmed | 1 | S | code/design | N |
| V26 | Dive mode has three names; EN has two buttons labelled « Back » | `/modele`, `/en/model` | confirmed | 1 | S | code/design | N |
| V27 | Google Earth Web: the no-download link comes after the import procedure; « Orientation 150 » with no unit | `/modele` Téléchargements | confirmed | 1 | S | code/design | N |
| V28 | Missing word-spaces: AR line « Taille du modèle :sur une table ·taille réelle »; home search excerpt run together | `/modele` phone, search | confirmed after the typography rebuild | 1 | S | code/design | N, P |
| V29 | Settings panel jargon (« Bump map », « Rendu des tons », « Session X8K2 » unexplained) | `/modele` ⚙ | confirmed | 1 | S | code/design | N |
| V30 | Start view doesn't say it's underwater or that violet = not yet scanned; dive view starts murky | `/modele` | hypothesis (observation confirmed) | 2 | S | code/design | H, N |
| V31 | Wheel zoom barely moves the camera from the start view | `/modele` desktop | to check on a real device | n/r (3 if real) | S–M | code/design | H |
| V32 | Deep links give no project context; ~40 pages share one generic French meta description (also on EN pages) | `/questions/*`, `/en/problems/*` | confirmed (impact hypothesis) | 1 | M | mixed | P, IA |
| V33 | Labels: « Effet de bananne » typo (title, URL), « Découpage du site » ambiguous, « dense point cloud » in a French label, long gear label, jargon in tour cards | sidebar, pages, tour | confirmed | 1 | S | content | IA, H |
| V34 | Sidebar order: About/Thanks before content; prev/next crosses groups | sidebar | confirmed (impact hypothesis) | 1 | S | code/design | IA |
| V35 | Card « 02 La méthode · GoPro Hero6… » goes to Extraction, not the gear page | `/` | confirmed | 1 | S | code/design | P |
| V36 | « Suivi » table 1377 px in a 753 px column, sideways scroll with no cue; phone shows 4 of 13 columns | `/workflow/suivi` | confirmed | 1 | S | code/design | P |
| V37 | Search noise on proper nouns (« Williamsburg »: 4 unrelated EN hits, 2 FR) | search | confirmed | 1 | M | code/design | H, IA |
| V38 | Tour end: no hint that ⌂ returns to the start | `/modele`, tour step 8 | confirmed | 1 | S | content | H |

## Findings in detail

### V1 · Card « 03 Les problèmes » opens an empty page · Sev 3
- **Steps**: desktop, `/`, click card « 03 Les problèmes · Distorsion, courant, netteté ». Same on `/en` (→ `/en/problems/chunk-alignment`).
- **What happens**: `/questions/alignement-chunks`: title only, body text length 0.
- **Evidence**: `verify\v01-home-full.png` (card), `verify\v02-chunks.png`; link targets from the DOM: `/questions/alignement-chunks`.
- **Why 3**: one of three advertised doors, first click, dead-looking page; the card names distortion, current, sharpness, none of which is there.
- **Fix**: point the card at « Effet de bananne » (or a short overview of the group); hide the empty page from the sidebar until written.

### V2 · Phone: guided tour unusable in the framed viewer · Sev 3
- **Steps**: phone (fresh profile), `/modele`, wait 10 s, tap « …site guidée » (≈ 70,370), then tap → (≈ 158,360) twice.
- **What happens**: the card is a ~105 px column of one or two words per line; its heading « Étape 1 sur 8 » and ✕ are above the frame; → sits over the AR button. After the first tap (`#tour-2`) a ← takes →'s place, so the second tap goes back (`#tour-1`).
- **Evidence**: `verify6\v28-phone-tour1.png`, `verify6\v29-phone-tour2.png`; hashes logged `#tour-2` → `#tour-1`.
- **Confidence**: the → / ← swap and the overlap are geometry and very likely real. The card's height looks computed from the window: inside the frame `innerHeight` = 844 while `clientHeight` = 316, which is suspicious of Chrome emulation; check the card size on a real phone.
- **Fix**: keep → always rightmost in a fixed spot (← to its left, hidden on step 1); on narrow frames show the card as a full-width bottom sheet with ✕ visible, sized from the frame (`clientHeight`), and hide the AR/dive buttons during the tour.

### V3 · Divers' door doesn't serve divers · Sev 3
- **Steps**: `/`, card « 01 Plonger le site · Zones, profondeurs, courant du canal » → `/decoupage-du-site`. Then search « courant » → `/questions/canal`.
- **What happens**: the zone page has one depth (« Le dessus situé à -35 pieds », zones 7–8), no mention of current, no link to the current page (its only links are SOS and anchors). `/questions/canal` opens « Tester la collecte de données en conditions de fort courant avec la caméra montée sur le scooter »; the diver-relevant fact (35 ft/min, 10,7 m/min, 2024-06-08, 7 880 m³/s) is at the end, uninterpreted. Meanwhile `/a-propos` promises « la page sur le courant dans le canal dit ce qui attend le plongeur ».
- **Evidence**: `verify\v03-zones-full.png`, `verify\v04-canal.png`.
- **Fix** (author): a short « Pour plonger » box at the top of `/decoupage-du-site` (walls 40 ft, floor 60 ft, current measured and how it varies, link to the current page and the model), or a small « Plonger l'écluse 21 » page as card 01's target; a two-line diver summary at the top of `/questions/canal`.

### V4 · No history page for heritage visitors · Sev 2 · hypothesis on impact
- **Steps**: read `/`, `/a-propos`; search « Williamsburg », "Cornwall canal".
- **What happens**: two sentences in total (flooded 1958, Dickinson Landing, one of the Lost Villages). Nothing on which canal, when built, what it did. The home's « À quoi sert ce site » names non-divers as an audience but no card leads them anywhere but the model.
- **Evidence**: `verify\v01-home-full.png`; `/a-propos` text in my log.
- **Why 2, not 3**: the model and tour do serve « show the lock to non-divers », which is what the site promises; history is a gap, not a broken promise.
- **Fix** (author): one short « Histoire de l'écluse » page (canal, dates, role, 1958, the 1988 SOS survey, links to the Lost Villages Historical Society); link it from À propos and the home.

### V5 · « Suivi » contradicts the published status · Sev 2
- **Steps**: `/` (12 / 25 en ligne, zone 12 render, last Z16) → `/workflow/suivi`.
- **What happens**: 20 rows (zones 1–20); row 12 has only « Échelle présente » ✓; no "online" column; no date.
- **Evidence**: `verify\v07-suivi.png`, `verify5\v26-phone-suivi.png`.
- **Fix** (author): one line above the table: « Journal de traitement, à jour au … ; ce qui est en ligne: voir le modèle 3D (zones …) », or an « En ligne » column; rows 21–25.

### V6 · Placeholders and empty sections · Sev 2
- **What happens** (all seen): « awef » under « Balance des blancs » (`/workflow/extraction-des-photos`), under the figure in `/questions/charte-couleurs-surexposee`, in `/questions/nettete-images`; « ISO Minimum ??? » (`/collecte/materiel-utilise`); « [TODO: revoir cette section… » (`/questions/dimensions-rig`); « Conclusions » empty and « Échantillon 1 » one line (`/questions/effet-bananne`); `/workflow/texture` ends on the heading « Texture type »; zones 17–25 empty headings.
- **Evidence**: `verify\v06-extraction.png`, `verify\v05-gear.png`, `verify\v03-zones-full.png`.
- **Fix** (author; AGENTS.md says leave placeholders unless asked): replace with a visible status line (« à compléter », « résultats à venir ») or hide empty sections until written.

### V7 · Search « Metashape » misses the procedure pages · Sev 2
- **Steps**: search `Metashape`.
- **What happens**: 5 results (banana effect, gear, home, extraction, sharpness); « Alignement des photos » etc. never contain the word (checked on `/workflow/alignement-des-photos`).
- **Evidence**: `verify\v08-search-metashape.png`.
- **Why 2 (P said 3)**: the sidebar's « Le traitement » group lists the pages plainly; the loss is for search-first visitors.
- **Fix** (author): one intro line per procedure page naming Metashape (and its version).

### V8 · Search UI in English on the French site · Sev 1
- **Steps**: FR page, search anything / nonsense.
- **What happens**: « 7 results for calibration », « No results for qqqqzzzz » next to French « Annuler ».
- **Evidence**: `verify\v09-search-calibration.png`.
- **Fix**: set Pagefind's French UI strings (Starlight's `pagefind` translations).

### V9 · Unlisted `/tests/` pages · Sev 2
- **Steps**: search `calibration` and `plongées`; open `/tests/journal-des-plongees`.
- **What happens**: « Calibration des couleurs » (tests) and « La calibration des couleurs » both listed; « Journal des plongées » appears twice; the tests one is an empty table (row « 1 »), with no sidebar highlight and no context.
- **Evidence**: `verify\v09-search-calibration.png`, `verify\v11-tests-log.png`.
- **Fix**: exclude `/tests/` from Pagefind and the sitemap (`pagefind: false` / sitemap filter) until they're listed, or give them a « Tests » sidebar group; delete or rename the empty test log.

### V10 · Mouse help doesn't say which button; in-frame help keys only · Sev 2
- **Steps**: `/modele` desktop; press the in-frame « ? »; read « Naviguer » below.
- **What happens**: the « ? » card covers only W A S D / arrows; mouse actions are below the frame, off screen at 1440 × 900; « Tourner glisser » and « Déplacer glisser » differ only by the mouse icon.
- **Evidence**: `verify2\v13-model-desktop.png`, `verify2\v14-help.png`.
- **Fix**: « glisser (bouton gauche) » / « glisser (bouton droit) »; add the mouse lines (turn, pan, wheel, double-click) to the in-frame « ? » card.

### V11 · Phone: « Visite guidée » clipped / over the slider · Sev 2
- **Steps**: phone, `/modele`, wait; then tap the dive button.
- **What happens**: the pill reads « site guidée », its icon outside the frame. In dive mode the pill sits on the season slider, leaving only « Automne » visible.
- **Evidence**: `verify6\v27-phone-model.png`, `verify6\v30-phone-dive.png`.
- **Confidence**: high for the clipping (horizontal geometry), medium for the dive overlap (may depend on the frame-height oddity of V2).
- **Fix**: on narrow frames, make the tour an icon button like the others, or give it its own row; hide it while diving.

### V12 · Phone dive mode: no swim help · Sev 2
- **Steps**: phone, `/modele`, tap the dive button, then « ? ».
- **What happens**: no « Nager dans l'écluse » card appears (on desktop it does); « ? » shows « Naviguer du bout des doigts » (turn, pan, double-tap). Nothing says how to swim by touch; the page promises « l'aide s'ouvre la première fois ».
- **Evidence**: `verify6\v30-phone-dive.png`, `verify6\v31-phone-dive-help.png`; desktop for comparison `verify2\v16-dive.png`.
- **Fix**: a touch version of the swim help, opened the first time as on desktop (and, if there is no touch swimming, say so: « sur téléphone: on regarde autour, sans nager »).

### V13 · 404 dead end, French on English addresses · Sev 2
- **Steps**: `/page-qui-nexiste-pas`, `/en/nothing-here`.
- **What happens**: « 404 · Page non trouvée. Vérifiez l'URL ou essayez d'utiliser la barre de recherche. »; no link onward except logo and pill; `/en/…` is `lang="fr"` with the same French text.
- **Evidence**: `verify\v12-404.png`.
- **Fix**: links to Accueil, Modèle 3D, Découpage du site; an English 404 for `/en/*` (Worker or a second 404 page).

### V14 · Phone: no location · Sev 2
- **Steps**: phone, `/`, look for coordinates; open ☰.
- **What happens**: the header's coordinates are `display:none` on phone; neither the home nor the menu shows them; « Dickinson Landing » is the only location text.
- **Evidence**: `verify5\v21-phone-home.png`, `verify5\v22-phone-menu.png`.
- **Why 2 (D said 3)**: a diver planning a visit can still find Dickinson Landing on a map; precision is the gap.
- **Fix**: show the coordinates in the phone menu or home panel, as a map link (`geo:` / Google Maps).

### V15 · Wall-top depth inconsistent · Sev 2
- « Le dessus situé à - 35 pieds » (zones 7–8, `/decoupage-du-site`) vs « Ses murs sont à 40 pieds (12,2 m) » (`/a-propos`) and tour step 2 (40 ft). Evidence: `verify\v03-zones-full.png`, `/a-propos` text. **Fix** (author): reconcile or say why (different walls, water level).

### V16 · Zones aren't first-class: viewer has no overview or zone labels · Sev 2
- **Observed**: the viewer starts close up in one enclosure (`verify6\v27-phone-model.png`, `verify2\v13-model-desktop.png`); no zone labels, no « aller à la zone », settings hold display options only (`verify2\v15-settings.png`). The zone page links zones to nothing (only anchors).
- **Hypothesis**: a visitor can't target "the part I want to see" without knowing the model.
- **Fix**: per zone on `/decoupage-du-site`, a « voir dans le modèle 3D » link (`/modele?cam=…`, as the home render already does); later a top-view tour step with zone numbers.

### V17 · Zone map on phone · Sev 1
- Phone, `/decoupage-du-site`: the map shows at 286 px wide (image is 1181 px); a tap zooms it only to the screen's width; numbers readable but small; « 26 » on the map, the list stops at 25. Evidence: `verify5\v23-phone-map.png`, `verify5\v24-phone-map-zoom.png`. **Fix**: allow pinch/pan in the zoom or link the full image; explain or list zone 26 (content).

### V18 · Dive log table · Sev 1
- Desktop: `<tfoot>` « 3 jours, 13 heures et 14 minutes » in the duration column only, no « Total » label, wraps on 3 lines; `<thead>` `position: static` over a ~6,400 px scroll; Notes 193 px wide. No summary line of dates/participants. Phone: Durée, Participants and Notes off-screen. Evidence: `verify\v10-log-bottom.png`, `verify5\v25-phone-log.png`. **Fix**: « Total : 47 plongées » in the first cells, duration spanning the free columns; sticky header; a one-line summary above (content).

### V19 · English / unaccented UI strings on French pages · Sev 1
- « Footnotes » in « Sur cette page » on `/collecte/materiel-utilise` and `/collecte/journal-des-plongees`; footer labels « Selectionner le thème / la langue » (no accent). « Workflow » is now « Le traitement » (fixed). Evidence: `verify\v05-gear.png`, `verify\v10-log-bottom.png`. **Fix**: French footnote label (« Notes ») and back-reference text in the Markdown config; « Sélectionner ».

### V20 · French number formats on `/en/model` · Sev 1
- « GLB · 122 Mo », « 2 millions triangles », « 700 000 triangles » (text log). **Fix**: « 122 MB », « 2 million », « 700,000 ».

### V21 · Footer selects truncated · Sev 1
- « Somb… », « Franç… » at 1440 px, every page. Evidence: `verify\v01-home-full.png`. **Fix**: let the selects size to their text.

### V22 · « Modèle 3D » twice · Sev 0
- Phone menu: orange pill + first list entry (2 visible links); desktop: header pill + sidebar. Evidence: `verify5\v22-phone-menu.png`. Harmless redundancy; drop the sidebar entry only if it bothers the author.

### V23 · No menu on the desktop home; ☰ inconsistent · Sev 1
- `/` at 1440 px has no ☰ or sidebar (`verify\v01-home-full.png`), `/modele` has ☰ (`verify2\v13-model-desktop.png`), the 404 doesn't. Thanks, zones etc. reachable from the home only through « À propos du projet → », cards or search. **Fix**: show the ☰ on the desktop home too (as on `/modele`).

### V24 · Dragging during the tour · Sev 1
- Desktop: start the tour (`#tour-1`), drag in the view: the hash is cleared but the card still says « Étape 1 sur 8 ». Evidence: `verify3\v18-tour1.png`, `verify3\v19-tour-drag.png`. **Fix**: after a manual move, a « Revenir à la vue » action on the card (or → replays the step).

### V25 · Escape doesn't leave dive mode · Sev 1
- Desktop: dive, Escape ×2: help closes, `underwater=1` stays. Evidence: `verify2\v17-dive-esc.png`. **Fix**: Escape leaves dive mode when no dialog is open.

### V26 · Naming: dive mode, « Back » · Sev 1
- Button « Ambiance sous-marine » / page « Plonger et nager » / card « Nager dans l'écluse ». EN frame has « Back » for both the S key and the tour's previous step (button labels list). **Fix**: one name (« Plonger » / "Dive"); tour button « Previous step » / « Étape précédente ».

### V27 · Google Earth Web order and unit · Sev 1
- The disclosure « Le placer dans Google Earth Web » (import the 122 MB GLB, type values) precedes « Ou voyez-le déjà en place, sans rien télécharger »; « Orientation 150 » has no unit. Evidence: `verify\v34-ge.png`. **Fix**: no-download link first; « 150° ».

### V28 · Missing word-spaces · Sev 1
- After the typography rebuild, the phone AR line still reads « Taille du modèle :sur une table ·taille réelle » (no space after the colon, none between « · » and « taille »). The home's search excerpt still runs card texts together: « courant du canal.plongeurs →02La méthodeGoPro Hero6… ». Evidence: `verify6\v32-phone-ar.png`, `verify\v08-search-metashape.png`. **Fix**: spaces around the inline links; `data-pagefind-ignore` on the home cards (or separators in their markup).

### V29 · Settings jargon · Sev 1
- « Bump map », « Rendu des tons » (AgX / Khronos neutre / ACES), « Session X8K2 » unexplained (each slider does have a hint; reset present). Evidence: `verify2\v15-settings.png`. **Fix**: one intro line, and « code à donner en cas de problème » by the session code.

### V30 · What am I looking at? · Sev 2 · hypothesis
- Desktop start view: blue sky, pale sand, flat violet volumes (`verify2\v13-model-desktop.png`, `verify\v33-tour8.png`); only tour step 8 explains violet = not yet scanned. Dive view starts murky green with two wall outlines (`verify2\v17-dive-esc.png`). **Hypothesis**: first-time visitors may not read it as underwater nor understand violet. **Fix**: a one-line caption near the frame: « L'écluse 21, à 60 pi sous le Saint-Laurent. En violet : zones pas encore numérisées. »

### V31 · Wheel zoom distance · to check on a real device
- H measured ≈ 13 cm of camera move for 10 notches at ~1 fps; I did not re-measure (no GPU). If true, sev 3 (the most natural "get closer" action). **Check** on a desktop with a GPU; if confirmed, zoom toward the surface under the cursor.

### V32 · Deep-link context and meta descriptions · Sev 1
- `/en/problems/banana-effect` meta description is the generic French sentence « Photogrammétrie sous-marine de l'écluse 21 … »; IA counted 40 of 50 pages. On a deep link the page has no context line; the header wordmark (phone: only « ÉCLUSE/21 ») is the cue. **Fix**: a `description` per page in its language (content, M); optionally a one-line context under the title of notebook pages.

### V33 · Labels · Sev 1 · content
- « Effet de bananne » (title, sidebar, URL; EN is right); « Découpage du site » (site = website?) while EN says "Site zones"; « Génération du dense point cloud »; long « Matériel utilisé pour la collecte des données »; tour jargon (« enclaves du déversoir », « zone 18 »). « chunk » and « rig » are kept on purpose as practitioners' terms (author's call). **Fix**: « Effet de banane » with a redirect; « Zones de l'écluse »; « Nuage de points dense »; « Matériel ».

### V34 · Sidebar order · Sev 1
- Order: Modèle 3D, À propos, Remerciements, Découpage du site, then groups (`verify5\v22-phone-menu.png`); prev/next follows it (Remerciements → Découpage → Journal). **Fix**: put À propos and Remerciements last.

### V35 · Card « La méthode » target · Sev 1
- Card text « GoPro Hero6, Metashape, Blender » → `/workflow/extraction-des-photos`; the gear page is in another group. **Fix**: link the gear page from the extraction intro (or retarget).

### V36 · « Suivi » table width · Sev 1
- Table 1377 px in a 753 px column, header cut at « Echelle… »; phone shows 4 columns and struck-through text one word per line. Evidence: `verify\v07-suivi.png`, `verify5\v26-phone-suivi.png`. **Fix**: a right-edge fade/shadow scroll cue; sticky first column.

### V37 · Search noise on proper nouns · Sev 1
- « Williamsburg » gives 4 unrelated EN results (Photo alignment, Banana effect, About, Rig) and 2 FR (model, rig). **Fix**: hard to tune in Pagefind; at least V4's history page would give such searches a real hit.

### V38 · Tour end · Sev 1
- Step 8 (`verify\v33-tour8.png`) ends on ✓; the camera stays at the last stop; nothing mentions ⌂. **Fix**: add « ⌂ ramène à la vue de départ » to the last card.

## Dropped (not reproduced or no longer current)

- **Phone opened on the dunes (N 1.2)**: not reproduced; a fresh phone profile (`verify6`) opened on the normal start view (`verify6\v27-phone-model.png`).
- **`/en/` 404 (H, IA environment note)**: local-preview quirk; production `HEAD /en/` → 200, `/en` → 301 to `/en/`.
- **« Navigation » table first column touching the border (H C5, cosmetic part)**: fixed in the rebuild.
- **« Workflow » as a French label (P, IA)**: resolved, now « Le traitement » (`verify5\v22-phone-menu.png`).
- **French missing spaces before « : » etc.**: resolved by the typography rebuild; only the two real word-space gaps of V28 remain.
- **Double-tap did nothing (D 3.5)** and **« Affinage des détails » stays up long (N 1.1)**: artefacts of emulated taps / ~1 fps rendering, untestable here.
- **« (jusqu'à 16 384 px) » on `/modele` and the GLB "come back" sentence**: changed as announced (the GLB text now has « revenez chercher la dernière version »).

## Limits of this verification

- Headless Chrome, no GPU (~1 fps): camera speed, wheel zoom (V31), tour flights and detail loading were not judged.
- Phone results are Chrome device emulation. Inside the viewer frame `innerHeight` reported 844 for a 316 px frame, so V2's card sizing and V11's dive overlap need a real-phone check; the horizontal clipping and the →/← swap are geometry and likely real.
- Two-finger touch, pinch, hover tooltips, native `<select>` menus, AR and downloads were not tested.
- Content findings (V3–V7, V15, V33) and their severities depend on how much the author wants to serve divers and heritage visitors versus practitioners; V4, V16 and V30 rest on assumptions about visitors that only a test with real people can settle.
- The site was rebuilt twice during the audit; all statuses above are against the latest build I saw (French typography and « Le traitement » included).

# To do

Working list for the lock21.info project. Each item has a **stable number** (`#12`): it keeps it until it is
removed, and numbers are never reused, so "todo 12" always means the same item. New items take the next free number:
**#126**. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right
place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing

### Viewer

- [ ] #75 Colour grading at the source, zone by zone (DaVinci Resolve, at frame extraction; the corrections after the
  fact only invent the lost blue and red). Zone 3 done and online (2026-10-29, Christian: « peu de différence, mais je
  préfère après »): the chunk « zone 3 - lens corrected - graded - clean RU=30, PA=5, RE=0.4 » of
  `O:\photogrammetry\zone-3.psx` retextured from the graded frames with the masks, 16 206 px, Mosaic, holes filled
  (`tools/color-grading/retexture_chunk.py`, Metashape 2.3.1: about 3 h of blending), registration as before (14.4 mm).
  Its non-graded frames deleted the same day (the original chunks relinked to the graded ones, `relink_frame.py -a`;
  tools/color-grading/README.md). Downloads rebuilt with it the same day. Zone 4 done (2026-10-30, Christian: « c'est
  bon, on conserve »): one dive (2024-08-18), two corrections by group of clips (green water, lamps;
  `timeline_lut.py -k`), then the colour evened out across the frame (`flat_color.py`, the rig's lamps), retextured
  13 872 px in about 1 h 30, registration 13.5 mm (the graded export turned 90°, as zone 3's). Zone 2 done (2026-11-01, Christian: « c'est bon, on garde la
  nouvelle texture »): five dive folders, the colour evened out by `flat_color.py`, 15 893 photos, retextured 12 944 px
  with the masks, registration 2.8 mm. Zone 3 redone (2026-11-02): 4 952 of its 30 814 photos, from dives filed under
  zone 2, had stayed ungraded; 15 008 px (tools/color-grading/README.md). Zone 2's earlier frames folders deleted (2026-11-02, about 840 GB): the
  original chunks of zones 2 and 3 relinked. Left: the other zones, zone 12 first
- [ ] #5 Colour balance and green removal: bake them into the downloadable model
  - Tried and dropped (2026-10-25): a whole-texture balance before tiling (`color_correct.py`) turned the model mauve
    and flat in the viewer, whose own corrections then applied twice; the blue and red the water took are not in the
    textures. The viewer's look stays the reference: bake its corrections (zone balance, green and cyan removal,
    saturation) into the downloadable model. `color_patch.py` (a part of a zone brought to its neighbours' colour) stays
    for local cases. The real fix is upstream: #75.

## Site


- [ ] #84 Usability audit: content, for Christian. V16 a « voir
  dans le modèle 3D » link per zone; V30 a caption under the viewer (underwater, violet = not yet scanned); V32 a
  description per page; V33 labels (« Zones de l'écluse »; « Effet de banane » and « Nuage de points dense » done); V34
  About and Thanks last in the sidebar
- [ ] #85 Usability audit: what agents can't settle. V31 wheel zoom from the start view on a desktop with a GPU; a
  20-minute test with three to five people, in French and English (the eight tasks in the report's « A test with real
  people »)

- [ ] #123 Bug (Christian, 2026-11-03): on `/decoupage-site#fig-01`, clicking the image to enlarge it shows it shifted to the left
  (the lightbox, `public/scripts/image-zoom.js`)
- [ ] #124 Zone map (`/decoupage-site#état-des-zones`, Christian, 2026-11-03): remove the state « relevée, à venir », its zones
  shown as « pas encore relevée » (`ZoneMap.astro`)
- [ ] #125 Heading anchors as plain slugs, no escaped characters in the address (Christian, 2026-11-03): `#état-des-zones` shows as
  `#%C3%A9tat-des-zones`, to become `#etat-des-zones`; the links that use them updated (`/collecte/materiel-utilise#caméra`…), the
  former anchors still working where other sites may point to them
- [ ] #93 Document the gear (Christian, 2026-10-26): his own photo of the GoPro Hero6 Black in its housing, to replace
  GoPro's product photo (« Matériel utilisé », Caméra); « Le rig » (`collecte/rig.md`, since 2026-10-26: photos of
  2024-05-16 and 2024-06-14, Sylvain Marcotte's 3D model) still has one « à compléter »: the rig's construction
  (fittings, how it attaches to the scooter; the 2020 aluminium profiles and the lights written)
- [ ] #111 The 3D viewer on real phones (GPU, memory, Safari: BrowserStack or Christian's Pixel and an iPhone), the
  light-then-full switch on a strong Android phone included (performance audit, `docs/audits/performance-2026-11-01.md`, P3, done
  2026-11-01). The start view's time on a real connection to read on the live site: its `errorTarget` went from 8 to 10 on
  2026-11-03 (75 to 63 MB)
- [ ] #114 The 3D viewer too laggy on old tablets (Christian, 2026-11-01, told by a visitor): which ones (model, iOS or
  Android version), standard or underwater view; then a lighter profile for weak devices (pixel ratio, shadows, ambient
  occlusion, particles, creatures, detail), chosen from the device's GPU and memory or from a slow frame rate measured
  in the first seconds; tried on an old iPad (BrowserStack or a real one)
- [ ] #105 Google Analytics, with Christian, from 2026-10-31 (two or three days after the custom definitions were
  registered on 2026-10-29): explore the new values in Explore: sessions with viewer_end, the time standard and
  underwater (standard_seconds, underwater_seconds), dives (dive_end, seconds), the tour's steps (step), the viewer's
  buttons (button), the first move (move), the settings, season, lamp, theme, language and AR size. The pages' speed
  (web_vitals: metric_name, metric_rating, metric_value): how many first pages take more than a second on a phone.
  A setting's new value is setting_value. These four were registered on 2026-11-03 (Christian): nothing before that
  date, so read them from about 2026-11-05. Access still to settle: the Data API (gcloud, read-only) or CSV exports
- [ ] #116 Calibrate the GoPro HERO13 Black before the next dives (Christian, 2026-11-01: it replaces the HERO6): its lens
  must not bring back the banana effect (`problemes/effet-banane.md`: the 300 ft segment of 2024-07-26 curled up; the
  HERO6's fix, Resolve's lens correction before Metashape, the « lens-corrected » frames). Underwater only (the flat
  port changes the focal length), as at the Bédard quarry on 2024-05-26: the checkerboard filmed from every angle,
  covering the whole frame, then a long flat surface with targets at known distances (the 100 ft wooden floor, or the
  300 ft south wall). Three variants compared, the one that stays straightest kept: Wide with no correction and
  Metashape modelling the distortion (Fisheye camera, its own calibration group, from the checkerboard); Wide corrected
  in Resolve with the HERO13's lens profile; Linear (the camera's own narrower, straightened view). The same dive: the
  white balance on the colour chart under the lamps at about 70 cm, at 6500, 5500 and 4800 K (fixed, never Auto; the
  HERO6's 6500 K left the frames yellow: zone 2 needed 1.6 to 2.7 times the blue, `clip_gains.mjs`), and whether to
  film in 10 bits and GP-Log. Then: Resolve's projects for the HERO13 (lens, Log conversion), « Matériel utilisé »
  updated, and the « Conclusions » of the banana effect page written
- [ ] #35 lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)

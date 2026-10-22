---
title: Traiter le fichier .blend
description: Les étapes à suivre après une modification de lock-21-publishing.blend, jusqu'à la mise en ligne du modèle 3D et des téléchargements.
---

Ce guide explique quoi faire **après avoir modifié le fichier `modeles/lock-21-publishing.blend`**: déplacer une zone, retoucher une découpe, ajouter une zone, changer l'export d'une zone, modifier le terrain. Il mène, étape par étape, jusqu'au modèle en ligne sur lock21.info et aux téléchargements (Google Earth, GLB).

Toutes les commandes se lancent dans **PowerShell**, depuis le dossier du projet (`F:\projets\lock21.info`).
L'ordinateur doit être prêt: voir le guide **Installation** (`docs/installation.md`).

## Vue d'ensemble

| Étape                       | Ce qu'elle fait                                            | Durée               | En ligne?         |
| --------------------------- | ---------------------------------------------------------- | ------------------- | ----------------- |
| 1. Vérifier                 | liste les zones modifiées                                  | 1 min               | non               |
| 2. Tuiles                   | refait les zones modifiées pour le visualiseur             | 5 à 15 min par zone | non               |
| 3. Relief                   | refait la carte des normales des zones refaites            | 2 à 8 min par zone  | non               |
| 4. Contrôle                 | regarder le résultat dans le visualiseur, sur l'ordinateur | quelques minutes    | non               |
| 5. Mise en ligne des tuiles | envoie les zones refaites sur le serveur                   | quelques minutes    | **oui**, aussitôt |
| 6. Téléchargements          | refait le KMZ de Google Earth et le GLB, puis les envoie   | 25 min              | **oui**           |
| 7. Site                     | met à jour les pages et publie le site                     | 5 min               | **oui**           |

Les étapes 1 à 4 ne changent rien en ligne: on peut les refaire autant de fois que nécessaire. Les étapes 5 à 7 changent ce que les visiteurs voient.

## Avant de commencer

- [ ] **Le `.blend` est sauvegardé**, et **aucun objet n'est en mode Édition** au moment de la sauvegarde. Un objet sauvegardé en mode Édition est enregistré incomplet dans le fichier (sans ses sommets ni ses UV), et les exports échouent (erreur `foreach_get(..) sequence length mismatch`). En cas de doute: Tab pour revenir en mode Objet, puis sauvegarder.
- [ ] **Blender peut rester ouvert**, mais il ne faut pas sauvegarder pendant que les étapes 1 à 3 et 6 lisent le fichier: la sauvegarde échouerait. Attendre la fin de l'étape en cours.
- [ ] **Chaque zone sait où se trouve sa version haute résolution.** Dans le `.blend`, chaque zone est un objet de la collection `zones`. Son maillage peut être en basse résolution: il sert seulement à placer la zone et à dessiner ses découpes. La version qu'on publie est un autre fichier, en haute résolution: l'export `.glb` de Metashape, avec sa texture, rangé dans `O:\modeles\`. Son chemin est noté dans la **propriété personnalisée `source`** de l'objet (panneau *Object Properties*, section *Custom Properties*).

  Une seule règle: le fichier basse résolution et le fichier haute résolution doivent venir **du même modèle Metashape** (le même chunk), par exemple un export à 1,5 M faces et un autre à 36 M faces du même modèle. Sinon les deux ne se superposent pas, et l'étape 2 s'arrête sur cette zone.
- [ ] **Le contexte** (ce qui entoure les zones) est fait des objets de la collection **`terrain`** et des objets dont le nom contient « filler ». La collection **`terrain - drawings`** (pièces dessinées d'après les plans, gardées comme référence) n'est jamais publiée, même pour un objet nommé « filler ».
- [ ] Le fichier `.env.local` (identifiants du serveur) est présent à la racine du projet. Il n'est jamais copié ni affiché.

## Étape 1 · Vérifier ce qui a changé

```powershell
npm run model:check
```

Le résultat liste chaque zone, `à jour` ou `modifiée`, avec ce qui a changé:

```text
zone 8   modifiée: matrix_world, modifiers
À publier: zone 8, context
```

- `matrix_world`: la zone a été déplacée, tournée ou mise à l'échelle.
- `modifiers`: une découpe (booléen) ou le Lattice a changé.
- `mesh`: le maillage de la zone a changé.
- `source`: la zone pointe vers un autre export.
- `context`: le terrain, les murs ou les remplissages ont changé.

Rien n'est modifié à cette étape.

## Étape 2 · Refaire les tuiles

```powershell
npm run model:post-modified
```

Refait **seulement** les zones listées à l'étape 1, et le contexte s'il a changé. Pour chaque zone: recalage de l'export haute résolution sur la zone du `.blend`, application du Lattice, rognage, simplification, texture, tuilage. Le résultat va dans `O:\publishing\tiles\` (sur l'ordinateur seulement).

Ce qu'il faut regarder dans le résultat, pour chaque zone:

```text
=== zone 8
   [register: residual_surface_median 0.0071 ...]
   compression: 496 tuiles, 109.5 Mo -> 82.9 Mo
   durée: 548 s
```

Si une zone affiche **`ÉCHEC`**, le journal détaillé est dans `O:\temp\<zone>-publish.log`. La cause la plus fréquente: `recalage ... trop imprécis`, l'export `source` ne vient pas de la même reconstruction que le maillage de la zone dans le `.blend`.

Pour refaire des zones précises, même sans changement: `npm run model:publish -- -Zones "zone 2","zone 3"`.

## Étape 3 · Refaire le relief

Le relief (la carte des normales: moules, joints, pierres) est cuit à part, pour chaque zone refaite à l'étape 2:

```powershell
.\tools\publish-model\relief_zones.ps1 -Zones "zone 8"
```

Plusieurs zones: `-Zones "zone 2","zone 8"`. Les zones dont la `source` est une version basse résolution prennent leur export haute résolution avec `-High` (aujourd'hui, les zones 1 et 10):

```powershell
.\tools\publish-model\relief_zones.ps1 -Zones "zone 1","zone 10" -High @{
    "zone 1"  = "O:\modeles\zone-1\zone 1 - lens corrected - mesh - 8.6M faces.glb"
    "zone 10" = "O:\modeles\zone-10\zone 10 - lens corrected - mesh - 22.6M faces.glb"
}
```

Chaque zone affiche son écart (`gap ... median`, normalement autour de 1 mm) et sa cage (`cage 0.030 m`). Un écart médian au-dessus de 2 cm arrête la cuisson: l'export haute résolution ne correspond pas à la zone.

## Étape 4 · Contrôler sur l'ordinateur

Pour voir les nouvelles tuiles avant de les mettre en ligne, il faut faire tourner deux petits serveurs sur
l'ordinateur: l'un sert les tuiles, l'autre le visualiseur. Chacun occupe sa fenêtre tant qu'il tourne: on ne peut plus
rien taper dedans. D'où deux fenêtres.

1. Ouvrir une **première fenêtre PowerShell**, aller dans le dossier du projet, et lancer le serveur des tuiles:

   ```powershell
   cd F:\projets\lock21.info
   npm run model:serve-tiles
   ```

   Il affiche `Available on: http://127.0.0.1:8081` et reste en marche. Laisser la fenêtre ouverte.

2. Ouvrir une **deuxième fenêtre PowerShell** et lancer le visualiseur:

   ```powershell
   cd F:\projets\lock21.info
   npm run viewer:dev
   ```

   Il affiche une adresse `http://localhost:3100/...` et reste en marche aussi. Laisser cette fenêtre ouverte.

3. Dans le navigateur, ouvrir
   [http://localhost:3100/modele/viewer?tiles=http://localhost:8081](http://localhost:3100/modele/viewer?tiles=http://localhost:8081)
   (la fin de l'adresse dit au visualiseur de prendre les tuiles de l'ordinateur plutôt que celles en ligne), et regarder
   les zones refaites: leur place, leurs découpes, leur texture, leur relief de près.

4. Une fois le contrôle fini, arrêter chaque serveur: cliquer dans sa fenêtre, puis **Ctrl+C**. On peut aussi fermer
   les fenêtres.

## Étape 5 · Mettre les tuiles en ligne

D'abord un essai, qui montre ce qui partirait sans rien envoyer:

```powershell
npm run model:upload -- --dry-run
```

Puis l'envoi:

```powershell
npm run model:upload
```

Les visiteurs voient les nouvelles zones **dans la minute**. Les anciennes versions sont gardées une fois de plus (pour les visiteurs dont la page est encore en cache), puis supprimées à l'envoi suivant.

## Étape 6 · Refaire les téléchargements

Les téléchargements de la page `/modele` et les modèles de réalité augmentée contiennent tout le modèle: à refaire dès qu'une zone ou le contexte change.

**1. Exporter le contexte** (terrain, murs, remplissages), sans compression:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b modeles\lock-21-publishing.blend --factory-startup --python tools\publish-model\export_context.py -- O:\temp\google-earth\context
```

**2. Le modèle pour Google Earth** (600 000 triangles), puis son KMZ:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\t600k -t 600000 -s 2048 --context O:\temp\google-earth\context\context.glb
tools\google-earth\.venv\Scripts\python.exe tools\google-earth\make_kmz.py -d O:\publishing\downloads\google-earth\t600k
```

**3. Le modèle complet en GLB** (2 millions de triangles):

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\glb -t 2000000 -s 4096 --context O:\temp\google-earth\context\context.glb
```

**4. Les modèles de réalité augmentée** (zones et remplissages, sans le terrain; sur une table à 1:100 et à la taille réelle; le détail: guide **Réalité augmentée**):

```powershell
Remove-Item -Recurse -Force O:\publishing\downloads\google-earth\ar -ErrorAction SilentlyContinue
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\ar -n lock-21-ar -t 400000 -s 2048 -x 0.01 --usdz --context O:\temp\google-earth\context\context.glb --context-objects "filler*" --origin=-20.100,11.063,0.842 --rebake zone-3
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\ar -n lock-21-ar-full -t 400000 -s 2048 -x 1 --usdz --context O:\temp\google-earth\context\context.glb --context-objects "filler*" --origin=-20.100,11.063,0.842 --rebake zone-3
```

`--origin` place l'origine des modèles sur le plancher du sas, `--rebake zone-3` recuit la texture de la zone 3 (guide **Réalité augmentée**). Ensuite, changer `AR_VERSION` dans `viewer/src/main.js` (par exemple la date): sans cela, les téléphones gardent l'ancien modèle en cache.

**5. Rassembler ce qui part en ligne** dans `O:\publishing\downloads\online\`:

```powershell
$online = "O:\publishing\downloads\online"
Remove-Item -Recurse -Force "$online\google-earth" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$online\google-earth", "$online\ar" | Out-Null
Copy-Item O:\publishing\downloads\google-earth\t600k\network\lock-21.kml "$online\google-earth\"
Copy-Item -Recurse O:\publishing\downloads\google-earth\t600k\network\parts "$online\google-earth\"
Copy-Item O:\publishing\downloads\google-earth\glb\lock-21.glb "$online\"
Copy-Item O:\publishing\downloads\google-earth\ar\lock-21-ar*.glb, O:\publishing\downloads\google-earth\ar\lock-21-ar*.usdz "$online\ar\"
```

**6. Envoyer** (un essai d'abord):

```powershell
npm run downloads:upload -- --dry-run
npm run downloads:upload
```

Ceux qui ont déjà le KMZ voient les changements à la prochaine ouverture dans Google Earth Pro: le fichier ne contient qu'un lien vers les parties du modèle sur le serveur.

Le petit KMZ téléchargé depuis le site (`public/downloads/lock-21.kmz`) ne change pas d'habitude. Le recopier seulement si son contenu a changé (adresse du serveur, vue d'arrivée, texte du copyright):

```powershell
Copy-Item O:\publishing\downloads\google-earth\t600k\network\lock-21.kmz public\downloads\lock-21.kmz
```

## Étape 7 · Mettre le site à jour

Le nombre de zones en ligne et la date de mise à jour se mettent à jour seuls à la publication du site (ils sont lus sur le serveur). À la main:

- `src/content/docs/workflow/suivi.md`: l'avancement de la zone;
- `tools/publish-model/README.md`: la ligne **État** en haut, si une zone s'ajoute;
- `CHANGELOG.md`: une ligne sous **Unreleased**.

Puis enregistrer le travail dans Git (`git add`, `git commit`, `git push`) et **publier le site**: sur GitHub, onglet **Actions**, flux **Deploy**, bouton **Run workflow**. Ou, en ligne de commande:

```powershell
gh workflow run deploy.yml --ref main
```

## Cas particuliers

**Ajouter une zone.** Dans le `.blend`, mettre la zone dans la collection `zones`, nommée `zone N`, avec sa propriété `source` (l'export haute résolution, avec sa texture) et un maillage basse résolution de la même reconstruction. Placer la zone, ajouter ses découpes, sauvegarder. L'étape 1 la liste comme nouvelle; la suite est la même. Pour la texture dans Metashape: 16 384 px pour une grande zone (environ 300 m² et plus), une seule texture.

**Changer l'export d'une zone.** Remplacer d'abord le maillage de la zone dans le `.blend` par une version de la nouvelle reconstruction, vérifier ses découpes, puis changer sa `source`. Sinon le rognage, calé sur l'ancien maillage, risque d'effacer des parties nouvellement reconstruites.

**Une sauvegarde de Blender échoue** (« Cannot change old file »): une étape lisait le fichier au même moment. Réessayer après la fin de l'étape; la dernière version est dans le fichier `.blend@` à côté.

**Google Earth Pro plante** à l'ouverture du KMZ: le relancer une fois avant de conclure, il plante parfois à cause d'un plantage précédent. S'il plante encore, réduire le modèle (`-t 500000` à l'étape 6).

## Où sont les fichiers

| Quoi                          | Où                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| Le fichier de travail         | `modeles\lock-21-publishing.blend`                                                         |
| Les exports des zones         | `O:\modeles\zone-N\`                                                                       |
| Les zones préparées           | `O:\publishing\prepared\`                                                                  |
| Les journaux, intermédiaires  | `O:\temp\` (jetable)                                                                       |
| Les tuiles avant envoi        | `O:\publishing\tiles\`                                                                     |
| Les téléchargements           | `O:\publishing\downloads\` (`online\`: ce qui est envoyé)                                  |
| En ligne                      | `https://tiles.lock21.info/` (tuiles, téléchargements), `https://lock21.info/` (site, KMZ) |
| Le détail technique           | `tools/publish-model/README.md`, `tools/google-earth/README.md`                            |

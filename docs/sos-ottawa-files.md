---
title: Documents de SOS Ottawa
description: Ce que contiennent les documents de Save Ontario Shipwrecks (Nick Baets, 1988-1989) sur l'écluse 21, et ce qu'ils apportent au modèle 3D.
---

Les documents numérisés de Save Ontario Shipwrecks (SOS), section d'Ottawa, sont dans `docs\sos-files\`, en trois
dossiers, soit 59 fichiers. Ils datent de 1988 et 1989 et viennent surtout de Nick Baets (W. M. Baets), l'auteur du
dessin de 1988 déjà cité sur le site. Ils réunissent :

- des reconstitutions faites d'après le devis de 1883 et les archives;
- des croquis de plongée;
- un guide de terrain pour plongeurs;
- la préparation d'un film.

| Dossier | Fichiers | Contenu |
| --- | --- | --- |
| `Lock 21` | 37 (img393 à img429) | **Le dossier technique.** Plan du site (1988), coupe des murs de l'écluse, coupe du canal et pente des talus, déversoir, portes, vannes, puits à chaîne, extraits du devis de 1883, chronologie de la construction, croquis de plongée du 18 juin 1989, cartes de 1926 et d'après 1958, notes de recherche |
| `Lock 21 - No. 2` | 10 (img376 à img385) | **Guide de terrain SOS n° 2**, « Lost Villages Lock 21 Field Guide »: carte étanche pour plongeurs, plan au recto, vue 3D et notes de plongée au verso, épreuves de l'imprimeur |
| `Lock 21 Video` | 12 (img254 à img265) | Préparation d'un film amateur de SOS sur l'écluse 21: lettre, questionnaire d'entrevue, plan de tournage, scénarimage, notes de maquette, contacts, une page de livre |

Les lettres, les listes de contacts et la page de livre contiennent les adresses et les numéros de téléphone de
particuliers: ne pas les publier. Les deux photos couleur img393 et img394 ne montrent pas l'écluse 21, noyée depuis
1958: c'est une autre écluse, gardée comme référence.

## Les plans les plus utiles

| Fichier | Ce qu'il montre |
| --- | --- |
| img397 (et img395, annoté) | **Plan du site**, 21 septembre 1988, « pas à l'échelle, conceptuel »: écluse, déversoir, talus, escaliers, bollards, maison de l'éclusier, puits à chaîne. Nord en haut, courant d'ouest en est |
| img413 | **Plan du canal** (section 10, 6000 pi) et **coupe A-A du canal**, **pentes des talus nord et sud**, enrochement |
| img419 | **Coupe des murs de l'écluse** (nord et sud), seuil, fondations, niche des portes |
| img399 | Coupe du mur nord, mur de garde du déversoir, plan des 15 pertuis et des piliers |
| img421 | Fosse du déversoir et ses fondations |
| img420 | Portes et busc |
| img426 | Plan du déversoir et du mur nord de l'écluse, avec échelle (0-5-10 pi), et photo du déversoir |
| img423 | Élévation « vue de l'ouest »: le terrain monte au nord du déversoir et descend au sud de l'écluse |
| img380 à img385 | Guide n° 2: plan et vues 3D, avec les profondeurs |
| img400 | Plan général de 1926 (International Rapids Section), au 1:54 023, avec courbes de niveau |

## Ce qu'ils apportent au modèle

### Profondeurs mesurées (eau d'aujourd'hui)

| Élément | Profondeur | Source |
| --- | --- | --- |
| Dessus des murs de l'écluse | 40 pi (12,2 m) | guide n° 2 (img379, img383) |
| Bout nord du déversoir | 40 pi | plongée n° 80, 18 juin 1989 (img398) |
| Dessus de béton des caissons d'approche | 25 pi | plongée du 18 juin 1989 (img401) |
| Base des caissons d'approche | 60 pi | img401 |
| Plancher de bois du sas | 60 pi (18,3 m) | guide n° 2 (img380, img383) |

Le modèle met maintenant le fond du canal à **60 pi** (`src\data\site.ts`, avant: 55 pi), comme le sas et le pied
des caissons selon SOS. La rivière, au sud de la digue, descend plus bas: le terrain y va jusqu'à 70 pi.

### Avant l'ennoiement

| Élément | Valeur | Source |
| --- | --- | --- |
| Eau sur le seuil | 14 pi | img397, img412, img419, img385 |
| Profondeur du canal | 16 pi | coupe A-A (img413) |
| Montée de l'eau en 1958 | environ 30 pi, chiffre approximatif d'un scénario | img265 |

### Le sas et ses murs

- **Sas:** 270 pi entre les portes, 45 pi entre les murs (82,3 m × 13,7 m). Écluse de garde: pas de différence de
  niveau entre l'amont et l'aval (img412).
- **Mur nord de l'écluse** (img419): 10 pi 8 po de large en haut, 14 pi à la base, 21 pi 6 po de haut. Couronnement
  de 15 po d'épaisseur.
- **Mur sud** (img419): 4 pi en haut, 8 pi 6 po à la base. L'écart avec le mur nord est étonnant: ce pourrait être
  une erreur d'étiquette, à vérifier dans les archives.
- **Hauteurs:**
  - le couronnement est à 14 pi 3 po au-dessus du seuil;
  - le mur descend encore de 7 pi 3 po sous le seuil jusqu'aux fondations;
  - les murs dépassent donc le seuil d'environ 4,3 m.
- **Fondations:** madriers de 3 po sur des pièces de pin de 12 po, posées sur 9 po de béton. Le plancher du sas est
  fait de deux rangs de madriers de pin (img395).
- **Niches des portes:**
  - « 10 pi au fond », 2 pi 9 po de recul;
  - chardonnet (« hollow quoin ») de 8 po de rayon;
  - plaques de roulement des portes encastrées dans le plancher, sur un rayon de 24 pi.
- **Maçonnerie:**
  - pierre de taille, assises d'au moins 9 po;
  - deux rainures à poutrelles, à 3 pi l'une de l'autre, de 12 po de large et 4 po de profondeur;
  - huit puits à chaîne de 2 pi de côté.

### Les portes (img420)

- Deux paires de portes en chêne blanc, bordées de pin blanc, avec une passerelle et une rampe.
- Trois vannes par porte, de 2 pi 6 po × 5 pi.
- Busc à bras de 49 pi.
- Manœuvre: chaînes, huit « crabes » (deux par porte) sur des puits à chaîne, cabestans; treuils installés en 1905.

### Le déversoir (au nord du sas, à son bout amont)

- **Disposition:**
  - perpendiculaire à l'écluse;
  - au nord, le mur nord du déversoir longe le pied du talus;
  - des **escaliers de pierre** montent au talus depuis ses deux bouts;
  - une passerelle de béton relie le mur nord du déversoir au mur nord de l'écluse.
- **Largeur:**
  - 105 pi du mur nord de l'écluse au mur nord du déversoir (23 octobre 1989), 110 pi (15 novembre 1989);
  - 120 pi de largeur hors tout (img398).
- **Pertuis:**
  - 15 pertuis de 4 pi de côté;
  - « 4 piliers, 5 travées » sur le croquis (img399), « cinq piliers » sur le plan et dans le livre (img397, img426);
  - vannes levées par une vis de 2¼ po et un volant;
  - un moteur sur la passerelle.
- **Fosse:** 130 pi × 47 pi, 7 pi 3 po sous le seuil, fondée sur du bois et des palplanches (img421).

### Les rives et le canal (img413): pour le terrain

- **Canal:** 110 pi de large, 16 pi de profondeur. La coupe A-A met le canal entre un talus déblayé au nord et une
  digue au sud, avec la **rivière plus bas** derrière la digue.
- **Talus nord:**
  - 16 pi de haut (4,9 m);
  - pente de 1½ pour 1 (environ 34°) en haut, puis de 2 pour 1 (environ 27°) en bas.
- **Talus sud:** pente de 2½ pour 1 (environ 22°).
- **Enrochement:**
  - couches de blocs de 2 pi 6 po et 3 pi;
  - à partir de 18 po sous la ligne d'eau;
  - le livre parle aussi de la construction de l'enrochement du canal (img256).
- **Chenal temporaire:** un chenal de 60 pi creusé au sud pendant la construction de l'écluse.
- **Au sud du sas** (img397, guide n° 2):
  - une bande plate au niveau du dessus des murs, avec l'allée de béton, 9 ou 10 bollards, la maison de
    l'éclusier, la maison du treuil et des marches à l'est;
  - puis le terrain descend (élévation img423).
- **Murs en aile:** évasés vers la rive aux deux bouts du mur sud, celui du sud-ouest très incliné.

### Les caissons d'approche (img401, img403, img404)

- Trois caissons de bois remplis de pierres, en amont de l'écluse: environ neuf rangs de pièces de bois.
- Dessus de béton à 25 pi, base à 60 pi.
- Autour: une chaîne, des pierres, un pieu, un chariot de pierres et de bois.
- Un caisson aussi au pied du bout du mur (img404).

### Orientation et courant

- Nord en haut sur le plan img397 et sur la vue 3D du guide. L'île Macdonell est au nord, de l'autre côté de l'eau.
- Courant d'ouest en est, de 2 à 3 nœuds, du déversoir (amont, ouest) vers les puits à chaîne (aval, est).
- L'écluse longe la rive sud; on l'atteint par le déversoir. Entrée et sortie depuis la rive de l'île Macdonell, en
  suivant les cordes. Visibilité de 8 à 12 pi.

### Sur le fond

Débris notés (img395, img397, img401, img422):

- moellons, bouteilles rouillées, chaînes, pierres;
- une estacade, des souches peut-être;
- un tas de pierres et de bois au bout est du mur nord;
- des pierres taillées au large du bout amont;
- les restes d'un escalier de bois sur le talus.

**Aucun document ne parle de limon ni de moules zébrées.**

### Les autres détails à modéliser un jour

- **Mur nord:** rampe de fer, poteaux d'amarrage, une rampe brisée.
- **Bouts de mur:** nez arrondi en pierre de taille, escalier de pierre, couvercle rond de puits à chaîne, petit
  bollard (img429).
- **Plaque sous-marine** au bout du déversoir, côté écluse.

## Ce qui reste à vérifier dans le modèle

- **La hauteur des talus.**
  - Avant l'ennoiement, le talus nord du canal faisait 16 pi, et les murs dépassaient le seuil d'environ 14 pi.
  - Dans le modèle, le talus nord monte de 8 m au-dessus du fond.
  - Le talus nord derrière le déversoir est peut-être plus haut que celui du canal (img423), mais aucune cote n'est
    donnée.
- **Les pentes.**
  - Les documents donnent environ 34° puis 27° au nord, 22° au sud.
  - Le modèle prend 35° (l'angle de la zone 7), et 32° à 40° au sud.
- **La profondeur.** Réglée: le fond du canal est à 60 pi, comme le sas et le pied des caissons selon SOS. Les 70 pi
  du lit de la rivière, au sud, ne sont ni confirmés ni contredits par les documents.
- **Les dimensions du sas** dans la maquette: à comparer avec 270 pi × 45 pi.
- **L'épaisseur des murs:** le mur nord à 10 pi 8 po en haut et le mur sud à 4 pi (img419), à vérifier.
- **Les sources d'origine:**
  - Le livre de Dickinson Landing, p. 217, en face de la page 216 (img256), donnerait la largeur du canal au fond et
    en surface.
  - Les plans d'origine sont aux Archives nationales: RG 43, volume 2496, « Construction of Entrance to canal — Weir
    and Lock »; aides à la recherche 29, 32 et 43; contrats, volumes 2478-2479 et 2486-2504 (img406, img408).

## Histoire

| Date | Événement | Source |
| --- | --- | --- |
| 1779-1783 | Premier canal, entre le lac Saint-Louis et le lac Saint-François | img260, img410 |
| 1834-1843 | Canal de Cornwall, 11 milles, pour contourner les rapides du Long Sault. Écluses de 200 × 45 pi, 9 pi d'eau sur les seuils | img256, img410 |
| 1876-1904 | Agrandissement: écluses de 270 × 45 pi, 14 pi sur les seuils, pour les bateaux de 14 pi de tirant d'eau | img256, img410, img412 |
| 17 novembre 1883 | Devis signé à Ottawa | img409 |
| 7 avril 1884 | Soumissions | img409 |
| 1er novembre 1884 | Chenal temporaire terminé | img409 |
| 1er avril 1885 | Fosse de l'écluse à sec | img409 |
| 20 septembre 1885 | Maçonnerie de l'écluse terminée | img409, img412 |
| Fin de la navigation 1885 | Batardeaux autour de la fosse du déversoir | img409 |
| 10 avril 1886 | Portes en place | img409 |
| 20 avril au 1er juin 1886 | Construction du déversoir; ouvrage complet. Contrat de 390 000 $ (dépôt de 19 500 $, 5 %) | img409, img412 |
| Jusqu'en 1936 | Exploitée par le ministère des Chemins de fer et Canaux | img385 |
| 1904-1957 | Liste des éclusiers de l'écluse n° 21 à Dickinson Landing | img256 |
| 1905 | Treuils installés | img410, img412 |
| 16 novembre 1926 | Plan du Joint Board of Engineers pour la Voie maritime | img400 |
| 1er mai 1930 | Journée de 8 heures, un maître éclusier par quart (avant: 12 heures) | img256 |
| 1936-1958 | Exploitée par le ministère des Transports | img385 |
| Début de l'été 1957 | Batardeau d'enrochement et chenal de dérivation dans le chenal de l'île du Long Sault | img426 |
| Avant l'ennoiement | Arbres coupés; maison de l'éclusier et guérite brûlées; poteaux et estacades coupés; portes retirées (« floated out later »); machinerie et escalier enlevés | img425 |
| 1er juillet 1958 | Écluse 21 noyée par le barrage Robert H. Saunders (167 pi de haut, 3 300 pi de long). Dickinson Landing est noyé, ses habitants déplacés à Long Sault et à Ingleside | img412, img258 |
| 21 et 27 septembre 1988 | Plan et notes historiques de Nick Baets | img397, img410 |
| 30 mars 1989 | Lettre de la Lost Villages Historical Society à Nick Baets, pour le film | img254 |
| 18 juin 1989 | Plongées de SOS: n° 80 au bout nord du déversoir (W. M. Baets, 40 pi, 31 min); caissons d'approche (Fidel et Dave Astles, 25 à 60 pi) | img398, img401 |
| Octobre à décembre 1989 | Guide de terrain n° 2: dessin du 23 octobre, plan révisé le 15 novembre, épreuves approuvées le 29 novembre, 250 cartes livrées le 6 décembre | img376 à img385 |

## Textes à reprendre pour le site

Avec mention de la source, en vérifiant les droits (© S.O.S. 1989 pour le guide):

- Livre, p. 216 (img256): « Built to overcome the Long Sault Rapids, it extended from the City of Cornwall to the
  Village of Dickinson Landing and was eleven miles in length. »
- Guide n° 2 (img385): « Guard Lock 21 … 270 feet long between the gates, 45 feet wide », « 14 feet clearance over
  the sill ».
- Guide n° 2, verso (img379, img383): « Upper work lies at 40 feet with the lock bottom at 60 feet. » « Prepare for
  a strong current (2 to 3 knots). »
- Plaque proposée (img403): « Preserve Ontario marine heritage. Take nothing but pictures, leave nothing but
  bubbles. »
- But du film (img265): « Inform the diving community at large of a part of Canadian history and what is left of
  it to see for divers only »: un précédent pour lock21.info.

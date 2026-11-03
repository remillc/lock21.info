# Style-guide : la voix du carnet de l'écluse 21

Approuvé par Christian le 2026-11-03. Le carnet est écrit comme des notes de travail : impersonnel, court, concret, chaque affirmation appuyée par une mesure, une date ou un fichier.

Ce guide décrit les 20 pages françaises du site écrites avant le travail avec l'IA (commit `a6f3af6`, `i18n/fr/docusaurus-plugin-content-docs/current/`). Il sert à écrire les pages du site. La typographie et les termes convenus depuis le 2026-10-26 (`SKILL.md`) ont priorité sur l'usage ancien : les exemples ci-dessous sont cités sans leurs coquilles.

## La voix

La forme suit ce que dit la phrase. Le « je » reste rare : 6 fois dans le texte courant, contre 17 « on » et 12 passifs.

| Ce que dit la phrase | Forme | Exemple tiré des pages |
| --- | --- | --- |
| Une consigne, une étape | Infinitif | « Mesurer, en centimètres, les distances entre les lampes du rig » |
| Ce qui a été fait | Passé passif | « La caméra a été réglée de façon à limiter le plus possible les traitements post-capture » |
| Une possibilité, une règle | « on peut », « on doit » | « On doit donc utiliser le paramètre `Low` » |
| Une hypothèse | « on » | « On présume que l'effet banane vient de la déformation des images » |
| Un constat | Présent, sujet concret | « Le test effectué sur une surface plane de 100 pieds de long montre que le modèle […] est déformé. » |
| Une définition d'étape | « Cette étape permet de » | « Cette étape permet de normaliser les blancs et la luminosité à travers les photos. » |
| Un choix ou un test personnel | « je », seulement ici | « J'ai choisi de viser un chevauchement frontal et latéral de 85 %. » |

- Le « je » n'exprime jamais un sentiment ni un récit : il sert à assumer une décision ou à dater un essai (« J'ai fait un test (2024-06-08) »). Il ne s'écrit que pour ce que Christian a dit ou fait : ne jamais inventer son expérience.
- Le lecteur n'est presque jamais interpellé. « Consultez » et « Nommez » apparaissent une fois chacun : préférer l'infinitif.
- Un ton plus libre arrive rarement, et il tranche : « Bref, vaut mieux tester la solution 1 […] d'abord! ». Une seule fois dans les 20 pages : c'est une exception permise, pages publiques comprises, pas un procédé.

## La structure d'une page

Chaque type de page a son ossature, et la page va droit au sujet, sans introduction ni conclusion de politesse.

| Type de page | Ouverture | Suite |
| --- | --- | --- |
| Problème | Le constat, en une phrase, puis les questions : « D'où vient cette déformation ? Comment la corriger ? » | Hypothèse, solutions envisagées, test effectué, analyse, données, conclusion |
| Test | Ce qui a été fait et pourquoi : « Vidéos […] prises à 2 profondeurs différentes afin de déterminer si… » | Tableau des séries ou des fichiers, puis le verdict |
| Étape du traitement | Une phrase de définition : « Cette opération consiste à… » | Sections par sous-tâche, étapes numérotées, menus cités |
| Description de zone | Un groupe nominal : « Enclave au sud de la zone 1. » | « Comprend : » avec une liste, puis « Exclut… » |
| Note du journal | Style télégraphique : « Scan du plancher de la zone 2. » « Scan » dans les notes, « relevé » dans la colonne Activité. | Zone par zone, mesures incluses. Le point-virgule y est permis (« Scan zone 18; ») |

- Les questions sont vraies. Elles ouvrent une recherche et le texte y répond ensuite : « Qu'est-ce que change ce paramètre ? ».
- La conclusion est une consigne d'une ligne : « Sous-exposer la prise de vue de -1 stop lors du calibrage des couleurs. » ou « -> Régler ce paramètre à `Low` ».
- Le verdict est dit sans détour : « -1 stop est le bon facteur. », « C'est le modèle métallique vert qui fonctionne bien. »
- Le résultat chiffré ressort, sur une ligne seule, le chiffre en gras : « Vitesse estimée : **35 pieds/minute** (10,7 mètres/minute) ».
- Les listes servent aux éléments vraiment parallèles : étapes, facteurs, options, sans étiquette en gras.
- Les tableaux portent les mesures : séries, fichiers, valeurs. Le texte ne les répète pas.

## La précision et le vocabulaire

Une affirmation vient avec ce qui permet de la vérifier.

- Les dates sont ISO, au plus près du fait : « (2024-06-08) », « la plongée no. 35 (2024-08-09) ».
- Le calcul est montré : « 125 cm mesuré + 1,5 cm, soit la demi-largeur du cercle noir de la cible […] = 126,5 cm ».
- La méthode de mesure est dite : « La distance de 100 pieds a été mesurée à l'aide d'un ruban à mesurer. »
- Les équivalents sont entre parenthèses : « 50 pieds (15,24 mètres) ».
- Le matériel a son nom exact : « Un scooter Seacraft Future 1000 », « GoPro Hero 6 Black ».
- Les fichiers et les menus sont cités tels quels, en code : `data/2024-05-18/raw-frames-n8/échelle-1`, `Workflow` > `Batch Process...`
- Les sources sont nommées : dans la légende (« Source : »), ou par un lien sur le fait lui-même.
- Les conséquences pratiques sont dites : « Ceci pour réduire le temps alloué au filmage. »

Les tournures qui reviennent :

| Tournure | Usage | Exemple |
| --- | --- | --- |
| « soit » (13 fois) | Préciser, donner la valeur | « soit environ 60 cm », « soit celui qui désactive le traitement » |
| « donc » (7) | Tirer la conséquence | « On pourra donc les modifier si besoin est. » |
| « afin de » (4) | Donner le but | « afin d'assurer une vitesse constante » |
| « puisque » (3) | Donner la cause en tête | « Puisque la longueur focale de la lentille varie en fonction du milieu, le test doit se faire sous l'eau. » |
| « cependant » (2) | Nuancer | « On peut cependant régler un intervalle » |
| « de façon à » (2), « l'idée étant de » (1) | Expliquer un réglage | « l'idée étant de désactiver […] les traitements » |
| « À noter que », « Pour référence », « Règle du pouce » | Ajouter un repère | « Pour référence, j'utilise souvent 50 pieds/minute » |

Les termes anglais restent quand ils sont le mot du métier ou de l'interface, en italique et souvent expliqués une fois : « (_overlap_) », « les évacuateurs d'eau (_sluice gates_) », « le _hardware_ ». Les noms de menus ne sont pas traduits.

Ce qui n'apparaît jamais : adjectifs de valeur, formules d'importance, annonces (« cette section explique »), résumé final, adresse chaleureuse au lecteur. L'émotion passe par le fait : « d'une échelle dont j'ai oublié de noter la longueur ! ».

## La longueur

Les phrases sont courtes et les paragraphes aussi : la moitié des phrases font 8 mots ou moins.

| Mesure sur le texte courant (3 368 mots, tableaux et titres exclus) | Médiane | 90 % sous | Maximum |
| --- | --- | --- | --- |
| Mots par phrase (307 phrases) | 8 | 22 | 59 |
| Mots par paragraphe (127 paragraphes) | 11 | 43 | |

- À viser : une phrase de moins de 25 mots, un paragraphe de une à trois phrases.
- Les listes pèsent autant que les paragraphes : 128 éléments de liste pour 127 paragraphes.
- Les longues phrases existent, pour décrire un montage ou un test. Elles restent l'exception.

Ces mesures comptent aussi des fragments courts, et le découpage aux deux-points raccourcit un peu la médiane : ce sont des ordres de grandeur.

## Ce que ses corrections montrent

Ses commentaires du 2026-11-03 sur « Publication du modèle » : à compléter à chaque relecture, l'avant et l'après, avec la raison.

| Avant | Après (Christian) | Ce que ça dit |
| --- | --- | --- |
| Un paragraphe qui commence sans annoncer son sujet | Un titre : « La problématique » | Une section nomme son rôle |
| « … un navigateur : la zone 12 compte… » | « … un navigateur. Par exemple, la zone 12 compte… » | Un exemple ne suit pas un deux-points : deux phrases, « Par exemple, » (il l'a corrigé deux fois) |
| « La publication en fait des tuiles » | « Afin de contourner ce problème, la publication en fait des tuiles » | Le lien logique est écrit |
| « plus ou moins détaillées selon la distance » | Expliquer : plus de détails de près, moins de loin, ce qui économise les ressources du navigateur et garde la navigation fluide | Dire le mécanisme et sa raison, pas seulement le fait |
| « garde une empreinte de son état […] et la commande compare » | « trop vague, abstrait » | Pas d'image ni de terme non présenté : dire ce qui se passe concrètement |
| « Le résultat se contrôle d'abord dans le visualiseur » | « Après une étape de validation locale… » | Le mot juste du travail, dans une seule phrase |
| « les tuiles partent sur le serveur » | « les tuiles sont téléchargées sur le serveur » | Le terme exact, pas de verbe imagé |
| « Les téléchargements de la page » | « Les fichiers à télédécharger situés sur la page » | Nommer la chose (des fichiers) |

## À ne pas imiter, et les limites

Ces pages sont des brouillons de travail : leurs accidents ne font pas partie du style.

- Les coquilles et les accords : « bananne » pour « banane », « j'ai choisis », « Comprends : », « Exclue », « champs de vision ».
- Les notes à soi-même et les restes : « awef », « [TODO: …] », « [ICI INSÉRER…] », les phrases coupées.
- La typographie ancienne, remplacée par la règle du 2026-10-26 : « 60cm », « Comment améliorer? », le point décimal.
- Les termes remplacés depuis : « dense cloud » par « nuage de points dense », « frames » par « images ».

Le point-virgule reste interdit dans les pages, sauf dans les notes du journal et à la fin des éléments d'une liste de Christian (2026-10-27), qu'on ne retire pas.

Ce que l'échantillon ne dit pas :

- Le texte public : rien ici ne ressemble à l'accueil ou à « À propos », qui s'adressent à des visiteurs. Ces textes-là se cadrent avec lui.
- Les pages terminées : plusieurs sont à peine commencées, et beaucoup de sections « Conclusions » sont vides.
- L'anglais : une seule page anglaise existait, le style anglais reste une traduction du français.

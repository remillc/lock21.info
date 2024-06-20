# Netteté des images

Les premières prises de vues avec la caméra GoPro Hero 6 Black montrent des images capturées en mouvement qui sont floues et manquent de détails.

awef

Le dense cloud et le mesh générés n'ont pas la précision qu'on peut s'attendre avec des images 400px x 300px prises à environ 60cm de distance soit une taille de 0,33 mm2 par pixel. Comment améliorer?

La qualité des données collectés (pixels) dépend de plusieurs facteurs:

1. Les caractéristiques de la caméra (le _hardware_)
2. Le milieu
3. L'éclairage
4. Les paramètres de la prise d'images

### Les caractéristiques de la caméra (le _hardware_)

La lentille, le capteur photosensible et le format d'encodage sont autant de caractéristiques qui influencent la qualité des pixels récoltés. Le sujet est vaste et dépasse nettement le cadre de cette documentation.

#### Réglages

La caméra a été réglée de façon à limiter le plus possible les traitements post-capture, l'idée étant de désactiver/réduire le plus possible les traitements effectués par le logiciel de la caméra afin d'obtenir des données captées par le capteur le plus brut possible.

Il y a cependant un point

Consultez la [liste complète des paramètres utilisés](../../collecte/materiel-utilise.md#camera).

### Éclairage

### Paramètres de la prise d'images

## Solutions à explorer

1. Diminuer la vitesse de déplacement lors des prises de vues
2. Augmenter la vitesse d'obturation de la caméra

### Diminuer la vitesse de déplacement

Réduite la vitesse de déplacement sous l'eau implique un plus long temps de plongée, donc une consommation accrue du mélange de gas et s'approcher d'avantage de la limite de non-décompression. Ça implique aussi une diminution de la surface couverte et une augmentation de la taille des données collectées résultant dans une augmentation du nombre de plongées nécessaires et de plus longs temps de traitement des données et un espace de stockage plus grand. Bref, vaut mieux tester la solution 1 - Augmenter la vitesse d'obturation d'abord!

### Augmenter la vitesse d'obturation

Il existe 3 possibilité techniques pour augmenter la vitesse d'obturation dans une GoPro:

1. Régler le paramètre de netteté à `Élevé`
2. Fixer manuellement la vitesse d'obturation
3. Augmenter la sensibilité minimale ISO de la caméra

Les tests qui suivent couvrent ces 3 cas de figure.

## Le paramètre de netteté de l'image

Qu'est-ce que change ce paramètre?

[afficher un slider de 2 images]

Il s'agit d'un traitement logiciel, donc qui affecte la qualité des données récoltées. On doit donc utiliser le paramètre `Low`, soit celui qui désactive le traitement.

### Conclusion

-> Régler ce paramètre à `Low`

## Varier la vitesse d'obturation

Quelle est la vitesse d'obturation utilisée par la caméra GoPro Hero 6 Black? Est-elle lente? L'éclairage permet-il d'augmenter la vitesse?

Les fichiers vidéos générés par la GoPro ne contiennent pas l'information concernant la vitesse d'obturation utilisée. Pour la connaître,

### Test effectué

Réaliser un scan d'une bande horizontale de 100 pieds de long à raison de 4 passages, en variant la vitesse d'obturation:

1. Vitesse automatique
2. 1/120e de seconde
3. 1/240e seconde

### Analyse

Extraire un nombre égal de frames pour chaque passage et lancer les tests suivants dans Metashape:

### Conclusions

## Augmenter la sensibilité ISO minimum

Il n'est pas possible de régler manuellement la sensibilité de la caméra [(le numéro ISO](https://www.adobe.com/ca_fr/creativecloud/photography/discover/iso.html)) en mode vidéo. On peut cependant régler un intervalle via une valeur minimum et une maximum. Les valeurs pour la caméra utilisée, soit la GoPro Hero6 Black sont respectivement de 100 ISO et 6400 ISO.

Puisque le calcul de l'exposition est automatique dans la GoPro, on peut forcer celle-ci à adopter une vitesse d'obturation plus grande en augmentant la sensibilité minimale, soit l'ISO minimum (l'autre paramètre de l'équation étant fixe, soit l'ouverture de la lentille).

### Test effectué

Le test consistait à filmer une portion du plancher de bois situé en aval des évacuateurs d'eau (_sluice gates_) sur une distance de 50 pieds (15,24 mètres) à une vitesse constante en ne variant que l'ISO minimum d'un passage à l'autre.

Un scooter Seacraft Future 1000 a été utilisé à la vitesse 1, soit une vitesse mesurée dans les vidéos de 1,2 pied/seconde (0,37 m/s) afin d'assurer une vitesse constante. Pour référence, j'utilise souvent 50 pieds/minute (15,2 m/s), soit 0,8 pied/seconde (0,25 m/s), comme vitesse de déplacement à la palme dans des conditions sans courant comme vitesse de référence. Le scooter à la vitesse 1, dans les conditions du test, se déplaçait donc 1.5 fois plus vite qu'à la palme. À noter que les vitesse sur ce modèle de scooter sont programmables. On pourra donc les modifier si besoin est.

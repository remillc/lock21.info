# Netteté des images

Les premières prises de vues avec la caméra GoPro Hero 6 Black montrent des images capturées en mouvement qui sont floues et manquent de détails. Le dense cloud et le mesh générés n'ont pas la précision qu'on peut s'attendre avec des images 400px x 300px prises à environ 60cm de distance soit une taille de 0,33 mm2 par pixel. Comment améliorer?

La qualité des données collectés (pixels) dépend de plusieurs facteurs:

1. Les caractéristiques de la caméra (le _hardware_)
2. Le milieu
3. L'éclairage
4. Les paramètres de la prise d'images

### Les caractéristiques de la caméra (le _hardware_)

La lentille, le capteur photosensible et le format d'encodage sont autant de caractéristiques qui influencent la qualité des pixels récoltés. Le sujet est vaste et dépasse nettement le cadre de cette documentation.

#### Réglages de la caméra

La caméra a été réglée de façon à limiter le plus possible les traitements post-capture, l'idée étant de capturer le plus possible des données bruts, non traitées.

Il y a cependant un point

Consultez la [liste complète des paramètres utilisés](../collecte/materiel-utilise.md).

## Solutions à explorer

1. Augmenter la vitesse d'obturation de la caméra
2. Réduire la vitesse de déplacement lors des prises de vues

## Tests à faire

### Variation de la vitesse d'obturation

Quelle est la vitesse d'obturation utilisée par la caméra GoPro Hero 6 Black? Est-elle lente? L'éclairage permet-il d'augmenter la vitesse?

Les fichiers vidéos générés par la GoPro ne contiennent pas l'information concernant la vitesse d'obturation utilisée. Pour la connaître,

1. Réaliser un scan d'une bande horizontale de 100 pieds de long à raison de 4 passages
2. Répéter le scan avec une vitesse d'obturation fixée à 1/120e de seconde
3. Répéter le scan à 1/240e seconde

#### Analyse

Extraire un nombre égal de frames pour chaque passage et lancer les tests suivants dans Metashape:

#### Conclusions

# FPE score
[NodeJs]small software designed to count store and manage point on climbing contest.

## ![flag](res/fr.jpg) [Documentation](https://github.com/ox223252/FPE-score/wiki) :

## Warning:
last version configuration not compatible with v1.0 configuration

## TODO :
 - [x] ajout dynamique des participants
 - [x] ajout des résultats pour une voie
   - [x] pour la diff
   - [x] pour le bloc
   - [x] pour la vitesse
   - [x] pour la slack
   - [x] essais multiples
   - [x] implémenter les règles de calculs officiels FFME
      - [x] bloc : classement top/nbTest/zone/nbTest
      - [x] diff : ![equation](https://latex.codecogs.com/svg.latex?\Large&space;rank=\sqrt{rank_{1}^2%20+%20rank_{2}^2%20+%20\dots%20+%20rank_{n}^2})
      - [x] vitesse : par temps
        - [ ] ajouter un module automatisaé pour la prise des temps
 - [x] login sécurisé pour le staff
   - [x] génération automatique d'une clé RSA (différente à chaque démarrage du serveur)
 - [x] affichage du tableau des résultats
   - [x] ordonnancement par rang
   - [x] affichage d'une courbe
   - [x] sélection par club/genre/age
   - [x] ordonnancement par résultat pour une voie
   - [x] affichage temps réel
 - [x] ajout de statistique de participation
 - [x] ajout d'un mode sombre/lumineux
 - [ ] modifier le CSS, pour le rendre cohérent
 - [ ] retravailler le *HTML* pour le rendre cohérent
 - [ ] ajouter un mode pour avoir le start/stop des voies de vitesse automatique
 - [x] ordonnancement des joueurs par ordre alphabétique dans les listes déroulantes

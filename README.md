# FPE score
[NodeJs]small software designed to count store and manage point on climbing contest.

## ![flag](res/fr.jpg) [Documentation](https://github.com/ox223252/FPE-score/wiki) :

## Warning:
last version configuration not compatible with v1.0 configuration

## TODO :
 - [x] ajout dynamique des participants
 - [x] ajout dynamique des voies (avec photo et commentaire)
 - [x] ajout des résultats pour une voie
   - [x] pour la diff
   - [x] pour le bloc
   - [ ] pour la vitesse
   - [ ] pour la slack
   - [x] essais multiples
   - [x] implémenter les règles de calculs officiels FFME
      - [x] bloc : classement top/nbTest/zone/nbTest ( top/nb zone/nb echec )
      - [x] diff : ![equation](https://latex.codecogs.com/svg.latex?\Large&space;rank=\sqrt{rank_{1}^2%20+%20rank_{2}^2%20+%20\dots%20+%20rank_{n}^2})
      - [ ] vitesse : par temps
        - [ ] ajouter un module automatisaé pour la prise des temps
 - [x] login sécurisé
   - [x] connexion par hhtps
   - [x] génération automatique d'un certificat si non present
   - [x] pour le staf
     - [x] gestion des droits utilisateur differentiés
     - [x] juge : (ajouts de resultats sur une voie)
     - [x] editeur : peut ajouter des competiteur et des voies (uniquement hors periode competition) + juge
     - [x] admin : peu démarer la competitiopn pour un temps defini, modifier les voies et participants durant la competition, peut arreter le systeme (meme durant la competition) + editeur
 - [x] affichage du tableau des résultats
   - [x] ordonnancement par rang
   - [ ] affichage d'une courbe
   - [x] sélection par club/genre/age
   - [ ] ordonnancement par résultat pour une voie
   - [x] affichage temps réel
 - [ ] ajout de statistique de participation
 - [x] ajout d'un mode sombre/lumineux ( gestion auto selon configuration du navigateur)
 - [ ] modifier le CSS, pour le rendre cohérent
 - [ ] retravailler le *HTML* pour le rendre cohérent
 - [ ] ajouter un mode pour avoir le start/stop des voies de vitesse automatique
 - [x] ajout d'un start / stop plus chrono pour la competition globale
 - [x] ordonnancement des joueurs par ordre alphabétique dans les listes déroulantes


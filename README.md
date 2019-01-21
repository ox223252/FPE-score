# FPE score
[NodeJs]small software designed to count store and manage point on climbing contest.

[!flag](res/fr.jpg)
## TODO  :
 - [x] ajout dynamique des participants
 - [x] ajout des résultats pour une voie
   - [x] pour la diff
   - [x] pour le bloc
   - [x] pour la vitesse
   - [x] pour la slack
   - [x] essais multiples
   - [ ] implémenter les règles de calculs officiels FFME
 - [x] login sécurisé pour le staf
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
 - [ ] ajouter un mode pour avoir le start/stop des voies de vitesse automatique

## Note :
Le mot de passe par défaut est `test` pour l'utilisateur `fpe` pensez à le changer

Pour ajouter un utilisateur, il faut éditer le fichier `private/login.json` qui doit ressembler au fichier ci dessous, rajouter un objet [JSON](https://jsoneditoronline.org/) contenant le [`sha512`](https://hash.online-convert.com/sha512-generator) du mot de passe.

```JSON
{
	"fpe":
	{
		"pass":"ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff",
		"error":0
	}
}
```

Les liens fournis servent à :
 - valider le JSON avant de le sauvegarder,
 - convertir un mot de passe en sa version sha512, une fois converti sauvegardez les : `hex`,

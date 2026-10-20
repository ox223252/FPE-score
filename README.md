# nodeBase

Base de départ pour les outils web internes : un serveur **Node.js / Express** avec authentification (fichier local, comptes Linux ou Active Directory), sessions, jeton « se souvenir de moi », temps réel via **Socket.io** et une console d'administration.

## Prérequis

- **Node.js 22** ou plus récent
- `openssl` (génération automatique du certificat en mode HTTPS)
- Mode Linux uniquement : `pamtester` (`sudo apt install pamtester`)

## Installation

```bash
npm install            # poste de développement
npm ci --omit=dev      # serveur : versions exactes du package-lock.json, sans outils de développement
```

## Lancement

```bash
npm start              # lance le serveur ( options définies dans le script "start" de package.json )
npm run dev            # idem, avec redémarrage automatique quand src/ ou index.js changent
```

Ou directement :

```bash
node index.js --server.port 8443 --login.mode file
node index.js --help   # liste complète des options
```

Le serveur peut être lancé depuis n'importe quel dossier : les chemins ( `--server.tls.path`, `--login.file` ) sont résolus par rapport au dossier du projet. Seul le fichier `.env` est cherché dans le dossier courant.

## Options principales

| Option | Défaut | Description |
|---|---|---|
| `--server.port` | 443 ( https ) / 80 ( http ) | port d'écoute |
| `--server.secure` | `true` | `true` = HTTPS, `false` = HTTP ( `--no-server.secure` ) |
| `--server.tls.path` | `private` | dossier de la clé et du certificat |
| `--server.tls.key` / `--server.tls.cert` | `key.pem` / `certificate.pem` | noms des fichiers clé / certificat |
| `--server.tls.size` | `4096` | taille de la clé RSA générée |
| `--login.mode` | `file` | `file`, `linux` ou `ad` |
| `--login.tokenDuration` | `30` | durée de validité des jetons « se souvenir de moi », en jours |
| `--login.maxAttempts` | `10` | tentatives de connexion par IP avant blocage |
| `--login.lockMinutes` | `15` | durée de la fenêtre / du blocage, en minutes |

En mode HTTPS, si la clé ou le certificat n'existent pas, un **certificat auto-signé** est généré au premier démarrage dans `private/` ( option `--server.tls.path` ). Pour la production, remplacer ces fichiers par un vrai certificat.

## Variables d'environnement

Toute option de la ligne de commande peut aussi être passée par une variable d'environnement préfixée par le nom de l'application en majuscules ( champ `name` de `package.json`, ici `NODEBASE_` ) :

- camelCase → mots séparés par `_` : `--login.tokenDuration` → `NODEBASE_LOGIN__TOKEN_DURATION`
- `.` ( option imbriquée ) → `__` : `--server.tls.path` → `NODEBASE_SERVER__TLS__PATH`

| Option | Variable |
|---|---|
| `--server.port` | `NODEBASE_SERVER__PORT` |
| `--server.secure` | `NODEBASE_SERVER__SECURE` |
| `--server.tls.path` | `NODEBASE_SERVER__TLS__PATH` |
| `--server.tls.size` | `NODEBASE_SERVER__TLS__SIZE` |
| `--login.mode` | `NODEBASE_LOGIN__MODE` |
| `--login.tokenDuration` | `NODEBASE_LOGIN__TOKEN_DURATION` |
| `--login.linux.pamService` | `NODEBASE_LOGIN__LINUX__PAM_SERVICE` |
| `--login.ad.url` | `NODEBASE_LOGIN__AD__URL` |
| `--login.ad.baseDN` | `NODEBASE_LOGIN__AD__BASE_DN` |
| `--login.ad.bind.user` | `NODEBASE_LOGIN__AD__BIND__USER` |
| `--login.ad.bind.password` | `NODEBASE_LOGIN__AD__BIND__PASSWORD` |

Priorité : **ligne de commande > environnement > valeur par défaut**.

```bash
NODEBASE_SERVER__PORT=8443 NODEBASE_LOGIN__MODE=ad node index.js
```

Les variables peuvent être regroupées dans un fichier `.env` ( ignoré par git ), chargé automatiquement au démarrage ( module `dotenv` ). Les variables déjà définies dans l'environnement restent prioritaires sur le fichier.

```bash
# .env
NODEBASE_SERVER__PORT=8443
NODEBASE_LOGIN__MODE=ad
NODEBASE_LOGIN__AD__BIND__PASSWORD='...'
```

> Le fichier `.env` est cherché dans le dossier courant au lancement.

## Modes de connexion

### Fichier ( `--login.mode file` )

Les utilisateurs sont stockés dans `private/userDB.js` ( option `--login.file` ).

- Mots de passe hachés avec **scrypt** et un sel par utilisateur.
- **Base vide : le premier utilisateur qui se connecte crée le premier compte** ( identifiant et mot de passe de son choix ). Lancer l'application et créer ce compte avant de l'ouvrir aux autres.
- Si le fichier existe mais est illisible ou corrompu, l'application **refuse de démarrer** ( aucune perte de comptes ).

```bash
node index.js --login.mode file
```

### Linux ( `--login.mode linux` )

Vérifie le mot de passe d'un compte du système via **PAM** ( `pamtester` ). Seuls les membres du groupe autorisé peuvent se connecter.

| Option | Défaut | Description |
|---|---|---|
| `--login.linux.group` | `loginForNodeApp` | groupe Linux autorisé |
| `--login.linux.pamService` | `login` | service PAM utilisé ( `/etc/pam.d/<service>` ) |

```bash
sudo node index.js --login.mode linux --login.linux.group webusers
```

- Doit tourner en **root** pour vérifier le mot de passe des autres comptes ( sinon PAM ne peut vérifier que celui du compte qui lance node ).
- Si le groupe n'existe pas et que le serveur tourne en root, il est créé au démarrage.
- Un utilisateur retiré du groupe perd l'accès immédiatement, y compris avec son jeton.
- Si root est le seul membre du groupe, root peut se connecter ( comportement voulu ).

### Active Directory ( `--login.mode ad` )

Vérifie le mot de passe auprès de l'AD, puis que l'utilisateur existe dans l'annuaire et appartient au groupe autorisé.

| Option | Description |
|---|---|
| `--login.ad.url` | **obligatoire**, ex. `ldaps://ad.domaine.fr:636` ( `ldap://` = mots de passe en clair sur le réseau ) |
| `--login.ad.baseDN` | **obligatoire**, base de recherche, ex. `DC=domaine,DC=fr` |
| `--login.ad.domain` | suffixe ajouté si l'utilisateur tape un nom court, ex. `@domaine.fr` |
| `--login.ad.group` | DN du groupe autorisé, ex. `CN=AppUsers,OU=Groupes,DC=domaine,DC=fr` ( sans groupe : tout l'annuaire peut se connecter ) |
| `--login.ad.recursive` | `true` par défaut : accepte aussi les membres des groupes imbriqués. `--no-login.ad.recursive` pour les membres directs seulement |
| `--login.ad.bind.user` | DN du compte de service ( optionnel ) |
| `--login.ad.bind.password` | mot de passe du compte de service ( optionnel, à passer de préférence par l'environnement ou le `.env` ) |

```bash
node index.js --login.mode ad \
  --login.ad.url ldaps://ad.domaine.fr:636 \
  --login.ad.baseDN "DC=domaine,DC=fr" \
  --login.ad.domain "@domaine.fr" \
  --login.ad.group "CN=AppUsers,OU=Groupes,DC=domaine,DC=fr"
```

**Compte de service** ( recommandé ) : avec `--login.ad.bind.user` et `--login.ad.bind.password`, l'application vérifie au démarrage que l'annuaire répond et que le groupe existe, et revérifie l'appartenance au groupe à chaque reconnexion par jeton.

```bash
NODEBASE_LOGIN__AD__BIND__PASSWORD='...' node index.js --login.mode ad ... \
  --login.ad.bind.user "CN=svc-nodebase,OU=Services,DC=domaine,DC=fr"
```

> Éviter `--login.ad.bind.password` en ligne de commande : le mot de passe serait visible dans `ps` et l'historique du shell.

Annuaire avec un certificat émis par une autorité interne : renseigner `tlsOptions: { ca: [ ... ] }` dans `UAd._client ( )` ( `src/db.user.js` ).

## Sécurité

- **Jeton « se souvenir de moi »** : aléatoire ( 256 bits ), seule son empreinte est stockée, expire après `--login.tokenDuration` jours, 10 jetons maximum par utilisateur ( un par poste ). Changer le mot de passe ( mode fichier ) révoque tous les jetons.
- **Déconnexion** : passer par `/login` révoque le jeton de la session.
- **Limite de tentatives** : au-delà de `--login.maxAttempts` échecs par IP, réponse 429 pendant `--login.lockMinutes` minutes.
- **Session** : cookie `httpOnly`, `secure` en HTTPS, `sameSite=lax`, nouvel identifiant de session à chaque connexion.
- **En-têtes** : helmet, CSP avec nonce, HSTS en HTTPS.
- **Fichiers sensibles** : `private/` est créé en `700`, la base utilisateurs en `600` et écrite de façon atomique. Ne jamais versionner `private/`.

## Console d'administration

Commandes à taper dans le terminal du serveur :

| Commande | Description |
|---|---|
| `help` | liste des commandes |
| `list users` | utilisateurs connectés et pages ouvertes |

## Arborescence

```
index.js              démarrage ( enchaîne les modules de src/ )
src/args.js           options de la ligne de commande
src/db.user.js        utilisateurs : modes fichier / Linux / AD, jetons, limite de tentatives
src/root.init.js      serveur HTTP(S), session, helmet, fichiers statiques
src/root.main.js      pages ( /, /login )
src/root.ajax.js      routes ajax ( /ajax/login )
src/ioSocket.js       Socket.io ( utilisateurs connectés )
src/cmd.js            console d'administration
views/                vues EJS ( utiliser <%= %> dans le HTML, <%- js ( valeur ) %> dans les scripts )
public/               CSS, images
private/              clé, certificat, base utilisateurs ( non versionné )
```

## Mise en production

- **Sessions en mémoire** : perdues au redémarrage ( les utilisateurs se reconnectent automatiquement avec leur jeton ). Pour plusieurs instances ou des sessions persistantes, prévoir un stockage de session dédié.
- **Derrière un reverse proxy** ( nginx… ) : ajouter `exp.set ( "trust proxy", 1 )` dans `src/root.init.js`, sinon toutes les requêtes semblent venir du proxy et la limite de tentatives bloque tout le monde.
- Remplacer le certificat auto-signé par un vrai certificat.
- Mode AD : utiliser `ldaps://`.

## Licence

ISC — voir [LICENSE](LICENSE).

import fs from 'fs'; // read / write files
import util from 'util';
import path from 'path';
import crypto from 'crypto'; // scrypt / sha256 / randomBytes
import childProcess from 'child_process';

import { Client, escapeFilter } from 'ldapts'; // Active Directory ( LDAP )

// execFile lance le programme directement, sans passer par un shell :
// les arguments ne sont jamais interprétés ( pas de ; | $( ) ` ... )
const execFile = util.promisify ( childProcess.execFile );
const scrypt = util.promisify ( crypto.scrypt );

// paramètres scrypt ( N = coût CPU / mémoire, ~16 Mo et ~50 ms par vérification )
const SCRYPT = { N: 16384, r: 8, p: 1, keyLen: 64 };

class LogLimit {
	constructor ( params )
	{
		this._params = params;

		this._max = Number ( this._params.maxAttempts ) || 10;
		this._window = ( Number ( this._params.lockMinutes ) || 15 ) * 60 * 1000;
		this.ips = new Map ( ); // ip -> { count, reset }

		setInterval ( ()=>this.purge ( ), 60 * 1000 ).unref ( ); // nettoyage des entrées expirées
	}

	// enregistre une tentative ; retourne 0 si autorisée, sinon le nombre de secondes à attendre
	check ( ip )
	{
		if ( !ip )
		{
			return Promise.reject ({ code:500, msg: "no ip" });
		}

		let now = Date.now ( );
		let entry = this.ips.get ( ip );

		if ( !entry
			|| ( now > entry.reset ) )
		{
			entry = { count: 0, reset: now + this._window };
			this.ips.set ( ip, entry );
		}

		if ( entry.count >= this._max )
		{
			return Promise.reject ({ code:429, time: Math.ceil ( ( entry.reset - now ) / 1000 ) });
		}

		entry.count++; // compté dès le début : des requêtes en parallèle ne contournent pas la limite
		return Promise.resolve ( );
	}

	reset ( ip )
	{
		this.ips.delete ( ip );
	}

	purge ( )
	{
		let now = Date.now ( );

		for ( let [ ip, entry ] of this.ips )
		{
			if ( now > entry.reset )
			{
				this.ips.delete ( ip );
			}
		}
	}
}

class User {
	constructor ( params = {})
	{
		this._params = params;
		this._tokenMaxAge = ( Number ( params.tokenDuration ) || 30 ) * 24 * 60 * 60 * 1000;
		this._maxTokens = 10;

		this.limit = new LogLimit ( params )

		let dir = path.dirname ( this._params.file );

		if ( !fs.existsSync ( dir ) )
		{
			fs.mkdirSync ( dir, { recursive: true, mode: 0o700 } )
		}

		if ( !fs.existsSync ( this._params.file ) )
		{
			this.db = [];
		}
	}

	init ( )
	{
		return Promise.resolve ( );
	}

	// connexion par jeton : on compare l'empreinte du jeton reçu à celles stockées
	login ( name, passwd, token, ip )
	{
		return this._logToken ( token ) // tentative de connecion par token
			.catch ( ()=>{
				return this.limit.check ( ip ) // token invalide donc check de limite de tentative
					.then ( ()=>this._login ( name, passwd ) ) // tentative par user/password
					.then ( index=>this._addToken ( index ) ) // add token for this user
			})
			.catch ( ( err )=>{
				throw [ 403, 429 ].includes ( err?.code )
					? err
					: { code:403, msg: "invalid" };
			})
	}

	logout ( hash )
	{
		if ( ( "string" != typeof hash )
			|| ( 0 == hash.length )
			|| ( 256 < hash.length ) )
		{
			return Promise.resolve ( );
		}

		let user = this.db.find ( u=>( u.tokens ?? [] )
			.some ( t=>t.hash == hash ) )

		if ( user )
		{
			user.tokens = user.tokens.filter ( t=>t.hash != hash );
			this.db = [ ...this.db ]; // sauvegarde
		}

		return Promise.resolve ( );
	}

	_logToken ( token )
	{
		if ( ( "string" != typeof token )
			|| ( 0 == token.length )
			|| ( 256 < token.length ) )
		{
			return Promise.reject ( );
		}

		let hash = User.hashToken ( token );
		let now = Date.now ( );

		let index = this.db.findIndex ( u=>( u.tokens ?? [] )
			.some ( t=>( t.hash == hash ) && ( t.expires > now ) ) );

		if ( -1 == index )
		{
			return Promise.reject ( );
		}

		return Promise.resolve ( this.getSafeUser ( index, { token, hash } ) );
	}

	_login ( name, passwd )
	{
		return Promise.reject ({code:500,msg:"not managed"});
	}

	// crée un nouveau jeton pour l'utilisateur, ne stocke que son empreinte
	// un utilisateur peut avoir plusieurs jetons ( un par navigateur / poste )
	_addToken ( index )
	{
		let token = crypto.randomBytes ( 32 ).toString ( "base64url" );
		let now = Date.now ( );
		let user = this.db[ index ];

		if ( !user.tokens )
		{
			user.tokens = [];
		}

		let hash = User.hashToken ( token )

		user.tokens.push ({
			hash: hash,
			expires: now + this._tokenMaxAge
		});

		user.tokens = user.tokens.filter ( t=>t.expires > now )
			.slice ( -this._maxTokens );

		this.db = [ ...this.db ]; // sauvegarde

		return this.getSafeUser ( index, { token, hash } );
	}

	exist ( )
	{
		return Promise.reject ( );
	}

	add ( )
	{
		return Promise.reject ( );
	}

	rm ( )
	{
		return Promise.reject ( );
	}

	getSafeUser ( index, params = {} )
	{
		let tmp = {...this.db[ index ]};
		Object.assign ( tmp, params );

		delete tmp.tokens;
		delete tmp.pass;

		return tmp;
	}

	get users ( )
	{
		return Promise.reject ( );
	}

	set db ( value )
	{
		if ( "Array" != value?.constructor.name )
		{
			throw "invalide db format";
		}
		else
		{
			fs.rmSync ( this._params.file + ".tmp", { force: true } );
			fs.writeFileSync ( this._params.file + ".tmp", JSON.stringify ( value, null, 4 ), { mode: 0o600 } );
			fs.renameSync ( this._params.file + ".tmp", this._params.file );

			this._db = value;
		}
	}

	get db ( )
	{

		if ( !this._db ) try
		{
			if ( !fs.existsSync ( this._params.file ) )
			{
				this._db = [];
			}
			else
			{
				this._db = JSON.parse ( fs.readFileSync ( this._params.file, "utf-8" ).toString ( ) );
			}
		}
		catch ( e )
		{
			throw "database corrupted";
		}

		return this._db ?? [];
	}

	static hashToken ( token )
	{
		return crypto.createHash ( "sha256" )
			.update ( token )
			.digest ( "hex" );
	}
}

class ULinux extends User {
	constructor ( params )
	{
		super ( params );

		if ( !ULinux.isValidName ( params.linux.group ) )
		{
			throw `ERROR : invalid group name "${params.linux.group}"`;
		}

		this.group = params.linux.group;
		this.pamService = params.linux.pamService || "login";
	}

	init ( )
	{
		return execFile ( "getent", [ "group", this.group ] )
			.catch ( r=>{
				if ( process.getuid ( ) )
				{
					throw `ERROR : group "${this.group}" undefined, login can't work`;
				}
				else
				{
					return execFile ( "groupadd", [ this.group ] )
						.then ( r=>{
							console.log ( `   - group "${this.group}" added` )
						})
				}
			})
			.then ( ()=>{
				// pamtester absent -> ENOENT ; présent sans argument -> code de sortie != 0 ( normal )
				return execFile ( "pamtester" )
					.catch ( r=>{
						if ( "ENOENT" == r.code )
						{
							throw `ERROR : "pamtester" not found ( apt install pamtester ), login can't work`;
						}
					})
			})
			.then ( ()=>{
				if ( process.getuid ( ) )
				{
					console.log ( `   - WARNING : not root, PAM can only check the password of the user running node` )
				}

				console.log ( ` - Use linux system to connect` )
				console.log ( `   - connexion allowed to group "${this.group}"` )
				console.log ( `   - PAM service "${this.pamService}"` )
			})
	}

	// jeton valide, mais son propriétaire doit toujours être dans le groupe
	_logToken ( token )
	{
		return super._logToken ( token )
			.then ( r=>this.users
				.then ( users=>{
					if ( !users.includes ( r.name ) )
					{
						throw { code:403, msg: "not allowed" };
					}

					return r;
				})
			);
	}

	_login ( name, passwd )
	{
		return this.users
			.then ( users=>{
				if ( !users.includes ( name ) )
				{
					throw { code:403, msg: "not allowed" };
				}
				
				if ( !ULinux.isValidName ( name )
					|| !ULinux.isValidPassword ( passwd ) )
				{
					throw { code:403, msg: "not allowed" };
				}

				return ULinux.pamAuthenticate ( this.pamService, name, passwd )
			})
			.then ( ()=>{
				let index = this.db.map ( u=>u.name )
					.indexOf ( name );

				if ( -1 == index )
				{
					this.db.push ({ name: name, tokens: [] });
					index = this.db.length - 1;
				}

				return index;
			})
	}

	exist ( name )
	{
		if ( !this._isRoot )
		{
			return Promise.reject ( "user check : neet to be root" );
		}

		if ( !ULinux.isValidName ( name ) )
		{
			return Promise.reject ( "invalid" );
		}

		return execFile ( "id", [ "--", name ] )
			.then ( r=>{
				return 0;
			})
			.catch ( r=>{
				throw "invalid";
			})
	}

	add ( name, passwd )
	{
		if ( !this._isRoot )
		{
			return Promise.reject ( "user add : neet to be root" );
		}

		if ( !ULinux.isValidName ( name ) )
		{
			return Promise.reject ( "invalid" );
		}

		return this.exist ( name )
			.then ( ()=>{
				return execFile ( "usermod", [ "-a", "-G", this.group, "--", name ] )
			}, r=>{
				return execFile ( "useradd", [ "--groups", this.group, "--no-create-home", "--shell", "/usr/sbin/nologin", "--", name ] )
			})
	}

	get users ( )
	{
		// getent group <groupe> -> "nom:x:gid:membre1,membre2"
		return execFile ( "getent", [ "group", this.group ] )
			.then ( r=>( r.stdout.trim ( ).split ( ":" )[ 3 ] ?? "" ).split ( "," ) )
			.then ( r=>{
				if ( 0 <= r.indexOf ( "root" ) )
				{
					r.splice ( r.indexOf ( "root" ), 1 );
				}

				if ( 0 == r.length )
				{
					r = [ "root" ];
				}

				return r;
			})
	}

	get _isRoot ( )
	{
		return process.getuid ( ) == 0;
	}

	static isValidName ( name )
	{
		return ( "string" == typeof name ) &&  /^[a-z_][a-z0-9_-]{0,31}$/i.test ( name );
	}

	static isValidPassword ( passwd )
	{
		return ( "string" == typeof passwd )
			&& ( 0 < passwd.length )
			&& ( 1024 >= passwd.length )
			&& !/[\r\n\0]/.test ( passwd ); // un retour ligne couperait le mot de passe envoyé sur stdin
	}

	static pamAuthenticate ( service, name, passwd )
	{
		return new Promise ( ( ok, ko )=>{
			let child = childProcess.spawn ( "pamtester", [ service, name, "authenticate", "acct_mgmt" ], {
				stdio: [ "pipe", "ignore", "ignore" ],
				timeout: 10000,
			});

			child.on ( "error", ko );
			child.on ( "close", ( code )=>{
				if ( 0 === code )
				{
					ok ( );
				}
				else
				{
					ko ( "invalid" );
				}
			});

			child.stdin.on ( "error", ()=>{} ); // le processus peut fermer stdin avant la fin de l'écriture
			child.stdin.end ( passwd + "\n" );
		});
	}
}

class UFile extends User {
	constructor ( params )
	{
		super ( params );
	}

	_firstRoot ( )
	{
		console.log ( ` - Use file DB to connect` )
		console.log ( `   - no user defined, next one will be root` )
	}

	_login ( name, passwd )
	{
		if ( 0 == this.db.length )
		{ // base vide : le premier utilisateur est créé ( comportement voulu )
			return this.add ( name, passwd )
				.then ( ()=>this.db.map ( u=>u.name ).indexOf ( name ) );
		}

		if ( !UFile.isValidName ( name )
			|| !UFile.isValidPassword ( passwd ) )
		{
			return Promise.reject ({ code:403, msg: "invalid" });
		}

		let index = this.db.map ( u=>u.name )
			.indexOf ( name );

		// si l'utilisateur n'existe pas on calcule quand même un hash :
		// le temps de réponse ne révèle pas si le nom existe
		return UFile.verifyPassword ( passwd, this.db[ index ]?.pass )
			.then ( ()=>index )
	}

	exist ( name )
	{
		return this.users
			.then ( r=>{
				if ( -1 < r.indexOf ( name ) )
				{
					return 0;
				}
				else
				{
					throw "invalid";
				}
			})
	}

	async add ( name, passwd, params = {} )
	{
		if ( !UFile.isValidName ( name )
			|| !UFile.isValidPassword ( passwd ) )
		{
			throw "invalid";
		}

		let nUser = Object.assign ({
			name: name,
			pass: await UFile.hashPassword ( passwd ),
			tokens: [], // nouvel utilisateur ou mot de passe changé : anciens jetons révoqués
		}, params )

		try
		{
			let index = this.db.map ( u=>u.name ).indexOf ( name );
			if ( -1 != index )
			{
				this.db[ index ] = nUser;
			}
			else
			{
				this.db.push ( nUser );
			}

			this.db = this.db;

			return { name: nUser.name };
		}
		catch ( e )
		{
			throw "invalid";
		}
	}

	get users ( )
	{
		return Promise.resolve ( this.db.map ( u=>u.name ) );
	}

	set db ( value )
	{
		super.db = value;

		if ( 0 == this.db.length )
		{
			this._firstRoot ( );
		}
	}

	get db ( )
	{
		return super.db;
	}

	// hash scrypt d'un mot de passe aléatoire, utilisé quand l'utilisateur n'existe pas
	static DUMMY_HASH = "scrypt$16384$8$1$" + crypto.randomBytes ( 16 ).toString ( "base64" ) + "$" + crypto.randomBytes ( 64 ).toString ( "base64" );

	static isValidName ( name )
	{ // nom libre, mais chaîne non vide, sans caractère de contrôle
		return ( "string" == typeof name )
			&& ( 0 < name.trim ( ).length )
			&& ( 64 >= name.length )
			&& !/[\x00-\x1f\x7f]/.test ( name );
	}

	static isValidPassword ( passwd )
	{
		return ( "string" == typeof passwd )
			&& ( 0 < passwd.length )
			&& ( 1024 >= passwd.length );
	}

	// format stocké : scrypt$N$r$p$sel$hash ( sel aléatoire propre à chaque utilisateur )
	static async hashPassword ( passwd )
	{
		let salt = crypto.randomBytes ( 16 );
		let key = await scrypt ( passwd, salt, SCRYPT.keyLen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p } );

		return [ "scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString ( "base64" ), key.toString ( "base64" ) ].join ( "$" );
	}

	static async verifyPassword ( passwd, stored = UFile.DUMMY_HASH )
	{
		if ( "string" != typeof stored )
		{
			return Promise.reject ( "invalid" );
		}

		let parts = stored.split ( "$" );

		if ( ( 6 == parts.length )
			&& ( "scrypt" == parts[ 0 ] ) )
		{
			let [ , N, r, p, salt, hash ] = parts;
			let expected = Buffer.from ( hash, "base64" );
			let key = await scrypt ( passwd, Buffer.from ( salt, "base64" ), expected.length, { N: Number ( N ), r: Number ( r ), p: Number ( p ) } );

			if ( !crypto.timingSafeEqual ( key, expected ) )
			{
				return Promise.reject ( "invalid" );
			}

			return Promise.resolve ( );
		}

		return Promise.reject ( "invalid" );
	}
}

// règle AD "LDAP_MATCHING_RULE_IN_CHAIN" : memberOf suit aussi les groupes imbriqués
// ( bob ∈ Compta ∈ AppUsers  =>  bob est considéré comme membre de AppUsers )
// 1.2.840.113556.1.4.1941 est un OID (Object Identifier), un numéro normalisé attribué par Microsoft.
const AD_IN_CHAIN = "1.2.840.113556.1.4.1941";

class UAd extends User {
	constructor ( params )
	{
		super ( params );

		this._ad = { ...params.ad };

		if ( !this._ad.url )
		{
			throw `ERROR : --login.ad.url is required ( ex : ldaps://ad.domaine.fr:636 )`;
		}

		if ( !this._ad.baseDN )
		{
			throw `ERROR : --login.ad.baseDN is required ( ex : DC=domaine,DC=fr )`;
		}

		// compte de service ( optionnel ) : mot de passe lu dans l'environnement, jamais en ligne de commande
		this._ad.bindPassword = process.env.NODEBASE_AD_PASSWORD;
	}

	_client ( )
	{
		return new Client ({
			url: this._ad.url,
			timeout: 10000,        // ms par opération
			connectTimeout: 5000,  // ms pour la connexion
			// annuaire avec un certificat interne : tlsOptions: { ca: [ fs.readFileSync ( "ca.pem" ) ] },
		});
	}

	// "bob" -> "bob@domaine.fr" ; minuscules : l'AD ne distingue pas la casse, la base locale si
	_upn ( name )
	{
		return ( name.includes ( "@" ) ? name : name + ( this._ad.domain ?? "" ) ).toLowerCase ( );
	}

	// cherche l'utilisateur dans l'annuaire, et s'il est membre du groupe ( si un groupe est configuré )
	// la connexion "client" doit déjà être authentifiée ( utilisateur ou compte de service )
	// retourne l'entrée trouvée, ou null
	async _findUser ( client, upn )
	{
		let filter = escapeFilter`(&(objectCategory=person)(objectClass=user)(userPrincipalName=${upn})`;

		if ( this._ad.group )
		{
			if ( this._ad.recursive )
			{
				filter += escapeFilter`(memberOf:${AD_IN_CHAIN}:=${this._ad.group})`;
			}
			else
			{
				filter += escapeFilter`(memberOf=${this._ad.group})`;
			}
		}

		filter += ")";

		let { searchEntries } = await client.search ( this._ad.baseDN, {
			scope: "sub",
			filter: filter,
			attributes: [ "userPrincipalName", "displayName" ],
			sizeLimit: 2,
		});

		return ( 1 == searchEntries.length ) ? searchEntries[ 0 ] : null;
	}

	// au démarrage : avec un compte de service, on vérifie que l'annuaire répond et que le groupe existe
	init ( )
	{
		console.log ( ` - Use Active Directory to connect ( ${this._ad.url} )` );

		if ( this._ad.url.startsWith ( "ldap://" ) )
		{
			console.log ( `   - WARNING : ldap:// sends passwords in clear text, use ldaps://` );
		}

		if ( !this._ad.group )
		{
			console.log ( `   - WARNING : no --login.ad.group, every account of the directory can connect` );
		}

		if ( !this._ad.bindDN )
		{
			console.log ( `   - no service account : group membership is not re-checked on token login` );
			return Promise.resolve ( );
		}

		return this._asService ( async ( client )=>{
				if ( this._ad.group )
				{
					let { searchEntries } = await client.search ( this._ad.group, { scope: "base", attributes: [ "cn" ] } );

					if ( 0 == searchEntries.length )
					{
						throw "group not found";
					}

					console.log ( `   - connexion allowed to group "${this._ad.group}"` );
				}
			})
			.catch ( ( e )=>{
				throw `ERROR : Active Directory check failed ( ${e?.message ?? e} )`;
			});
	}

	// exécute fn ( client ) avec une connexion authentifiée par le compte de service
	async _asService ( fn )
	{
		let client = this._client ( );

		try
		{
			await client.bind ( this._ad.bindDN, this._ad.bindPassword );
			return await fn ( client );
		}
		finally
		{
			await client.unbind ( ).catch ( ()=>{} );
		}
	}

	// connexion par jeton : avec un compte de service, on revérifie que l'utilisateur
	// existe toujours et est toujours dans le groupe ( comme le mode Linux )
	_logToken ( token )
	{
		return super._logToken ( token )
			.then ( ( r )=>{
				if ( !this._ad.bindDN )
				{
					return r;
				}

				return this._asService ( ( client )=>this._findUser ( client, r.name ) )
					.then ( ( entry )=>{
						if ( !entry )
						{
							throw { code:403, msg: "not allowed" };
						}

						return r;
					});
			});
	}

	async _login ( name, passwd )
	{
		// un mot de passe vide = "bind anonyme", que l'AD accepte : à refuser explicitement
		if ( ( "string" != typeof name )
			|| ( "string" != typeof passwd )
			|| ( 0 == name.length )
			|| ( 0 == passwd.length ) )
		{
			throw { code:403, msg: "invalid" };
		}

		let upn = this._upn ( name );
		let client = this._client ( );

		try
		{
			try
			{ // vérifie le mot de passe
				await client.bind ( upn, passwd );
			}
			catch ( e )
			{
				throw { code:403, msg: "invalid" };
			}

			// avec la connexion de l'utilisateur : il existe dans l'annuaire et appartient au groupe
			if ( !await this._findUser ( client, upn ) )
			{
				throw { code:403, msg: "not allowed" };
			}
		}
		finally
		{
			await client.unbind ( ).catch ( ()=>{} );
		}

		let index = this.db.map ( u=>u.name )
			.indexOf ( upn );

		if ( -1 == index )
		{
			this.db.push ({ name: upn, tokens: [] });
			index = this.db.length - 1;
		}

		return index;
	}

	exist ( name )
	{
		if ( !this._ad.bindDN )
		{
			return Promise.reject ( "user check : need a service account ( --login.ad.bindDN )" );
		}

		return this._asService ( ( client )=>this._findUser ( client, this._upn ( name ) ) )
			.then ( ( entry )=>{
				if ( !entry )
				{
					throw "invalid";
				}

				return 0;
			});
	}
}

export default function ( params )
{
	switch ( params.args?.login?.mode )
	{
		case "linux":
		{
			params.login = new ULinux ( params.args?.login );
			
			break;
		}
		case "file":
		{
			params.login = new UFile ( params.args?.login );
			break;
		}
		case "ad":
		{
			params.login = new UAd ( params.args?.login );
			break;
		}
		default:
		{
			throw `user management mode unknow : ${params.args?.login?.mode}`;
		}
	}

	return params.login.init ( )
		.then ( ()=>params );
}
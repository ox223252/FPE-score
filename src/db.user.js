import fs from 'fs'; // read / write files
import util from 'util';
import path from 'path';
import crypto from 'crypto'; // scrypt / sha256 / randomBytes
import chokidar from "chokidar";
import childProcess from 'child_process';

import ActiveDirectory from 'activedirectory'; // login with windows user account

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

		if ( !ULinux.isValidName ( params.group ) )
		{
			throw `ERROR : invalid group name "${params.group}"`;
		}

		this.group = params.group;
		this.pamService = params.pamService || "login";
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

class UAd extends User {
	constructor ( params )
	{
		super ( params );

		let ad = new ActiveDirectory ({
			url: params.ad.url,
			port: params.ad.port,
			baseDN: params.ad.baseDN,
		});

		this._ad = {
			authenticate: ( user,pass )=>{
				return new Promise ( (ok,ko)=>{
					ad.authenticate ( user, pass, (e,d)=>{
						if ( e )
						{
							ko ({code:403, msg:e});
						}
						else
						{
							ok ({name:user});
						}
					});
				});
			},
			exist: ( user )=>{
				return new Promise ( (ok,ko)=>{
					ad.userExists ( user, ( e, d )=>{
						if ( e )
						{
							ko ( );
						}
						else if ( d )
						{
							ok ( );
						}
						else
						{
							ko ( );
						}
					});
				});
			},
		};
	}

	_login ( name, passwd )
	{
		if ( ( "string" != typeof name )
			|| ( "string" != typeof passwd ) )
		{
			return Promise.reject ({ code:403, msg: "invalid" });
		}

		return this._ad.authenticate ( name + ( ( -1 == name.indexOf ( "@" ) )?this._params.ad.domain:"" ), passwd )
			.then ( ret=>{
				let index = this.db.map ( u=>u.name )
					.indexOf ( ret.name );

				if ( -1 == index )
				{
					this.db.push ({ name: ret.name, tokens: [] });
					index = this.db.length - 1;
				}

				return index;
			})
	}

	exist ( name )
	{
		return this._ad.exist ( name );
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
		case "activeDirectory":
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
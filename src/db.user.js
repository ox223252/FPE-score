import fs from 'fs'; // read / write files
import util from 'util';
import crypto from 'crypto'; // sha512
import chokidar from "chokidar";
import childProcess from 'child_process';

import ActiveDirectory from 'activedirectory'; // login with windows user account

// execFile lance le programme directement, sans passer par un shell :
// les arguments ne sont jamais interprétés ( pas de ; | $( ) ` ... )
const execFile = util.promisify ( childProcess.execFile );

class User {
	constructor ( params = {})
	{
		this._params = params;
		let path = this._params.file.substring ( 0, this._params.file.lastIndexOf ( "/" ) );

		if ( !fs.existsSync ( path ) )
		{
			fs.mkdirSync ( path, {recursive:true} )
		}

		if ( !fs.existsSync ( this._params.file ) )
		{
			this.db = [];
		}
	}

	login ( token )
	{
		if ( !token )
		{
			return Promise.reject ( );
		}

		let index = this.db.map ( u=>u.token )
			.indexOf ( token );

		if ( -1 == index )
		{
			return Promise.reject ( );
		}
		
		let tmp = { ...this.db[ index ] };

		return Promise.resolve ( tmp );
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

	get users ( )
	{
		return Promise.reject ( );
	}

	set db ( value )
	{
		if ( "Array" != value?.constructor.name )
		{
			this._db = [];
			throw "invalide db format";
		}
		else
		{
			this._db = value;
			fs.writeFileSync ( this._params.file, JSON.stringify ( this._db, null, 4 ) );
		}
	}

	get db ( )
	{
		if ( !this._db ) try
		{
			this._db = JSON.parse ( fs.readFileSync ( this._params.file, "utf-8" ).toString ( ) );
		}
		catch ( e )
		{
			this._db = [];
		}

		return this._db ?? [];
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

		this.init ( );
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

	login ( name, passwd, token )
	{
		return super.login ( token )
			.then ( r=>{
				return r;
			})
			.catch ( ()=>{
				if ( !ULinux.isValidName ( name )
					|| !ULinux.isValidPassword ( passwd ) )
				{
					return Promise.reject ( "invalid" );
				}

				return this.users
					.then ( r=>{
						if ( 0 > r.indexOf ( name ) )
						{
							throw 'user not allowed';
						}

						return ULinux.pamAuthenticate ( this.pamService, name, passwd );
					})
					.then ( r=>{
						let index = this.db.map ( u=>u.name )
							.indexOf ( name );

						if ( -1 == index )
						{
							let t = {
								name: name,
								token: crypto.createHash ( 'sha512' ).update ( Math.random ( ).toString ( ) ).digest ( 'hex' ),
							};

							this.db = [ ...this.db, t ];

							return { ...t };
						}
						else
						{
							this.db[ index ].token = crypto.createHash ( 'sha512' ).update ( Math.random ( ).toString ( ) ).digest ( 'hex' );
							this.db = [ ...this.db ];

							return { ...this.db[ index ] };
						}
					})
					.catch ( r=>{
						throw "invalid";
					})
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

	login ( name, passwd, token )
	{
		if ( 0 == this.db.length )
		{
			return this.add ( name, passwd );
		}

		return super.login ( token )
			.then ( r=>{
				delete r.pass;
				return r;
			})
			.catch ( ()=>{
				return this.users
					.then ( r=>{
						let index = r.indexOf ( name );

						if ( -1 == index )
						{
							throw "invalid";
						}

						let hash = crypto.createHash ( 'sha512' ).update ( passwd ).digest ( 'hex' )
						if ( hash != this.db[ index ].pass )
						{
							throw "invalid"
						}

						let tmp = { ...this.db[ index ] }

						delete tmp.pass;

						return tmp;
					})
			})
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

	add ( name, passwd, params = {} )
	{
		let nUser = Object.assign ({
			name: name,
			pass: crypto.createHash ( 'sha512' ).update ( passwd ).digest ( 'hex' ),
			token: crypto.createHash ( 'sha512' ).update ( Math.random ( ).toString ( ) ).digest ( 'hex' ),
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

			return Promise.resolve ( nUser );
		}
		catch ( e )
		{
			return Promise.reject ( "invalid" );
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
							ko ( e );
						}
						else
						{
							ok ( d );
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

	login ( user, pass, token )
	{
		return super.login ( token )
			.catch ( r=>{
				if ( -1 == user.indexOf ( "@" ) )
				{
					return this._ad.authenticate ( user+this._params.ad.domain, pass )
				}
				else
				{
					return this._ad.authenticate ( user, pass );
				} 

			})
	}

	exist ( name )
	{
		return this._ad.exist ( user );
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
			throw `user management mode unknow : ${params.args.login}`;
		}
	}

	return params;
}
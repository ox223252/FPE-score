import fs from 'fs'; // read / write files
import crypto from 'crypto'; // sha512
import { Server as ServerIO } from "socket.io";
import {calcAll} from "./calc.js"
import {checkId} from "./fnct.js"


Array.prototype.distinct = function () { return Array.from ( new Set ( this ) ); };

export default function socketIO ( server, params )
{
	let io = new ServerIO ( server );
	io.engine.use ( params.sessionMiddleware );
	console.log ( " - Socket.io server start")


	params.io = io;
	params.interval = undefined;

	io.on ( 'connection', function( socket )
	{
		socket.on ( "getUCCG", (msg)=>{
			let out = params.db.users
				.filter ( u=>{
					if ( params.categories )
					{
						return params.categories?.includes ( u.categorie );
					}

					return true;
				})
				.filter ( u=>{
					for ( let key in msg?.filters )
					{
						if ( u[ key ] != msg.filters[ key ] )
						{
							return false;
						}
					}
					return true;
				})
				.map ( u=>{
					if ( msg?.out )
					{
						return u[ msg.out ]
					}
					return u;
				})
				.distinct ( );
			
			socket.emit ( "setUCCG", out );
		});

		socket.on ( "getListOfType", ()=>{
			let out = Object.keys ( params.db.voies );
			socket.emit ( "setListOfType", params.db.voies.map ( v=>v.type ).distinct ( ) )
		});

		socket.on ( "getListOfAllCategories", ()=>{
			socket.emit ( "setListOfAllCategories", params.args.categories );
		});

		socket.on ( "getVoies", (msg)=>{
			let voies = params.db.voies.filter ( v=>{
					if ( undefined == msg?.filters )
					{
						return true;
					}
					else
					{
						return msg?.filters?.includes ( v.type );
					}
				})
				.filter ( v=>{
					if ( params.categories )
					{
						return v.categories.some( cat=> params.categories.includes ( cat ) )
					}
					else
					{
						return true;
					}
				})
				.map ( v=>v.name );

			socket.emit ( "setVoies", voies );
		});

		socket.on ( "getVoie", (msg)=>{
			socket.emit ( "setVoie", params.db.voies[ params.db.voies.map ( v=>v.name ).indexOf ( msg ) ] );
		});

		socket.on ( "setScore", async (msg)=>{
			if ( !socket.request.session?.logged )
			{
				io.emit ( "msg", "un utilisateur inconnue tente de rentrer des scores" );
				return;
			}

			if ( 0 == params?.db?.users?.filter ( u=>u.name == msg.user ).length )
			{
				socket.emit ( "error", "competiteur inconnu" );
				return;
			}

			if ( -1 >= params?.db?.voies?.map ( v=>v.name ).indexOf ( msg.voie ) )
			{
				socket.emit ( "error", "voie inconnu" );
				return;
			}

			if ( !params?.db?.score[ msg.user ] )
			{ // if no score table is created for this user
				params.db.score[ msg.user ] = {};
			}

			let score = params.db.score[ msg.user ]

			if ( !score[ msg.voie ] )
			{
				score[ msg.voie ] = [];
			}

			let voie = params.db.voies [ params.db.voies.map ( v=>v.name ).indexOf ( msg.voie ) ];
			
			let points = 0;

			switch ( voie.type )
			{
				case "bloc":
				{
					if ( params.args.mode == "a" )
					{
						points = voie.score[ msg.score.bloc ] || 0;
					}
					else
					{
						points = msg.score.bloc;
					}
					break;
				}
				case "diff":
				{
					points = Number ( msg.score.diff );
					break;
				}
				case "vitesse":
				{
					break;
				}
				case "endurance":
				{
					break;
				}
			}

			score[ msg.voie ].push ( points );

			await calcAll ( params );

			fs.writeFileSync ( params.db.path.score, JSON.stringify ( params.db.score, null, 4 ), 'utf8' );
			socket.emit ( "ok" );
			io.emit ( "scores", params?.db?.score );
		});

		socket.on ( "getScores", ()=>{
			socket.emit ( "scores", params?.db?.score );
		});

		socket.on ( "uValue", async (msg)=>{
			if ( ![ "admin","editor" ].includes ( socket.request.session?.logged ) )
			{
				io.emit ( "msg", "un utilisateur inconnue tente de modifier des scores" );
				return;
			}

			params.db.score[ msg.name ][ msg.voie ][ msg.index ] = msg.value;
			await calcAll ( params );
			fs.writeFileSync ( params.db.path.score, JSON.stringify ( params.db.score, null, 4 ), 'utf8' );
			io.emit ( "scores", params?.db?.score );
		});

		socket.on ( "getListOfAllTypes", ()=>{
			socket.emit ( "setListOfAllTypes", params.type );
		});

		socket.on ( "newVoie", (msg)=>{
			// check l'utilisateur qui veut créer une voie
			if ( !socket.request.session?.logged )
			{
				io.emit ( "msg", "un utilisateur inconnue tente d'ajouter des voies" );
				return;
			}
			else if ( ![ "admin", "juge" ].includes ( socket.request.session?.logged ) )
			{
				socket.emit ( "msg", "vous n'etes pas habilité pour cette opération" );
				return;
			}

			// vérifie que le type de voie est valide 
			if ( !params.type.includes ( msg.type ) )
			{
				socket.emit ( "error", "type "+msg.type+"invalide, accepté : "+params.type );
				return;
			}

			// nettoyage des trucs non initialisés
			Object.keys ( msg ).map ( k=>{
				if ( !msg[ k ] )
				{
					delete msg[ k ];
				}
			})

			// sauvegarde du score
			if ( msg.score )
			{
				msg.score = msg.score.replace ( /[ .]/g, "," ).split ( "," );
				if ( "bloc" == msg.type )
				{
					if ( 2 != msg.score.length )
					{
						socket.emit ( "error", "pour le bloc seul un score de ZONE et de TOP sont requis" );
						return;
					}

					msg.score = {
						zone: msg.score[ 0 ],
						top: msg.score[ 1 ],
					};
				}
			}

			// convertion d'une image
			if ( msg.img )
			{
				let path = "./public/imgs";

				if ( !fs.existsSync ( path ) )
				{
					fs.mkdirSync ( path );
				}

				let ext = msg.img.split ( ";" )[ 0 ].split ( "/" )[ 1 ];
				let post = 0;
				do
				{
					let imgName = "img_"+msg.voie

					if ( post++ )
					{
						imgName += "_"+post;
					}

					imgName += "."+ext;

					if ( !fs.existsSync ( path+"/"+imgName ) )
					{
						fs.writeFileSync ( path+"/"+imgName, Buffer.from ( msg.img.split(',')[1], 'base64' ) );
						msg.img = "/imgs/"+imgName;
						break;
					}
				}
				while ( true );
			}

			// correct categories
			if ( msg.categories )
			{
				msg.categories = Object.keys ( msg.categories ).filter ( k=>{
					return msg.categories[ k ];
				});
			}

			let index = params.db.voies.map ( v=>v.name ).indexOf ( msg.name );

			if ( index == -1 )
			{
				params.db.voies.push ( msg );
			}
			else
			{
				params.db.voies[ index ] = msg;
			}

			fs.writeFileSync ( params.args?.voies, JSON.stringify ( params.db.voies, null, 4 ) );
			socket.emit ( "ok" );

			io.emit ( "setVoies", params.db.voies.map ( v=>v.name ) );
		});

		socket.on ( "getClubsList", ()=>{
			socket.emit ( "setClubsList", params.db.users.map ( u=>u.club ).distinct ( ) );
		});

		socket.on ( "getUsersList", (msg)=>{
			let list = params.db.users
				.filter ( u=>{
					if ( !params?.categories )
					{
						return true;
					}
					return params.categories.includes ( u.categorie )
				})
				.map ( u=>u.name );
			socket.emit ( "setUsersList",  );
		});

		socket.on ( "setUser", (msg)=>{
			switch ( msg.group )
			{
				case "admin":
				case "editor":
				case "juge":
				{
					if ( "admin" != socket.request.session?.logged )
					{
						io.emit ( "msg", "un juge tente tente de faire une action admin" );
						socket.emit ( "error", "droits insufisants" );
						return;
					}

					for ( let key of [ "name", "pass" ] )
					{
						if ( !msg[ key ] )
						{
							socket.emit ( "error", "il manque une info : "+key );
							return;
						}
					}

					params.db.login[ msg.name ] = {
						pass: crypto.createHash ( 'sha512' ).update ( msg.pass ).digest ( 'hex' ),
						status: msg.group,
						error: 0,
						date: undefined,
					};

					fs.writeFileSync ( params.args.login, JSON.stringify ( params.db.login, null, 4 ), "utf8" )

					break;
				}
				case "competitor":
				{
					if ( !socket.request.session?.logged )
					{
						io.emit ( "msg", "un utilisateur inconnue tente d'ajouter des competiteurs" );
						socket.emit ( "error", "droits insufisants" );
						return;
					}

					for ( let key of [ "name", "categorie", "genre", "club" ] )
					{
						if ( !msg[ key ] )
						{
							socket.emit ( "error", "il manque une info : "+key );
							return;
						}
					}

					let index = params.db.users.map ( u=>u.name ).indexOf ( msg.name );
					if ( 0 <= index )
					{
						Object.assign ( params.db.users[ index ], msg );
					}
					else
					{
						params.db.users.push ( msg );
					}


					checkId ( params.db.users, "dossard" );
					fs.writeFileSync ( params.args?.users, JSON.stringify ( params.db.users, null, 4 ) );

					break;
				}
				default:
				{
					socket.emit ( "error", "group invalide" );
					return;
				}
			}
			socket.emit ( "ok" );
		});

		socket.on ( "start", (msg)=>{
			if ( params.interval )
			{
				return;
			}

			function getTime ( value )
			{
				let t = Math.floor ( value / 1000 );
				let str = "";

				if ( t > 3600 )
				{
					str = Math.floor ( t / 3600 ) + "h";
					t %= 3600;
				}

				if ( t > 60 )
				{
					str = Math.floor ( t / 60 ) + "m";
					t %= 60;
				}

				str += t + "s";

				return str;
			}

			if ( isNaN ( msg?.time ) )
			{
				socket.emit ( "error", "temps invalide" );
			}

			let remainingTime = Number ( msg.time ) * 60 * 1000;

			params.categories = Object.keys ( msg.categories ).filter ( k=> msg.categories[ k ] );

			params.interval = setInterval ( ()=>{
				remainingTime -= 1000;
				io.emit ( "timer", getTime ( remainingTime ) );
			},1000);

			console.log ( "start competition for" )
			console.log ( "  - ", params.categories.join ( "/" ) )

			setTimeout ( ()=>{
				clearInterval ( params.interval );
				io.emit ( "timer",  0 );
				params.interval = undefined;

				console.log ( "normal end" )
			},remainingTime );

			io.emit ( "updateNav", false );
		});

		socket.on ( "stop", (msg)=>{
			clearInterval ( params.interval );
			io.emit ( "timer",  "" );
			params.interval = undefined;

			params.categories = params.args.categories;
			console.log ( "user stop" )

			io.emit ( "updateNav", true );
		});

		socket.on ( "cmd", (msg)=>{
			try
			{
				if ( "admin" != socket.request.session?.logged )
				{
					throw "droits manquants";
				}

				console.log ( msg )

				if ( !params?.args?.[ msg?.arg ] )
				{
					throw "fichier manquant";
				}

				switch ( msg.cmd )
				{
					case "delete":
					{
						fs.unlink ( params.args[ msg?.arg ],
							(err => {
								if (err)
								{
									throw err;
								}
								else
								{
									socket.emit ( "ok" );
									return;
								}
							}))
						break;
					}
					case "export":
					{
						socket.emit ( "export", {file:msg?.arg,data:params.db[ msg?.arg ]} );
						break;
					}
					case "set":
					{
						switch ( msg?.arg )
						{
							case "voies":
							{
								console.log ( msg.data )
								break;
							}
							case "users":
							{
								params.db[ msg?.arg ] = msg.data.map ( d=>{
									d.group="competitor"
									return d;
								});
								break;
							}
						}

						fs.writeFileSync ( params.args?.[ msg?.arg ], JSON.stringify ( params.db[ msg?.arg ], null, 4 ) );
						break;
					}
					default:
					{
						throw "unknow cmds";
					}
				}

				socket.emit ( "ok" );
			}
			catch ( e )
			{
				console.log ( e );
				socket.emit ( "error", e );
			}
		});
	});
}
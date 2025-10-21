import fs from 'fs'; // read / write files
import { Server as ServerIO } from "socket.io";
import {calcAll} from "./calc.js"

Array.prototype.distinct = function () { return Array.from ( new Set ( this ) ); };

export default function socketIO ( server, params )
{
	let io = new ServerIO ( server );
	io.engine.use ( params.sessionMiddleware );
	console.log ( " - Socket.io server start")

	params.io = io;

	io.on ( 'connection', function( socket )
	{
		socket.on ( 'msg', function ( msg )
		{
			// prepare next id
			// io.emit ( 'id', id + 1 );

			// fs.writeFileSync ( args.msg, JSON.stringify ( msgs ), 'utf8' );
			// socket.emit ( 'act', id );

			// socket.broadcast.emit ( 'msg', data);
		});

		socket.on ( "getUCCG", function ( msg )
		{
			let out = params.db.users.filter ( u=>{
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
			socket.emit ( "setListOfType", out.map ( k=>params.db.voies[ k ].type ).distinct ( ) )
		});

		socket.on ( "getVoies", function ( msg )
		{
			let out = Object.keys ( params.db.voies );
			out = out.filter ( v=>{
					if ( undefined == msg.filters )
					{
						return true;
					}
					else if ( msg.filters?.includes ( params.db.voies[ v ].type ) )
					{
						return true;
					}
					return false;
				});

			socket.emit ( "setVoies", out );
		})

		socket.on ( "getVoie", function ( msg )
		{
			let out = params.db.voies[ msg ];

			socket.emit ( "setVoie", out );
		})

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

			if ( -1 >= Object.keys ( params?.db?.voies ).indexOf ( msg.voie ) )
			{
				socket.emit ( "error", "voie inconnu" );
				return;
			}

			if ( !params?.db?.score[ msg.user ] )
			{ // if no score table is created for this user
				params.db.score[ msg.user ] = {};
			}

			let score = params?.db?.score[ msg.user ]

			if ( !score[ msg.voie ] )
			{
				score[ msg.voie ] = [];
			}

			let voie = params.db.voies[ msg.voie ];
			
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
			params.db.score[ msg.name ][ msg.voie ][ msg.index ] = msg.value;
			await calcAll ( params );
			fs.writeFileSync ( params.db.path.score, JSON.stringify ( params.db.score, null, 4 ), 'utf8' );
			io.emit ( "scores", params?.db?.score );
		});

		socket.on ( "getListOfAllTypes", ()=>{
			socket.emit ( "setListOfAllTypes", params.type );
		});

		socket.on ( "newVoie", (msg)=>{
			if ( !params.type.includes ( msg.type ) )
			{
				socket.emit ( "error", "type "+msg.type+"invalide, accepté : "+params.type );
				return;
			}

			if ( msg.score )
			{
				msg.score = msg.score.replace ( /[ .]/g, "," ).split ( "," );
				if ( "bloc" == msg.type )
				{
					if ( 2 != msg.score.length )
					{
						socket.emit ( "error", "pour le bloc seul un score de zone et de top sont requis" );
						return;
					}

					msg.score = {
						zone: msg.score[ 0 ],
						top: msg.score[ 1 ],
					};
				}
			}

			if ( msg.img )
			{
				// let path = params.args?.voies?.split ( "/" )
				// 	.reverse ( )
				// 	.slice ( 1 )
				// 	.reverse ( )
				// 	.join ( "/" );
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

			if ( !params.db.voies[ msg.voie ] )
			{
				params.db.voies[ msg.voie ] = msg;
			}
			else
			{
				Object.assign ( params.db.voies[ msg.voie ], msg );
			}


			let keys = Object.keys ( params.db.voies );
			let tmp = JSON.parse ( JSON.stringify ( params.db.voies ) );

			keys.map ( k=>delete tmp[ k ].meta );
			fs.writeFileSync ( params.args?.voies, JSON.stringify ( tmp, null, 4 ) );
		});

		socket.on ( "getClubsList", ()=>{
			socket.emit ( "setClubsList", params.db.users.map ( u=>u.club ).distinct ( ) );
		});

		socket.on ( "getUsersList", (msg)=>{
			socket.emit ( "setUsersList", params.db.users.map ( u=>u.name ) );
		});

		socket.on ( "setUser", (msg)=>{
			if ( undefined == msg.name )
			{
				socket.emit ( "error", "il manque le nom" );
				return;
			}
			if ( undefined == msg.categorie )
			{
				socket.emit ( "error", "il manque la categorie" );
				return;
			}
			if ( undefined == msg.genre )
			{
				socket.emit ( "error", "il manque le genre" );
				return;
			}
			if ( undefined == msg.club )
			{
				socket.emit ( "error", "il manque le club" );
				return;
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

			fs.writeFileSync ( params.args?.users, JSON.stringify ( params.db.users, null, 4 ) );

			socket.emit ( "ok" );
		});
	});
}
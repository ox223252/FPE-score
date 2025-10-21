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

		socket.on ( "getVoies", function ( msg )
		{
			let out = Object.keys ( params.db.voies );

			out.filter ( V=>{
					for ( let key in msg?.filters )
					{
						if ( params.db.voies[ v ][ key ] != msg.filters[ key ] )
						{
							return false;
						}
					}
					return true;
				})

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
	});
}
import express from 'express'; // routing module
import fs from 'fs'; // read / write files
import sharp from 'sharp';
import {checkId} from './fnct.js';

export default function ( params )
{
	console.log ( "   - Init Ajax part" );

	let ajax = express.Router ( );

	params.express.use ( "/ajax", ajax );

	ajax.use ( function ( req, res, next )
	{ // manage right for ajax requests
		let route = [];

		switch ( req.session.logged )
		{
			case "admin":
			{
				next ( );
				return;
			}
			case "staff":
			{
				route.push ( "/set/route" );
				route.push ( "/set/score" );
				route.push ( "/set/value" );
				route.push ( "/set/user" );

			}
			case "juge":
			{
				route.push ( "/set/score" );
			}
			default:
			{
				route.push ( "/login" );
				route.push ( "/get/route" );
				break;
			}
		}

		if ( route.includes ( req.path ) )
		{
			next ( );
		}
		else
		{
			res.status ( 403 );
			res.json ({msg:"invalid right"});
			res.end ( );
			return;
		}
	});

	ajax.post ( '/login', function ( req, res )
	{
		params.login.login ( req.body?.user, req.body?.pass, req.body?.token, req.ip )
			.then ( r=>{
				params.login.limit.reset ( req.ip );

				let target = req.session.target;

				// nouvel identifiant de session à la connexion : un identifiant connu
				// avant la connexion ( fixation de session ) ne donne plus accès au compte
				req.session.regenerate ( ( err )=>{
					if ( err )
					{
						res.status ( 500 );
						res.json ({});
						res.end ( );
						return;
					}

					req.session.user = r.name;
					req.session.hashToken = r.hash;
					req.session.logged = r.status || true;
					req.session.target = ( "/login" == target ) ? "/" : target;


					res.status ( 200 );
					res.json ({
						target: req.session.target,
						token: r.token,
					});
					res.end ( );
				});
			})
			.catch ( r=>{
				res.status ( r?.code ?? 500 );
				if ( 429 == r?.code )
				{
					res.set ( "Retry-After", String ( r.time ) );
				}
				res.json ({});
				res.end ( );
			})
	}); // login

	ajax.post ( "/halt", function ( req, res )
	{
		if ( !ajax?.params?.args?.halt )
		{
			res.writeHead ( 403 );
			res.end ( );
		}
		
		params.io.emit ( "halt" );
		params.io.engine.close ( );

		exec ( 'halt' )
			.then ( ()=>{
				res.writeHead ( 200 );
				res.end ( );
			})
	}); // halt

	ajax.post ( "/start", function ( req, res )
	{
		if ( params.interval )
		{
			return;
		}

		let remainingTime = Number ( req.body.time ) * 60 * 1000;

		params.categories = req.body.categories;

		console.log ( "start competition for" )
		console.log ( `  - ${getTime ( remainingTime )}` )
		console.log ( `  - ${params.categories.join ( "/" )}` )

		params.interval = setInterval ( ()=>{
			remainingTime -= 1000;
			params.io.emit ( "timer", getTime ( remainingTime ) );
		},1000);

		params.timeout = setTimeout ( ()=>{
			clearInterval ( params.interval );
			params.io.emit ( "timer",  "" );
			params.interval = undefined;
			params.timeout = undefined;

			console.log ( "normal end" )
		},remainingTime );
	}); // start

	ajax.post ( "/stop", function ( req, res )
	{
		if ( !params.interval )
		{
			return;
		}

		clearInterval ( params.interval );
		clearTimeout ( params.timeout );

		params.interval = undefined;
		params.timeout = undefined;
	
		params.io.emit ( "timer",  "" );

		params.categories = params.args.categories;
		console.log ( "user stop" )
	}); //stop

	ajax.post ( "/get/route", function ( req, res )
	{
		// fetch ( "/ajax/get/route", {method:"POST", body: JSON.stringify ( {route:"A"} ), headers: { "Content-Type": "application/json" } } ).then ( console.log )
		res.status ( 200 );
		res.json ( params.db.routes[ params.db.routes.map ( v=>v.name ).indexOf ( req.body.route ) ] );
		res.end ( );
	}); // get route

	ajax.post ( "/set/route", function ( req, res )
	{
		// vérifie que le type de route est valide 
		if ( !params.types.includes ( req.body.type ) )
		{
			res.status ( 403 );
			res.json ( {msg:"type "+req.body.type+"invalide, accepté : "+params.types})
			res.end ( );
			return;
		}

		// sauvegarde du score
		if ( req.body.scores )
		{
			req.body.scores = req.body.scores.replace ( /[\n]/g, "" )
				.replace ( /[ \.,;]+/g, "," )
				.split ( "," )
				.map ( v=>{
					if ( isNaN ( v ) )
					{
						console.log ( req.body.name, "invalid score", v )
						return 0;
					}
					else
					{
						return Number ( v );
					}
				})

			if ( "bloc" == req.body.type )
			{
				if ( 2 != req.body.scores.length )
				{
					res.status ( 406 );
					res.json ( {msg:"pour le bloc seul un score de ZONE et de TOP sont requis"})
					res.end ( );
					return;
				}

				req.body.scores = {
					zone: req.body.scores[ 0 ],
					top: req.body.scores[ 1 ],
				};
			}
		}

		// convertion d'une image
		if ( req.body.img )
		{
			let path = "./public/imgs";

			if ( !fs.existsSync ( path ) )
			{
				fs.mkdirSync ( path );
			}

			let ext = req.body.img.split ( ";" )[ 0 ].split ( "/" )[ 1 ];
			let post = 0;
			let imgName = "img_"+req.body.name
			do
			{

				if ( post++ )
				{
					imgName += "_"+post;
				}

				imgName += "."+ext;

				if ( !fs.existsSync ( path+"/"+imgName ) )
				{
					sharp ( Buffer.from ( req.body.img.split(',')[1], 'base64' ) )
						.resize ( 640, 480 )
						.toFile ( path+"/"+imgName, function(err) {} );

					req.body.img = "/imgs/"+imgName;
					break;
				}
			}
			while ( true );
		}

		let index = params.db.routes.map ( v=>v.name ).indexOf ( req.body.name );

		if ( index == -1 )
		{
			params.db.routes.push ( req.body );
		}
		else
		{
			params.db.routes[ index ] = req.body;
		}

		fs.writeFileSync ( params.args.db.routes, JSON.stringify ( params.db.routes, null, 4 ) );

		params.io.to ( "route" ).emit ( "newRoute", req.body );

		res.status ( 200 );
		res.end ( );
	}); // set route

	ajax.post ( "/set/score", function ( req, res )
	{
		if ( -1 >= params?.db?.users?.map ( u=>u.name ).indexOf ( req.body.user ) )
		{
			res.status ( 406 );
			res.json ( {msg:"competiteur inconnu"} );
			res.end ( );
			return;
		}

		if ( -1 >= params?.db?.routes?.map ( v=>v.name ).indexOf ( req.body.route ) )
		{
			res.status ( 406 );
			res.json ( {msg:"voie inconnu"} );
			res.end ( );
			return;
		}

		if ( "Object" != params?.db?.scores?.constructor.name )
		{
			params.db.scores = {};
		}

		if ( !params?.db?.scores[ req.body.user ] )
		{ // if no score table is created for this user
			params.db.scores[ req.body.user ] = {};
		}

		let score = params.db.scores[ req.body.user ]

		if ( !score[ req.body.route ] )
		{
			score[ req.body.route ] = [];
		}

		let route = params.db.routes [ params.db.routes.map ( v=>v.name ).indexOf ( req.body.route ) ];

		let points = 0;

		switch ( route.type )
		{
			case "bloc":
			{
				if ( params.args.mode == "a" )
				{
					points = route.scores[ req.body.score.bloc ] || 0;
				}
				else
				{
					points = req.body.score.bloc;
				}
				break;
			}
			case "diff":
			{
				points = Number ( req.body.score.diff );
				break;
			}
			case "vitesse":
			{
				points = req.body.score.vitesse;
				break;
			}
			case "endurance":
			{
				break;
			}
			case undefined:
			{
				res.status ( 500 );
				res.json ( {msg:"voie invalide"} );
				res.end ( );
				return;
			}
		}

		score[ req.body.route ].push ( points );

		let r = fs.writeFileSync ( params.args.db.scores, JSON.stringify ( params.db.scores, null, 4 ), 'utf8' );

		res.status ( 200 );
		res.end ( );
	}); // set score

	ajax.post ( "/set/value", function ( req, res )
	{
		if ( undefined != params.db.scores?.[ req.body.name ]?.[ req.body.route ]?.[ req.body.index ] )
		{
			params.db.scores[ req.body.name ][ req.body.route ][ req.body.index ] = Number ( req.body.value );

			let r = fs.writeFileSync ( params.args.db.scores, JSON.stringify ( params.db.scores, null, 4 ), 'utf8' );

			res.status ( 200 );
			res.end ( );
		}
		else
		{
			res.status ( 500 );
			res.end ( );
		}
	}); // set value

	ajax.post ( "/set/user", function ( req, res )
	{
		let listInfos = undefined;
		switch ( req.body.group )
		{
			case "admin":
			case "staff":
			{
				if ( "admin" != req.session?.logged )
				{
					params.io.to( "admin" ).emit ( "msg", "un juge tente tente de faire une action admin" );
					res.status ( 403 );
					res.json ( {msg:"droits insufisants"} );
					res.end ( );
					return;
				}
			}
			case "juge":
			{
				listInfos = [ "name", "pass" ];
				break;
			}
			case "competitor":
			{
				listInfos = [ "name", "categorie", "genre", "club" ];
				break;
			}
			default:
			{
				res.status ( 406 );
				res.json ( {msg:"il manque une info : "+key} );
				res.end ( );
				return;
			}
		}

		let error = [];
		listInfos.map ( key=>{
				if ( !req.body[ key ] )
				{
					error.push ( key );
				}
			});

		if ( error.length )
		{
			res.status ( 406 );
			res.json ({
				msg:"il manque des infos",
				keys: error
			});
			res.end ( );
			return;
		}

		let data = {}
		if ( "competitor" == req.body.group )
		{
			let index = params.db.users.map ( u=>u.name ).indexOf ( req.body.name );
			if ( 0 <= index )
			{
				Object.assign ( params.db.users[ index ], req.body );
			}
			else
			{
				params.db.users.push ( req.body );
			}

			checkId ( params.db.users, "dossard" );
			fs.writeFileSync ( params.args.db?.users, JSON.stringify ( params.db.users, null, 4 ) );

			data = req.body;
		}
		else
		{
			params.db.login[ req.body.name ] = {
				pass: crypto.createHash ( 'sha512' ).update ( req.body.pass ).digest ( 'hex' ),
				status: req.body.group,
				error: 0,
			};

			fs.writeFileSync ( params.args.db.login, JSON.stringify ( params.db.login, null, 4 ), "utf8" )
		}

		res.status ( 200 );
		res.json ( data );
		res.end ( );
	}); // user

	ajax.post ( "/db/:cmd/:file", function ( req, res )
	{
		if ( !params.db[ req.params.file ] )
		{
			res.status ( 403 );
			res.end ( );
		}
		else switch ( req.params.cmd )
		{
			case "export":
			{
				res.status ( 200 );
				res.json ( params.db[ req.params.file ] );
				res.end ( );
				break;
			}
			case "set":
			{
				fs.writeFileSync ( params.args.db[ req.params.file ], JSON.stringify ( req.body, null, 4 ), 'utf8' );
				res.status ( 200 );
				res.json ({});
				res.end ( );
				break;
			}
			case "delete":
			{
				switch ( params.db[ req.params.file ].constructor.name )
				{
					case "Array":
					{
						fs.writeFileSync ( params.args.db[ req.params.file ], "[]", 'utf8' );
						break;
					}
					case "Object":
					{
						fs.writeFileSync ( params.args.db[ req.params.file ], "{}", 'utf8' );
						break;
					}
					default:
					{
						res.status ( 403 );
						res.end ( );
						return;
					}
				}

				res.status ( 200 );
				res.json ({});
				res.end ( );
				break;
			}
			default:
			{
				res.status ( 403 );
				res.end ( );
				return;
			}
		}
	}); // db

	return params;
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
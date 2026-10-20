import express from 'express'; // routing module
import fs from 'fs'; // read / write files

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
			case "editor":
			{
				route.push ( "/set/route" );
			}
			case "juge":
			{
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

	params.express.post ( "/halt", function ( req, res )
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

	params.express.post ( "/get/route", function ( req, res )
	{
		// fetch ( "/ajax/get/route", {method:"POST", body: JSON.stringify ( {route:"A"} ), headers: { "Content-Type": "application/json" } } ).then ( console.log )
		res.status ( 200 );
		res.json ( params.db.routes[ params.db.routes.map ( v=>v.name ).indexOf ( req.body.route ) ] );
		res.end ( );
	}); // get route

	params.express.post ( "/set/route/", function ( req, res )
	{
		// vérifie que le type de route est valide 
		if ( !params.types.includes ( req.body.type ) )
		{
			res.status ( 403 );
			res.json ( {msg:"type "+req.body.type+"invalide, accepté : "+params.type})
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
					zone: req.body.score[ 0 ],
					top: req.body.score[ 1 ],
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
			do
			{
				let imgName = "img_"+req.body.route

				if ( post++ )
				{
					imgName += "_"+post;
				}

				imgName += "."+ext;

				if ( !fs.existsSync ( path+"/"+imgName ) )
				{
					fs.writeFileSync ( path+"/"+imgName, Buffer.from ( req.body.img.split(',')[1], 'base64' ) );
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

	return params;
}
import fs from 'fs'; // read / write files
import ejs from "ejs";
import path from "path";
import util from 'util';
import http from "http";
import https from "https";
import crypto from 'crypto'; // sha512
import helmet from 'helmet'; // security module : clickjacking / xss / cross dommain / ...
import express from 'express'; // routing module
import session from 'express-session'; // create session encypted https://github.com/mozilla/node-client-sessions
import bodyParser from 'body-parser'; // parsing data from request
import childProcess from 'child_process';

const exec = util.promisify ( childProcess.exec );

export default async function ( params )
{
	let server = undefined;
	let exp = express ( );

	switch ( params?.args?.server )
	{
		case "http":
		{
			if ( !params?.args?.port )
			{
				params.args.port = 80;
			}

			server = http.createServer ( exp );
			break;
		}
		case "https":
		{
			if ( !params?.args?.port )
			{
				params.args.port = 443;
			}

			if ( !fs.existsSync ( params.args.keyPath ) )
			{
				fs.mkdirSync ( params.args.keyPath, {recursive:true} )
			}

			let options = {
			  key: path.join ( params.args.keyPath,  params?.args?.key ),
			  cert: path.join ( params.args.keyPath, params?.args?.cert ),
			};

			if ( !fs.existsSync ( options.key )
				|| !fs.existsSync ( options.cert ) )
			{
				let cmds = [
					'openssl req -x509 -newkey rsa:'+params?.args?.keySize+' -keyout '+options.key+' -out '+options.cert+' -sha256 -days 3650 -nodes -subj "/C=FR/ST=./L=./O=FFME/OU=./CN=localhost"'
				];

				for ( let c of cmds )
				{
					const { stdout, stderr } = await exec ( c );
				}

				console.log ( " - key doesn't exist create locals " );
				console.log ( Object.values ( options ).map ( s=>'   - '+s ).join ( "\n") );
			}

			options.key = fs.readFileSync ( options.key, "utf8" );
			options.cert = fs.readFileSync ( options.cert, "utf8" );

			server = https.createServer ( options, exp );
			break;
		}
		default:
		{
			throw `server security invalid : requested : ${params?.args?.server}`
		}
	}

	let sessionMiddleware = session ({
		// secret aléatoire à chaque démarrage : les sessions sont en mémoire et perdues au redémarrage
		// de toute façon, les utilisateurs se reconnectent automatiquement avec leur jeton
		secret: crypto.randomBytes ( 64 ).toString ( "hex" ),
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 24 * 60 * 60 * 1000,
			path: '/',
			httpOnly: true, // illisible depuis le JavaScript de la page
			secure: ( "https" == params.args.server ), // envoyé uniquement en HTTPS
			sameSite: "lax", // non envoyé par les requêtes POST / fetch venant d'un autre site
		}
	});

	exp.use ( helmet ({
		contentSecurityPolicy: false,        // définie plus bas, avec le nonce
		strictTransportSecurity: ( "https" == params.args.server ),
	}));
	exp.use ( bodyParser.json( ) );
	exp.use ( bodyParser.urlencoded( {extended: true} ) );
	exp.use ( express.static ( params.path + '/public' ) );
	exp.use ( express.static ( params.path + '/node_modules/socket.io/client-dist' ) );
	exp.engine ( 'html', ejs.renderFile );

	exp.use ( sessionMiddleware );

	exp.use ( function ( req, res, next )
	{
		if ( [ "/", "/login", "/favicon.ico" ].includes ( req.path ) )
		{
			next ( );
		}
		else if ( 0 == req.path.indexOf ( "/ajax" ) )
		{
			next ( );
		}
		else switch ( req.session.logged )
		{
			default:
			{
				req.session.target = req.originalUrl;
				res.redirect ( "/login" );
				break;
			}
		}
	});

	exp.use ( function ( req, res, next )
	{
		res.locals.nonce  = crypto.randomBytes ( 16 ).toString ( "base64" );

		next ( );
	});

	exp.use ( helmet.contentSecurityPolicy({
		directives: {
			scriptSrc: [ "'self'", (req,res)=>`'nonce-${res.locals.nonce}'`],
			upgradeInsecureRequests: ( "https" == params.args.server )
				? []
				: null,
		}
	}));

	params.express = exp;
	params.server = server;
	params.sessionMiddleware = sessionMiddleware;

	return new Promise ( (ok,ko)=>{
		server.listen ( params?.args?.port, function ( )
		{
			console.log ( " - Server type "+ params?.args?.server );
			console.log ( " - Server started on PORT "+ params?.args?.port );

			ok ( params );
		});
	});
}



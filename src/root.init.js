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
import childProcess from 'child_process';

const execFile = util.promisify ( childProcess.execFile );

export default async function ( params )
{
	let server = undefined;
	let exp = express ( );

	let s = params?.args?.server;

	switch ( s?.secure )
	{
		case false:
		{
			if ( !s?.port )
			{
				s.port = 80;
			}

			server = http.createServer ( exp );
			break;
		}
		case true:
		{
			if ( !s?.port )
			{
				s.port = 443;
			}

			if ( !fs.existsSync ( s.tls.path ) )
			{
				fs.mkdirSync ( s.tls.path, {recursive:true} )
			}

			let options = {
			  key:  path.join ( s.tls.path, s.tls.key ),
			  cert: path.join ( s.tls.path, s.tls.cert ),
			};

			if ( !fs.existsSync ( options.key )
				|| !fs.existsSync ( options.cert ) )
			{
				await execFile ( 'openssl', [
					"req", "-x509",
					"-newkey", "rsa:"+s?.tls.size,
					"-keyout", options.key,
					"-out", options.cert,
					"-sha256", "-days", 3650, "-nodes",
					"-subj", "/C=FR/ST=./L=./O=moi/OU=./CN=localhost" ] );

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
			throw `server security invalid : requested : ${s?.secure}`
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
			secure: s.secure, // envoyé uniquement en HTTPS
			sameSite: "lax", // non envoyé par les requêtes POST / fetch venant d'un autre site
		}
	});

	exp.use ( helmet ({
		contentSecurityPolicy: false,        // définie plus bas, avec le nonce
		strictTransportSecurity: s.secure,
	}));
	exp.use ( express.json ( ) ); // lecture des corps de requête JSON ( intégré à express 5 )
	exp.use ( express.urlencoded ( { extended: true } ) );
	exp.set ( 'views', path.join ( params.path, 'views' ) );
	exp.use ( express.static ( path.join ( params.path, 'public' ) ) );
	exp.use ( express.static ( path.join ( params.path, 'node_modules', 'socket.io', 'client-dist' ) ) );
	exp.use ( '/fontawesome', express.static ( path.join ( params.path, 'node_modules', '@fortawesome', 'fontawesome-free' ) ) );
	exp.engine ( 'html', ejs.renderFile );

	exp.use ( sessionMiddleware );

	exp.use ( function ( req, res, next )
	{
		res.locals.nonce  = crypto.randomBytes ( 16 ).toString ( "base64" );

		next ( );
	});

	exp.use ( helmet.contentSecurityPolicy({
		directives: {
			scriptSrc: [ "'self'", (req,res)=>`'nonce-${res.locals.nonce}'`],
			upgradeInsecureRequests: ( s.secure )
				? []
				: null,
		}
	}));

	params.express = exp;
	params.server = server;
	params.sessionMiddleware = sessionMiddleware;

	return new Promise ( (ok,ko)=>{
		server.listen ( s?.port, function ( )
		{
			console.log ( " - Server type "+ ( s?.secure ? "https" : "http" ) );
			console.log ( " - Server started on PORT "+ s?.port );

			ok ( params );
		});
	});
}



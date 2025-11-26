////////////////////////////////////////////////////////////////////////////////
/// import modules
////////////////////////////////////////////////////////////////////////////////
import fs from 'fs'; // read / write files
import crypto from 'crypto'; // sha512
import helmet from 'helmet'; // security module : clickjacking / xss / cross dommain / ...
import express from 'express'; // routing module
import session from "express-session"; // create session encypted https://github.com/mozilla/node-client-sessions
// import session from "client-sessions"; // create session encypted https://github.com/mozilla/node-client-sessions
import bodyParser from 'body-parser'; // parsing data from request
import readline from "readline"; // read text line from input
import ejs from "ejs";
import http from "http";
import https from "https";
import util from 'util';
import childProcess from 'child_process';

let path = "/"+import.meta.url.split ( "/" ).filter ( f=>f ).slice ( 1, -1 ).join ( "/" );
const exec = util.promisify ( childProcess.exec );

let main = {
	init: async ( params )=>{
		main.params = params;

		switch ( main.params?.args?.server )
		{
			case "http":
			{
				if ( !main.params.args.port )
				{
					main.params.args.port = 80;
				}

				main.server = http.createServer ( main.express );
				break;
			}
			case "https":
			{
				if ( !main.params.args.port )
				{
					main.params.args.port = 443;
				}

				let options = {
				  key: main.params?.args.key,
				  cert: main.params?.args.cert,
				};

				if ( !fs.existsSync ( options.key )
					|| !fs.existsSync ( options.cert ) )
				{
					let cmds = [
						'openssl req -x509 -newkey rsa:'+main.params.args.keySize+' -keyout '+options.key+' -out '+options.cert+' -sha256 -days 3650 -nodes -subj "/C=FR/ST=./L=./O=FFME/OU=./CN=localhost"'
					];

					for ( let c of cmds )
					{
						console.log ( "> ", c )
						const { stdout, stderr } = await exec ( c );

						console.log ( stdout )
						console.log ( stderr )
					}
				}

				options.key = fs.readFileSync ( options.key, "utf8" );
				options.cert = fs.readFileSync ( options.cert, "utf8" );

				main.server = https.createServer ( options, main.express );
				break;
			}
			default:
			{
				throw "server security invalid"
			}
		}

		main.server.listen ( main.params.args.port, function ( )
		{
			console.log ( " - Server started on PORT "+ main.params.args.port );
		});
	
		params.sessionMiddleware = sessionMiddleware;
	},
	express: express ( ),
}

////////////////////////////////////////////////////////////////////////////////
/// engine part
////////////////////////////////////////////////////////////////////////////////
main.express.use ( helmet ( ) );
main.express.use ( bodyParser.json( ) );
main.express.use ( bodyParser.urlencoded( {extended: true} ) );
main.express.use ( express.static ( path + '/public' ) );
main.express.engine ( 'html', ejs.renderFile );

let sessionMiddleware = session ({
	secret: crypto.createHash( 'sha512' ).update( Math.random ( ).toString ( Math.floor ( Math.random ( ) * 34 ) + 2 ) ).digest( "hex" ),
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 24 * 60 * 60 * 1000,
		path: '/',
		httpOnly: true,
		secure: false,
	}
});

main.express.use ( sessionMiddleware );

main.express.use ( function ( req, res, next )
{
	res.locals.nonce  = crypto.randomBytes ( 16 ).toString ( "hex" );
	res.locals.page   = req.originalUrl;
	res.locals.mode   = main.params.args.mode;
	res.locals.halt   = main.params.args.halt;

	switch ( req.session.logged )
	{
		case "admin":
		case "juge":
		{
			res.locals.logged = req.session?.logged;
			break;
		}
		default:
		{
			res.locals.logged = false;
			break;
		}
		case "editor":
		{
			// during the competition editor are down classed to juge only
			// reduce nav barre
			if ( main.params.interval )
			{
				res.locals.logged = "juge";
			}
			else
			{
				res.locals.logged = "editor";
			}
			break;
		}
	}

	next ( );
} );

main.express.use ( function ( req, res, next )
{
	req.originalUrl = req.originalUrl.replace ( /\?$/, "" );
	if ( [ "/", "/login", "/favicon.ico" ].includes ( req.originalUrl ) )
	{
		next ( );
	}
	else if ( 0 == req.originalUrl.indexOf ( "/ajax" ) )
	{
		next ( );
	}
	else switch ( req.session.logged )
	{
		case "admin":
		{ // admin can edit addUser event during competition
			if ( [ "/admin" ].includes ( req.originalUrl ) )
			{
				next ( );
				break;
			}
		}
		case "editor":
		{
			if ( [ "/addUser", "/road", "/edit" ].includes ( req.originalUrl ) )
			{
				next ( );
				break;
			}
		}
		case "juge":
		{
			if ( [ "/set" ].includes ( req.originalUrl ) )
			{
				next ( );
				break;
			}
		}
		default:
		{
			req.session.target = req.originalUrl;
			res.redirect ( "/login" );
		}
	}
});

main.express.use ( helmet.contentSecurityPolicy({
	directives: {
		scriptSrc: [ "'self'", (req,res)=>`'nonce-${res.locals.nonce}'`]
	}
}))

////////////////////////////////////////////////////////////////////////////////
/// public route part
////////////////////////////////////////////////////////////////////////////////
main.express.all ( '/', function ( req, res )
{
	res.render ( 'main.html' );
});

main.express.all ( '/statistiques', function ( req, res )
{
	res.render ( 'statistiques.html' );
});

main.express.all ( '/results', function ( req, res )
{
	res.render ( 'fullDisplay.html' );
});

main.express.all ( '/login', function ( req, res )
{
	if ( req.session.logged )
	{ // logout requested
		let index = main.params?.db?.login.map ( l=>l.name ).indexOf ( req.session.name );

		if ( 1 != index.length )
		{
			delete main.params.db.login[ index ].token;
		}

		fs.writeFileSync ( main.params.args.login, JSON.stringify ( main.params?.db?.login, null, 1 ).replace ( / /g, "\t" ), "utf8" )
	}

	req.session.logged = false;
	res.render ( 'login.html', {logged:false} );
});

////////////////////////////////////////////////////////////////////////////////
/// private route part
////////////////////////////////////////////////////////////////////////////////

main.express.all ( "/set", function ( req, res )
{
	res.render ( 'set.html' );
});

main.express.all ( "/edit", function ( req, res )
{
	res.render ( 'edit.html' );
});

main.express.all ( "/road", function ( req, res )
{
	res.render ( 'road.html' );
});

main.express.all ( "/addUser", function ( req, res )
{
	if ( main.params?.interval
		&& "admin" != req.session?.logged )
	{
		res.redirect ( "/" );
	}

	res.render ( 'addUser.html' );
});

main.express.all ( "/admin", function ( req, res )
{
	res.render ( 'admin.html' );
});

export default main;

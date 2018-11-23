// const declaration
const scoreDataBase = './private/score.json';
const voieDataBase = './private/voie.json';
const userDataBase = './private/users.json';
const loginDataBase = './private/login.json';
const port = 6683;

// modules declaration
const program = require ( 'commander' );
const express = require ( 'express' );
const session = require ( "client-sessions" ); // create session encypted https://github.com/mozilla/node-client-sessions
const helmet = require ( 'helmet' );

const bodyParser = require ( 'body-parser' );
const fs = require ( 'fs' );
const crypto = require ( 'crypto' );
const favicon = require ( 'serve-favicon' );
const cryptico = require ( 'cryptico' ); // generated RSA key for password encryption http://wwwtyro.github.io/cryptico/

// own module declaration
const RSA = require ( './RSA_gen' );

// get user data base
let score = {};
let voie = [];
let users = [];
let login = {};

if ( fs.existsSync ( scoreDataBase ) )
{
	score = require ( scoreDataBase );
}

if ( fs.existsSync ( voieDataBase ) )
{
	voie = require ( voieDataBase );
}

if ( fs.existsSync ( userDataBase ) )
{
	users = require ( userDataBase );
}

if ( fs.existsSync ( loginDataBase ) )
{
	login = require ( loginDataBase );
}

// engine part
var app = express ( );
var server = require ( 'http' ).createServer ( app ).listen ( port, function ( )
{
	console.log ( "App Started on PORT "+ port );
});
// SSL/TLS part
// options = {
// 	key: fs.readFileSync('ssl/private.key', 'utf8'),
// 	cert: fs.readFileSync('ssl/public.crt', 'utf8')
// };
// server = require ( 'https' ).createServer ( options, app ).listen ( port );

app.use ( helmet ( ) );

app.use ( session ( {
	cookieName: 'authenticated', // cookie name dictates the key name added to the request object
	secret: crypto.createHash( 'sha512' ).update( Math.random ( ).toString ( Math.floor ( Math.random ( ) * 34 ) + 2 ) ).digest( "hex" ),
	duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
	cookie:
	{
		path: '/', // cookie will only be sent to requests under '/api'
		ephemeral: true, // when true, cookie expires when the browser closes
		httpOnly: true, // when true, cookie is not accessible from javascript
		secure: false // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
	}
} ) );
app.use ( function ( req, res, next )
{
	if ( req.authenticated.seenyou )
	{
		res.setHeader('X-Seen-You', 'true');
	}
	else
	{
		// setting a property will automatically cause a Set-Cookie response to be sent
		req.authenticated.seenyou = true;
		res.setHeader('X-Seen-You', 'false');
	}
	next ( );
} );
app.use ( bodyParser.json( ) );
app.use ( bodyParser.urlencoded( {extended: true} ) );
app.use ( favicon ( __dirname + '/public/imgs/climbing.png' ) ) // Active la favicon indiquée
app.use ( express.static ( __dirname + '/public' ) );
app.engine ( 'html', require ( 'ejs' ).renderFile );

// route part
app.all ( '/', function ( req, res )
{
	res.render ( 'acceuil.html', {
		loged:req.authenticated.loged || false,
		users:users,
		voie:voie,
		score:score,
		page:"acceuil"
	} );
});

app.all ( '/statistiques', function ( req, res )
{
	res.render ( 'statistiques.html', {
		loged:req.authenticated.loged || false,
		users:users,
		voie:voie,
		score:score,
		page:"statistiques"
	} );
});

app.all ( '/login', function ( req, res )
{
	let pass = null;
	let user = null;

	if ( req.body.data )
	{
		req.body.data = cryptico.decrypt ( req.body.data, RSA.private );

		if ( req.body.data.status &&
			( req.body.data.status == "failure" ) )
		{
			console.log( "failed to decrypt data" );
		}
		else
		{
			let tmp = JSON.parse ( req.body.data.plaintext );
			pass = tmp.password;
			user = tmp.user;
		}
	}

	if ( RSA.public )
	{
		if ( login[ user ] )
		{
			if ( login[ user ].error > 4 )
			{ // too many errors
				req.authenticated.loged = false;
				res.writeHead ( 401 );
				res.end ( "too many errors, contact server admin" );
			}
			else if ( login[ user ].pass == pass )
			{ // login valid
				req.authenticated.loged = true;
				login[ user ].error = 0;

				res.writeHead ( 200 );
				res.end ( "valid" );
			}
			else
			{ // pass error
				req.authenticated.loged = false;
				res.writeHead ( 403 );

				if( !login[ user ].error )
				{
					login[ user ].error = 0;
				}
				login[ user ].error++;

				res.end ( login[ user ].error+'' );
			}
		}
		else
		{ // login not valid
			req.authenticated.reset();
			req.authenticated.loged = false;
			res.render ( 'login.html', { pubKey:RSA.public } );
		}
	}
	else
	{
		res.render ( 'wait.html', { msg:"RSA key not available, you should wait a momment plz" } );
	}
});

app.all ( '/set/:id', function ( req, res )
{
	if ( req.authenticated.loged )
	{
		res.render ( 'set.html', {
			loged:req.authenticated.loged,
			users:users,
			voie:voie,
			page:req.params.id
		} );
	}
	else
	{
		res.redirect ( '/' );
	}
});

// ajax part
app.all ( '/validate', function ( req, res )
{
	if ( req.authenticated.loged )
	{
		if ( !userExist ( req.body.usr ) )
		{
			res.writeHead ( 500 );
			res.end ( "ko" );
		}
		else
		{
			if ( !score[ req.body.usr ] )
			{
				score[ req.body.usr ] = [];
			}

			if ( !score[ req.body.usr ][ req.body.voie ] )
			{
				score[ req.body.usr ][ req.body.voie ] = [];
			} 
			score[ req.body.usr ][ req.body.voie ].push ( req.body.points );

			fs.writeFileSync ( scoreDataBase, JSON.stringify ( score ), 'utf8' );

			io.emit ( 'scores', req.body );

			res.writeHead ( 200 );
			res.end ( "ok" );
		}
	}
});

app.all ( '/addUser', function ( req, res )
{
	if ( req.authenticated.loged )
	{
		if ( req.body.name )
		{
			if ( !userExist( req.body.name ) )
			{
				let tmp = {};
				tmp.name = req.body.name;
				tmp.categorie = req.body.categorie;
				tmp.genre = req.body.genre;
				tmp.club = req.body.club;

				users.push ( tmp );
				fs.writeFileSync ( userDataBase, JSON.stringify ( users ), 'utf8' );
				io.emit ( 'users', tmp );

				res.status(200);
				res.end ( "added" );
			}
			else
			{
				res.status(500);
				res.end ( "exist" );
			}
		}
		else
		{	
			res.render ( 'addUser.html', {
				loged:req.authenticated.loged,
				users:users,
				voie:voie,
				page:req.params.id
			} );
		}
	}
	else
	{
		res.render ( 'acceuil.html', {
			loged:req.authenticated.loged,
			users:users,
			voie:voie,
			score:score,
			page:"acceuil"
		} );
	}
});

app.all ( '/userExist', function ( req, res )
{
	if ( ( req.body.user != undefined ) && 
		userExist( req.body.user ) )
	{
		res.status(200);
		res.end ( "exist" );
	}
	else
	{
		res.status(200);
		res.end ( "no" );
	}
});

app.all ( '/getClub', function ( req, res ) 
{
	let clubs = [];
	for ( let i = 0; i < users.length; i++ )
	{
		if ( users[ i ].club && 
			( users[ i ].club.indexOf ( req.body.partName ) >= 0 ) &&
			!clubs.includes ( users[ i ].club ) )
		{
			clubs.push ( users[ i ].club );
		}
	}
	res.status(200);
	res.end ( JSON.stringify ( clubs ) );
});

// error management
app.use ( function ( req, res, next )
{
	res.render ( 'error.html' );
	res.status(404);
});

// socket part
var io = require ( 'socket.io' ).listen ( server );

io.on ( 'connection', function( socket )
{
	// socket.emit ( 'id', id );

	socket.on ( 'msg', function ( msg )
	{
		// prepare next id
		// io.emit ( 'id', id + 1 );

		// fs.writeFileSync ( msgDataBase, JSON.stringify ( msgs ), 'utf8' );
		// socket.emit ( 'act', id );

		// socket.broadcast.emit ( 'msg', data);
	});
});

// RSA keygen part
RSA.status.on ( 'ready', () => 
{
	io.emit( 'waitKey', 'ok' );
	console.log ( 'ok' );
});
RSA.status.on ( 'failed', () =>
{
	io.emit( 'waitKey', 'error' );
	console.log ( 'error' );
});

RSA.init ( {length:4096} );

// utils functions
function userExist ( name )
{
	for ( let i = 0; i < users.length; i++ )
	{
		if ( users[ i ].name == name )
		{
			return ( true );
		}
	}
	return ( false );
}
const scoreDataBase = './private/score.json';
const voieDataBase = './private/voie.json';
const userDataBase = './private/users.json';
const port = 6683;

const program = require ( 'commander' );
const express = require ( 'express' );
const session = require ( 'express-session' );
const bodyParser = require ( 'body-parser' );
const fs = require ( 'fs' );
const crypto = require ( 'crypto' );
const favicon = require ( 'serve-favicon' );

// get user data base
let score = {};
let voie = [];
let users = [];

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
var io = require ( 'socket.io' ).listen ( server );

app.use ( bodyParser.json( ) );
app.use ( bodyParser.urlencoded( {extended: true} ) );
app.use ( favicon ( __dirname + '/public/imgs/climbing.png' ) ) // Active la favicon indiquée
app.use ( express.static ( __dirname + '/public' ) );
app.use ( session ( { secret: Math.random()+'', proxy: true,  resave: true, saveUninitialized: true } ) );
app.engine ( 'html', require ( 'ejs' ).renderFile );

app.all ( '/', function ( req, res )
{
	res.render ( 'acceuil.html', {
		loged:req.session.loged,
		users:users,
		voie:voie,
		score:score,
		page:"acceuil"
	} );
});

app.all ( '/statistiques', function ( req, res )
{
	res.render ( 'statistiques.html', {
		loged:req.session.loged,
		users:users,
		voie:voie,
		score:score,
		page:"statistiques"
	} );
});

app.all ( '/login', function ( req, res )
{
	var pass = "";
	if ( req.body.password != undefined )
	{
		pass = crypto.createHash( 'sha512' ).update( req.body.password ).digest( "hex" );
	}

	if ( ( req.body.user == 'fpe' ) &&
		( req.body.password == 'test' ) )
	{
		req.session.loged = true;

		res.writeHead ( 200 );
		res.end ( "valid" );
	}
	else
	{
		req.session.loged = false;
		res.render ( 'login.html' );
	}
});

app.all ( '/set/:id', function ( req, res )
{
	if ( req.session.loged )
	{
		res.render ( 'set.html', {
			loged:req.session.loged,
			users:users,
			voie:voie,
			page:req.params.id
		} );
	}
	else
	{
		res.render ( 'acceuil.html', {
			loged:req.session.loged,
			users:users,
			voie:voie,
			score:score,
			page:"acceuil"
		} );
	}
});

app.all ( '/validate', function ( req, res )
{
	if ( req.session.loged )
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
	if ( req.session.loged )
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
				loged:req.session.loged,
				users:users,
				voie:voie,
				page:req.params.id
			} );
		}
	}
	else
	{
		res.render ( 'acceuil.html', {
			loged:req.session.loged,
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

app.use ( function ( req, res, next)
{
	res.render ( 'error.html' );
	res.status(404);
});

io.on('connection', function( socket )
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
// engine part
var app = express ( );
var server = require ( 'http' ).createServer ( app ).listen ( args.port, function ( )
{
	console.log ( "App Started on PORT "+ args.port );
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
	res.render ( 'accueil.html', {
		loged:req.authenticated.loged || false,
		users:database.users,
		voie:database.voie,
		score:database.score,
		page:"accueil",
		mode:mode
	} );
});

app.all ( '/statistiques', function ( req, res )
{
	res.render ( 'statistiques.html', {
		loged:req.authenticated.loged || false,
		users:database.users,
		voie:database.voie,
		score:database.score,
		mode:mode,
		page:"statistiques"
	} );
});

app.all ( '/getResults', function ( req, res )
{
	res.render ( 'fullDisplay.html', {
		loged:req.authenticated.loged,
		users:database.users,
		voie:database.voie,
		score:database.score,
		mode:mode,
		page:"getResults",
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
		if ( database.login[ user ] )
		{
			if ( database.login[ user ].error > 4 )
			{ // too many errors
				req.authenticated.loged = false;
				res.writeHead ( 401 );
				res.end ( "too many errors, contact server admin" );
			}
			else if ( database.login[ user ].pass == pass )
			{ // login valid
				req.authenticated.loged = true;
				database.login[ user ].error = 0;

				res.writeHead ( 200 );
				res.end ( "valid" );
			}
			else
			{ // pass error
				req.authenticated.loged = false;
				res.writeHead ( 403 );

				if( !database.login[ user ].error )
				{
					database.login[ user ].error = 0;
				}
				database.login[ user ].error++;

				res.end ( database.login[ user ].error+'' );
			}
		}
		else
		{ // login not valid
			req.authenticated.reset();
			req.authenticated.loged = false;
			res.render ( 'login.html', { 
				pubKey:RSA.public,
				loged:false,
				page:"login",
			} );
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
			users:database.users,
			voie:database.voie,
			page:req.params.id,
			mode:mode
		} );
	}
	else
	{
		res.redirect ( '/' );
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
				tmp.club = req.body.club.toUpperCase ( );

				database.users.push ( tmp );
				fs.writeFileSync ( args.user, JSON.stringify ( database.users ), 'utf8' );
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
				users:database.users,
				voie:database.voie,
				score:database.score,
				mode:mode,
				page:"addUser"
			} );
		}
	}
	else
	{
		res.redirect ( '/' );
	}
});

app.all ( '/edit', function (req, res )
{
	if ( req.authenticated.loged )
	{
		if ( !userExist( req.body.name ) )
		{
			res.render ( 'edit.html', {
				loged:req.authenticated.loged,
				users:database.users,
				voie:database.voie,
				score:database.score,
				mode:mode,
				page:"edit"
			});
		}
	}
	else
	{
		res.redirect ( '/' );
	}
})

// ajax part
app.all ( '/validate', function ( req, res )
{
	if ( req.authenticated.loged )
	{
		if ( !userExist ( req.body.usr ) )
		{ // if user doesn't exist
			res.writeHead ( 500 );
			res.end ( "ko" );
		}
		else
		{
			if ( !database.score[ req.body.usr ] )
			{ // if no score table is created for this user
				database.score[ req.body.usr ] = {};
			}

			if ( !database.score[ req.body.usr ][ req.body.voie ] )
			{
				database.score[ req.body.usr ][ req.body.voie ] = [];
			}

			if ( req.body.resultId )
			{
				if ( req.body.points == "void" )
				{
					database.score[ req.body.usr ][ req.body.voie ].splice( req.body.resultId, 1 );
				}
				else
				{
					database.score[ req.body.usr ][ req.body.voie ][ req.body.resultId ] = ( req.body.points );
				}
			}
			else
			{
				database.score[ req.body.usr ][ req.body.voie ].push ( req.body.points );
			}

			fs.writeFileSync ( args.score, JSON.stringify ( database.score ), 'utf8' );

			io.emit ( 'scores', req.body );

			res.writeHead ( 200 );
			res.end ( "ok" );
		}
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
	for ( let i = 0; i < database.users.length; i++ )
	{
		if ( database.users[ i ].club && 
			( database.users[ i ].club.indexOf ( req.body.partName.toUpperCase ( ) ) >= 0 ) &&
			!clubs.includes ( database.users[ i ].club ) )
		{
			clubs.push ( database.users[ i ].club );
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

		// fs.writeFileSync ( args.msg, JSON.stringify ( msgs ), 'utf8' );
		// socket.emit ( 'act', id );

		// socket.broadcast.emit ( 'msg', data);
	});
});

// utils functions
function userExist ( name )
{
	for ( let i = 0; i < database.users.length; i++ )
	{
		if ( database.users[ i ].name == name )
		{
			return ( true );
		}
	}
	return ( false );
}
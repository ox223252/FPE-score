// convertit une valeur en littéral JavaScript sûr à insérer dans un <script> :
// JSON gère les guillemets / antislashs, on neutralise en plus < > & ( pas de </script> possible )
// et les séparateurs de ligne U+2028 / U+2029
function toJs ( value )
{
	return JSON.stringify ( value ?? null )
		.replace ( /</g, "\\u003c" )
		.replace ( />/g, "\\u003e" )
		.replace ( /&/g, "\\u0026" )
		.replace ( /\u2028/g, "\\u2028" )
		.replace ( /\u2029/g, "\\u2029" );
}

export default function ( params )
{
	console.log ( "   - Init Root part" );

	params.express.use ( function ( req, res, next )
	{
		let routes = [];

		if ( req.path.startsWith ( "/ajax/" ) )
		{
			return next ( );
		}

		switch ( req.session.logged )
		{
			default:
			{
				routes.push ( "/" );
				routes.push ( "/login" );
				break;
			}
		}

		if ( routes.includes ( req.path ) )
		{
			next ( );
		}
		else
		{
			req.session.target = req.originalUrl;
			res.redirect ( "/login" );
		}
	});

	params.express.use ( function ( req, res, next )
	{
		res.locals.title = params.name;
		res.locals.user = req.session.user || "unknow";
		res.locals.page = req.path;
		res.locals.logged = req.session.logged;
		res.locals.js = toJs; // à utiliser dans les vues : <%- js ( valeur ) %>

		next ( );
	});

	params.express.get ( '/', function ( req, res )
	{
		res.render ( 'main.html' );
	});

	params.express.get ( '/login', function ( req, res )
	{
		req.session.logged = false;

		if ( req.session.hashToken )
		{
			params.login.logout ( req.session.hashToken );

			delete req.session.hashToken;
			delete req.session.token;
		}

		res.render ( 'login.html' );
	});

	return params;
}
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

function getRoutes ( params )
{
	if ( !params.db.routes )
	{
		return [];
	}

	return params.db.routes
		.filter ( x=>"Array" == x.categories?.constructor.name )
		.filter ( r1=>r1.categories?.some ( r2=>params.categories.includes ( r2 ) ) );
}

function getUsers ( params )
{
	if ( !params.db.users )
	{
		return [];
	}

	return params.db.users
		.filter ( u=>params.categories?.includes ( u.categorie ) );
}

export default function ( params )
{
	console.log ( "   - Init Root part" );

	params.express.use ( function ( req, res, next )
	{
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
			case "staff":
			{
				// during the competition staff are down classed to juge only
				// reduce nav barre
				if ( params.interval )
				{
					res.locals.logged = "juge";
				}
				else
				{
					res.locals.logged = "staff";
				}
				break;
			}
		}

		next ( );
	});

	params.express.use ( function ( req, res, next )
	{
		let routes = [];

		if ( req.path.startsWith ( "/ajax/" ) )
		{
			console.log ( "AJAX" );
			return next ( );
		}

		switch ( res.locals.logged )
		{
			case "admin":
			{ // admin can edit addUser event during competition
				routes.push ( "/admin" );
				routes.push ( "/edit" );
			}
			case "staff":
			{
				routes.push ( "/addUser" );
				routes.push ( "/road" );
			}
			case "juge":
			{
				routes.push ( "/set" );
			}
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
		res.locals.js = toJs; // à utiliser dans les vues : <%- js ( valeur ) %>

		next ( );
	});

	params.express.get ( '/', function ( req, res )
	{
		res.locals.types = params.types;
		res.locals.users = getUsers ( params );
		res.locals.routes = getRoutes ( params );
		res.locals.scores = params.db.scores;

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

	params.express.all ( "/addUser", function ( req, res )
	{
		res.locals.categories = params.args.categories ?? [];
		res.locals.users = getUsers ( params );
		res.locals.genres = params.args.genres ?? [];

		res.render ( 'addUser.html' );
	});

	params.express.all ( "/admin", function ( req, res )
	{
		res.locals.types = params.types;
		res.locals.users = getUsers ( params );
		res.locals.routes = getRoutes ( params );
		res.locals.categories = params.args.categories;

		res.render ( 'admin.html' );
	});

	params.express.all ( "/set", function ( req, res )
	{
		res.locals.types = params.types;
		res.locals.users = getUsers ( params );
		res.locals.routes = getRoutes ( params );

		res.render ( 'set.html' );
	});

	params.express.all ( "/edit", function ( req, res )
	{
		res.locals.scores = params.db.scores;
		res.locals.users = getUsers ( params );
		res.locals.routes = getRoutes ( params );

		res.render ( 'edit.html' );
	});

	params.express.all ( "/road", function ( req, res )
	{
		res.locals.types = params.types;
		res.locals.categories = params.args.categories;
		res.locals.mode = params.args.mode;
		res.locals.routes = getRoutes ( params );

		res.render ( 'road.html' );
	});

	return params;
}
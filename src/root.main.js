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
				if ( params.interval )
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
	});

	params.express.use ( function ( req, res, next )
	{
		let routes = [];

		if ( req.path.startsWith ( "/ajax/" ) )
		{
			return next ( );
		}

		switch ( res.locals.logged )
		{
			case "admin":
			{ // admin can edit addUser event during competition
				routes.push ( "/admin" );
			}
			case "editor":
			{
				routes.push ( "/addUser" );
				routes.push ( "/road" );
				routes.push ( "/edit" );
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
		res.locals.users = params.db.users.filter ( u=>params.categories.includes ( u.categorie ) );
		res.locals.routes = params.db.routes.filter ( r1=>r1.categories.some ( r2=>params.categories.includes ( r2 ) ) );
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
		res.locals.users = params.db.users ?? [];
		res.locals.genres = params.args.genres ?? [];

		res.render ( 'addUser.html' );
	});

	params.express.all ( "/admin", function ( req, res )
	{
		res.locals.types = params.types;
		res.locals.routes = params.db.routes;
		res.locals.categories = params.args.categories;
		res.locals.users = params.db.users;

		res.render ( 'admin.html' );
	});

	params.express.all ( "/set", function ( req, res )
	{
		res.locals.types = params.types;
		res.locals.routes = params.db.routes.filter ( r1=>r1.categories.some ( r2=>params.categories.includes ( r2 ) ) );
		res.locals.users = params.db.users.filter ( u=>params.categories.includes ( u.categorie ) );

		res.render ( 'set.html' );
	});

	params.express.all ( "/edit", function ( req, res )
	{
		res.locals.users = params.db.users;
		res.locals.scores = params.db.scores;
		res.locals.routes = params.db.routes.filter ( r1=>r1.categories.some ( r2=>params.categories.includes ( r2 ) ) );

		res.render ( 'edit.html' );
	});

	params.express.all ( "/road", function ( req, res )
	{
		res.locals.types = params.types;
		res.locals.routes = params.db.routes;
		res.locals.categories = params.args.categories;

		res.render ( 'road.html' );
	});

	return params;
}
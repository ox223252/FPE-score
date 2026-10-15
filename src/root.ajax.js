import express from 'express'; // routing module

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
			default:
			{
				route.push ( "/login" );
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
	});

	return params;
}
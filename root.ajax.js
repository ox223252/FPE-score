////////////////////////////////////////////////////////////////////////////////
/// import modules
////////////////////////////////////////////////////////////////////////////////
import fs from 'fs'; // read / write files
import crypto from 'crypto'; // sha512
import helmet from 'helmet'; // security module : clickjacking / xss / cross dommain / ...
import express from 'express'; // routing module
import bodyParser from 'body-parser'; // parsing data from request
import readline from "readline"; // read text line from input
import ejs from "ejs";
import http from "http";

Array.prototype.distinct = function () { return Array.from ( new Set ( this ) ); };

let ajax = {
	init: ( rooter, params )=>{
		ajax.params = params;
		rooter.use ( "/ajax", ajax.express )
	},
	express: express.Router ( ),
}


ajax.express.use ( function ( req, res, next )
{
	let url = req.originalUrl.replace ( "/ajax", "" );

	if ( true == req.session.logged )
	{
		next ( );
	}
	else if ( [ "/login" ].includes ( url ) )
	{
		next ( );
	}
	else if ( 0 == url.indexOf ( "/get" ) )
	{
		next ( );
	}
	else
	{
		res.writeHead ( 403 );
	}
})

////////////////////////////////////////////////////////////////////////////////
/// engine part
////////////////////////////////////////////////////////////////////////////////
// ajax part
ajax.express.all ( "/login", function ( req, res )
{
	if ( req.body.token )
	{
		for ( let user in ajax.params?.db?.login )
		{
			if ( ajax.params?.db?.login?.[ user ]?.token == req.body.token )
			{
				req.session.logged = true;
				req.session.name = user;
				break;
			}
		}

		if ( true == req.session.logged )
		{
			res.status ( 200 );
			res.json ( {target:req.session.target || "/"} );
			res.end ( );
		}
		else
		{
			res.status ( 403 );
			res.json ( {} );
			res.end ( );
		}
	}
	else if ( ajax.params?.db?.login?.[ req.body?.user ]
		|| 0 == Object.keys ( ajax.params?.db?.login || {} ).length )
	{
		if ( 0 == Object.keys ( ajax.params?.db?.login || {} ).length )
		{
			ajax.params.db.login[ req.body.user ] = {
				pass: crypto.createHash ( 'sha512' ).update ( req.body.password ).digest ( 'hex' ),
			};
		}

		let dbU = ajax.params?.db?.login?.[ req.body?.user ];

		if ( dbU.error > ajax.params.maxTry )
		{
		}
		else if ( dbU?.pass == crypto.createHash ( 'sha512' ).update ( req.body?.password ).digest ( 'hex' ) )
		{
			req.session.logged = true;
			req.session.name = req.body?.user;

			if ( !dbU.token )
			{
				dbU.token = crypto.createHash ( 'sha512' ).update ( Math.random ( ).toString ( ) ).digest ( 'hex' );
			}

			dbU.date = new Date ( ).getTime ( );
			dbU.error = 0;

			fs.writeFileSync ( ajax.params.args.login, JSON.stringify ( ajax.params?.db?.login, null, 4 ), "utf8" )
			res.json ( {token: dbU.token,target:req.session.target || "/"} );
			res.status ( 200 );
			res.end ( );
			return;
		}
		else
		{
			dbU.error++;
		}

		res.status ( 403 );
		res.json ( {try: ajax.params?.args?.try - dbU.error } );
		res.end ( );
	}
	else
	{
		res.status ( 403 );
		res.json ( {} );
		res.end ( );
	}
})

export default ajax;

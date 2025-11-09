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
import util from 'util';
import childProcess from 'child_process';

const exec = util.promisify ( childProcess.exec );

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

	if ( req.session.logged )
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
		res.end ( );
	}
})

////////////////////////////////////////////////////////////////////////////////
/// engine part
////////////////////////////////////////////////////////////////////////////////
// ajax part
ajax.express.all ( "/login", function ( req, res )
{
	try
	{
		let index = 0;

		if ( req.body.token )
		{ // token connection
			index = ajax.params?.db?.login.map ( u=>u.token ).indexOf ( req.body.token );

			if ( index == -1 )
			{
				throw undefined;
			}
		}
		else if ( !req.body?.password
			|| !req.body?.user )
		{
			throw {error:"nom ou pass manquant"};
		}
		else if ( !ajax.params?.db?.login?.length )
		{ // first connection
			index = 0;

			ajax.params.db.login = [];
			ajax.params.db.login.push ({
				name: req.body.user,
				pass: crypto.createHash ( 'sha512' ).update ( req.body.password ).digest ( 'hex' ),
				status: "admin",
				error: 0,
			});
		}
		else
		{
			index = ajax.params.db.login.map ( u=>u.name ).indexOf ( req.body?.user );

			if ( index == -1 )
			{
				throw {error:"utilisateur invalide"};
			}

			if ( ajax.params.db.login[ index ].error > ajax.params.maxTry )
			{
				throw {error:"trop d'erreur avec ce nom"};
			}

			if ( ajax.params.db.login[ index ].pass != crypto.createHash ( 'sha512' ).update ( req.body?.password ).digest ( 'hex' ) )
			{
				ajax.params.db.login[ index ].error++;
				throw {
					error: "mavais mot de passe",
					try: ajax.params.maxTry-ajax.params.db.login[ index ].error
				};
			}
		}

		let out = {
			target: req.session.target || "/",
			token: ajax.params.db.login[ index ].token,
		};

		if ( !ajax.params.db.login[ index ].token )
		{
			ajax.params.db.login[ index ].token = crypto.createHash ( 'sha512' ).update ( Math.random ( ).toString ( ) ).digest ( 'hex' );
		}

		ajax.params.db.login[ index ].test = "AAA";
		ajax.params.db.login[ index ].date = new Date ( ).getTime ( );
		ajax.params.db.login[ index ].error = 0;

		req.session.logged = ajax.params.db.login[ index ].status || true;
		req.session.name = ajax.params.db.login[ index ].name;

		fs.writeFileSync ( ajax.params.args.login, JSON.stringify ( ajax.params.db.login, null, 4 ), "utf8" );

		res.status ( 200 );
		res.json ( {target:req.session.target || "/"} );
		res.end ( );
	}
	catch ( e )
	{
		console.log ( e )
		res.status ( 403 );
		res.json ( e || {} );
		res.end ( );
	}
})

ajax.express.all ( "/halt", async function ( req, res )
{
	if ( !ajax?.params?.args?.halt )
	{
		res.writeHead ( 403 );
		res.end ( );
	}
	else if ( "admin" == res.locals?.logged )
	{
		await exec ( 'halt' );
		res.writeHead ( 200 );
		res.end ( );
	}
	else
	{
		res.writeHead ( 403 );
		res.end ( );
	}
})

export default ajax;

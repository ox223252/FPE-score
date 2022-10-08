// const declaration
let scoreDataBase = './private/score.json';
let voieDataBase = './private/voie.json';
let userDataBase = './private/users.json';
const loginDataBase = './private/login.json';

// modules declaration
const express = require ( 'express' );
const session = require ( "client-sessions" ); // create session encypted https://github.com/mozilla/node-client-sessions
const helmet = require ( 'helmet' );

const bodyParser = require ( 'body-parser' );
const fs = require ( 'fs' );
const crypto = require ( 'crypto' );
const favicon = require ( 'serve-favicon' );
const cryptico = require ( 'cryptico' ); // generated RSA key for password encryption http://wwwtyro.github.io/cryptico/

////////////////////////////////////////////////////////////////////////////////
// read arg from cmd line
////////////////////////////////////////////////////////////////////////////////
const args = require('yargs')
	.option('help', {
		alias: 'h',
		type: 'boolean',
		describe: 'this window',
	})
	.option('port', {
		alias: 'p',
		describe: 'connection port',
		default: 80
	})
	.option('keySize',{
		alias: 'k',
		describe: 'user login for SQL databse connection',
		default: 4096
	})
	.option('mode',{
		alias: 'm',
		describe: 'a/b/c/d/v',
		default: 'a'
	})
	.option('voie',{
		alias: 'v',
		describe: '/path/to/file',
		default: ""
	})
	.option('score',{
		alias: 's',
		describe: '/path/to/file',
		default: ""
	})
	.option('user',{
		alias: 'u',
		describe: '/path/to/file',
		default: ""
	})
	.option('login',{
		alias: 'l',
		describe: '/path/to/file',
		default: "./private/login.json"
	})
	.argv;

////////////////////////////////////////////////////////////////////////////////
// read databases
////////////////////////////////////////////////////////////////////////////////
let data = {
	score: {},
	voie:  [],
	users: [],
	login: {},
}

for ( let file of [ "user", "score", "voie", "login" ])
{
	if ( fs.existsSync ( file ) )
	{
		data[ file ] = require ( file );
	}
}

////////////////////////////////////////////////////////////////////////////////
/// RSA declaration
////////////////////////////////////////////////////////////////////////////////
process.argv = [ ];
const RSA = require ( './RSA_gen' );

////////////////////////////////////////////////////////////////////////////////
/// engine part
////////////////////////////////////////////////////////////////////////////////
eval( fs.readFileSync ( "./webEngine.js" ) + '' );

////////////////////////////////////////////////////////////////////////////////
/// RSA management part
////////////////////////////////////////////////////////////////////////////////

RSA.status.on ( 'ready', () => 
{
	io.emit( 'waitKey', 'ok' );
	console.log ( 'key generated' );
});
RSA.status.on ( 'failed', () =>
{
	io.emit( 'waitKey', 'error' );
	console.log ( 'key generation failed' );
});

RSA.init ( {length:args.keySize} );
let params = {
	rebootPending: false,
	db:{
		path:{
			score: './private/score',
			voies: './private/voie',
			users: './private/users',
			login: './private/login',
		},
		score: {},
		voies: [],
		users: [],
		login: {},
	},
};


////////////////////////////////////////////////////////////////////////////////
// read arg from cmd line
////////////////////////////////////////////////////////////////////////////////
import yargs from 'yargs'
const args = yargs(process.argv)
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
	.option('mode',{
		alias: 'm',
		describe: 'a/b/c/d/v autre/block/combiné/dif/vitesse',
		choices: [ "a", "b", "c", "d", "v", "autre", "block", "contest", "dif", "vitesse" ],
		default: 'a'
	})
	.option('voies',{
		alias: 'v',
		describe: '/path/to/file',
		default: params.db.path.voies
	})
	.option('score',{
		alias: 's',
		describe: '/path/to/file',
		default: params.db.path.score
	})
	.option('users',{
		alias: 'u',
		describe: '/path/to/file',
		default: params.db.path.users
	})
	.option('login',{
		alias: 'l',
		describe: '/path/to/file',
		default: params.db.path.login
	})
	.option('try',{
		describe: "max try before ban",
		default: 4
	})
	.option("server",{
		describe: 'server type',
		choices: [ 'http', 'https' ],
		default: 'https',
	})
	.option("key",{
		describe: "private key",
		default: "res/private-key.pem",
	})
	.option('keySize',{
		describe: 'user login for SQL databse connection',
		default: 4096
	})
	.option("key",{
		describe: "private key",
		default: "res/private-key.pem",
	})
	.option("cert",{
		describe: "private key",
		default: "res/certificate.pem",
	})
	.argv;

params.args = args;

////////////////////////////////////////////////////////////////////////////////
// read databases
////////////////////////////////////////////////////////////////////////////////
import {dbInit} from "./db.js"

dbInit ( params );

////////////////////////////////////////////////////////////////////////////////
// calc rank for existing scores
////////////////////////////////////////////////////////////////////////////////
import {calcAll} from "./calc.js"
calcAll ( params );

////////////////////////////////////////////////////////////////////////////////
/// root/ajax part
////////////////////////////////////////////////////////////////////////////////
import rooter from "./root.main.js";
import ajax from "./root.ajax.js";

rooter.init ( params )
ajax.init ( rooter.express, params );

////////////////////////////////////////////////////////////////////////////////
/// IO socket
////////////////////////////////////////////////////////////////////////////////
import socketIO from "./ioSocket.js";
socketIO ( rooter.server, params );
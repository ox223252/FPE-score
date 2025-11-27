let params = {
	db:{
		path:{
			score: './private/score',
			voies: './private/voies',
			users: './private/users',
			login: './private/login',
		},
		score: {},
		voies: [],
		users: [],
		login: [],
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
		default: undefined
	})
	.option('mode',{
		alias: 'm',
		describe: 'a/b/c/d/v autre/bloc/combiné/dif/vitesse',
		choices: [ "a", "b", "c", "d", "v", "autre", "bloc", "contest", "dif", "vitesse" ],
		default: 'a'
	})
	.option('categories', {
		alias: "c",
		type: "array",
		describe: "competitor available categorie",
		default: [ "U9", "U11", "U13", "U15", "U17", "U19", "senior", "veteran" ],
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
	.option("halt",{
		type: 'boolean',
		describe: "allow halt button on HMI",
		default: false,
	})
	.argv;

params.args = args;

switch ( params.args.mode )
{
	case "a":
	case "autre":
	{
		params.type = [ "diff","bloc","endurance","vitesse","slack" ];
		break;
	}
	case "b":
	case "bloc":
	{
		params.type = [ "bloc" ];
		break;
	}
	case "c":
	case "contest":
	{
		params.type = [  "diff","bloc","vitesse" ];
		break;
	}
	case "d":
	case "diff":
	{
		params.type = [  "diff" ];
		break;
	}
	case "v":
	case "vitesse":
	{
		params.type = [  "vitesse" ];
		break;
	}
	default:
	{
		throw "pas encore fait"
	}
}

////////////////////////////////////////////////////////////////////////////////
// read databases
////////////////////////////////////////////////////////////////////////////////
import {dbInit} from "./db.js"
dbInit ( params );

import {checkId} from "./fnct.js"
checkId ( params.db.users, "dossard", params.args?.users );

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
////////////////////////////////////////////////////////////////////////////////
/// IO socket
////////////////////////////////////////////////////////////////////////////////
import socketIO from "./ioSocket.js";

(async()=>{
	await rooter.init ( params )
	await ajax.init ( rooter.express, params );
	await socketIO ( rooter.server, params );
})();
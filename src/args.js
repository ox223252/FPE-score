import 'dotenv/config';   // avant l'appel à yargs
import path from "path";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export default function ( params )
{
	let base = params.name.toUpperCase ( )
		.replace ( /\s/g, "" );

	params.args = yargs ( hideBin ( process.argv ) )
		.scriptName ( params.name )
		.usage ( `${params.name} : ${params.description}\nUsage : $0 [options]` )
		.wrap ( Math.min ( 180, process.stdout.columns ?? 120 ) )
		// toute option peut aussi venir de l'environnement : <base>_<OPTION>
		// camelCase -> MOT_MOT, "." -> "__" ( ex : --login.mode = <base>_LOGIN__MODE )
		// priorité : ligne de commande > environnement > défaut
		.env ( base )
		.option ( 'help', {
			alias: 'h',
			type: 'boolean',
			describe: 'this window',
		})
		.option ( 'debug', {
			alias: 'd',
			type: 'boolean',
			describe: 'activate debug mode',
		})
		// server
			.option ( 'server.port', {
				type: 'number',
				describe: 'app port',
			})
			.option ( 'server.secure', {
				describe: 'active or not tls http(s)',
				type: 'boolean',
				default: true,
			})
			.option ( 'server.tls.path', {
				describe: "credential path for key and certs",
				default: "private",
			})
			.option ( 'server.tls.key', {
				describe: "private key",
				default: "key.pem",
			})
			.option ( 'server.tls.cert', {
				describe: "certificate",
				default: "certificate.pem",
			})
			.option ( 'server.tls.size', {
				describe: 'size of key',
				type: 'number',
				default: 4096
			})
		// login
			.option ( 'login.mode', {
				describe: 'user login mode',
				choices: [ 'linux', 'file', 'ad' ],
				default: 'file',
			})
			.option ( 'login.tokenDuration', {
				describe: 'lifetime of "remember me" tokens, in days',
				type: 'number',
				default: 30,
			})
			.option ( 'login.maxAttempts', {
				describe: 'max login attempts per IP before blocking',
				type: 'number',
				default: 10,
			})
			.option ( 'login.lockMinutes', {
				describe: 'duration of the login attempts window / block, in minutes',
				type: 'number',
				default: 15,
			})
			.option ( 'login.file', {
				describe: 'file for user by file ( file using JSON format )',
				default: 'private/userDB.js',
			})
			.option ( 'login.linux.group', {
				describe: 'name of group for user from linux',
				default: 'loginForNodeApp',
			})
			.option ( 'login.linux.pamService', {
				describe: 'PAM service used to check linux passwords ( /etc/pam.d/<service> )',
				default: 'login',
			})
			.option ( 'login.ad.domain', {
				describe: 'add <login>@domain.com to login if needed',
				default: '',
			})
			.option ( 'login.ad.url', {
				describe: 'ldaps://serveur:636 ( ldap:// = mots de passe en clair )',
				type: 'string',
			})
			.option ( 'login.ad.group', {
				describe: 'DN of the group allowed to connect ( ex : CN=AppUsers,OU=Groupes,DC=domaine,DC=fr )',
				type: 'string',
			})
			.option ( 'login.ad.bind.user', {
				describe: `service account DN ( optional )`,
				type: 'string',
			})
			.option ( 'login.ad.bind.password', {
				describe: `service account password ( optional )`,
				type: 'string',
			})
			.option ( 'login.ad.baseDN', {
				alias: 'login.ad.baseDn', // <base>_LOGIN__AD__BASE_DN donne baseDn
				describe: 'search base ( ex : DC=domaine,DC=fr )',
				type: 'string',
			})
			.option ( 'login.ad.recursive', {
				describe: 'search user on direct group and indirect',
				type: 'boolean',
				default: true,
			})
		// app specific
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
			.option('db.routes',{
				describe: '/path/to/file',
				default: "private/routes.js"
			})
			.option('db.scores',{
				describe: '/path/to/file',
				default: "private/scores.js"
			})
			.option('db.users',{
				describe: '/path/to/file',
				default: "private/users.js"
			})
			.option("halt",{
				type: 'boolean',
				describe: "allow halt button on HMI",
				default: false,
			})
		.group ( [ 'help', 'version', 'debug' ], 'Général :' )
		.group ( [ 'mode', 'categories', 'db.routes', 'db.scores', 'db.users', 'halt' ], 'Spécific :' )
		.group ( [ 'server.port', 'server.secure', 'server.tls.path', 'server.tls.key', 'server.tls.cert', 'server.tls.size' ], 'Serveur :' )
		.group ( [ 'login.mode', 'login.tokenDuration', 'login.maxAttempts', 'login.lockMinutes' ], 'Connexion :' )
		.group ( [ 'login.file' ], 'Mode fichier :' )
		.group ( [ 'login.linux.group', 'login.linux.pamService' ], 'Mode Linux :' )
		.group ( [ 'login.ad.url', 'login.ad.domain', 'login.ad.group', 'login.ad.bind.user', 'login.ad.bind.password', 'login.ad.baseDN', 'login.ad.recursive' ], 'Mode Active Directory :' )
		.epilog ( `Toute option peut être passée par variable d\'environnement : ${base}_<OPTION>, camelCase -> MOT_MOT, "." -> "__"\n`
			+ `ex : ${base}_SERVER__PORT=8443 ${base}_LOGIN__MODE=ad ${base}_LOGIN__AD__BASE_DN="DC=domaine,DC=fr"\n`
			+ 'la ligne de commande reste prioritaire sur l\'environnement' )
		.argv;

	params.args.server.tls.path = path.resolve ( params.path, params.args.server.tls.path );
	params.args.login.file = path.resolve ( params.path, params.args.login.file );

	return Promise.resolve ( params );
}

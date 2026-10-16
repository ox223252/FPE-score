import path from "path";
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers';

export default function ( params )
{
	params.args = yargs ( hideBin ( process.argv ) )
		// toute option peut aussi venir de l'environnement : NODEBASE_<OPTION>
		// camelCase -> MOT_MOT, "." -> "__" ( ex : --login.mode = NODEBASE_LOGIN__MODE )
		// priorité : ligne de commande > environnement > défaut
		.env ( 'NODEBASE' )
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
		.option ( 'port', {
			alias: 'p',
			type: 'number',
			describe: 'app port',
		})
		.option ( 'server', {
			describe: 'server type',
			choices: [ 'http', 'https' ],
			default: 'https',
		})
		.option ( 'keyPath', {
			describe: "credential path for key and certs",
			default: "private",
		})
		.option ( 'key', {
			describe: "private key",
			default: "key.pem",
		})
		.option ( 'cert', {
			describe: "certificate",
			default: "certificate.pem",
		})
		.option ( 'keySize', {
			describe: 'size of key',
			type: 'number',
			default: 4096
		})
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
		.option ( 'login.ad.bindDN', {
			alias: 'login.ad.bindDn', // NODEBASE_LOGIN__AD__BIND_DN donne bindDn
			describe: 'service account DN ( optional, password in env NODEBASE_AD_PASSWORD )',
			type: 'string',
		})
		.option ( 'login.ad.baseDN', {
			alias: 'login.ad.baseDn', // NODEBASE_LOGIN__AD__BASE_DN donne baseDn
			describe: 'search base ( ex : DC=domaine,DC=fr )',
			type: 'string',
		})
		.option ( 'login.ad.recursive', {
			describe: 'search user on direct group and indirect',
			type: 'boolean',
			default: true,
		})
		.epilog ( 'Toute option peut être passée par variable d\'environnement : NODEBASE_<OPTION>, camelCase -> MOT_MOT, "." -> "__"\n'
			+ 'ex : NODEBASE_PORT=8443 NODEBASE_LOGIN__MODE=ad NODEBASE_LOGIN__AD__BASE_DN="DC=domaine,DC=fr"\n'
			+ 'la ligne de commande reste prioritaire sur l\'environnement' )
		.argv;

	// NODEBASE_AD_PASSWORD porte le préfixe : yargs le récupère en adPassword.
	// db.user.js le lit directement dans process.env, on le retire pour qu'il n'apparaisse pas dans params.args ( logs debug )
	delete params.args.adPassword;
	delete params.args[ 'ad-password' ];

	params.args.keyPath = path.resolve ( params.path, params.args.keyPath );
	params.args.login.file = path.resolve ( params.path, params.args.login.file );

	return Promise.resolve ( params );
}

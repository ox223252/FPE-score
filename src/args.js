import yargs from 'yargs'

export default function ( params )
{
	params.args = yargs ( process.argv )
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
			describe: "private key",
			default: "certificate.pem",
		})
		.option ( 'keySize', {
			describe: 'user login for SQL databse connection',
			type: 'number',
			default: 4096
		})
		.option ( 'login.mode', {
			describe: 'user login mode',
   			choices: [ 'linux', 'file', 'activeDirectory' ],
			default: 'file',
		})
		.option ( 'login.group', {
			describe: 'name of group for user from linux',
			default: 'loginForNodeApp',
		})
		.option ( 'login.pamService', {
			describe: 'PAM service used to check linux passwords ( /etc/pam.d/<service> )',
			default: 'login',
		})
		.option ( 'login.file', {
			describe: 'file for user by file ( file using JSON format )',
			default: 'private/userDB.js',
		})
		.option ( 'login.ad.port', {
			describe: 'ldap : 389, ldaps : 636',
			type: 'number',
			default: 389,
		})
		.option ( 'login.ad.url', {
			describe: 'ldap(s) login url',
			type: 'url',
			default: undefined,
		})
		.option ( 'login.ad.baseDN', {
			describe: 'dc=XXX,dc=YYY',
			default: '',
		})
		.option ( 'login.ad.domain', {
			describe: 'add <login>@domain.com to login if needed',
			default: '',
		})
		.argv;

	return Promise.resolve ( params );
}

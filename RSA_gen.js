const cryptico = require ( 'cryptico' );
const EventEmitter = require('events');
const { fork } = require ( 'child_process' );
const crypto = require ( 'crypto' );



if ( process.argv[ 2 ] &&
	JSON.parse ( process.argv[ 2 ] ).async )
{
	let argv = JSON.parse ( process.argv[ 2 ] );

	let passPhrase = crypto.createHash( 'sha512' ).update( Math.random ( ).toString ( Math.floor ( Math.random ( ) * 34 ) + 2 ) ).digest( "hex" );
	if ( argv.secret )
	{
		passPhrase = argv.secret;
	}

	let bitSize = 4096;
	if ( argv.length )
	{
		bitSize = argv.length;
	}

	function serializeRSAKey ( key )
	{
		return JSON.stringify({
			coeff: key.coeff.toString(16),
			d: key.d.toString(16),
			dmp1: key.dmp1.toString(16),
			dmq1: key.dmq1.toString(16),
			e: key.e.toString(16),
			n: key.n.toString(16),
			p: key.p.toString(16),
			q: key.q.toString(16)
		})
	}
	


	process.send ( serializeRSAKey ( cryptico.generateRSAKey ( passPhrase, bitSize ) ) );
	process.exit ( 0 );
}
else
{
	let RSA_Module = {
		status : new EventEmitter ( ),
		private : null,
		public : null,
		args : undefined,

		init : async function ( obj )
		{
			if ( obj &&
				( typeof obj == "object" ) )
			{
				RSA_Module.args = obj;
				RSA_Module.args.async = true;
			}
			else
			{
				RSA_Module.args = { async: true };
			}

			try
			{
				RSA_Module.private = await RSA_Module.initPrivate ( );
				RSA_Module.public = await RSA_Module.initPublic ( RSA_Module.private );
	  			RSA_Module.status.emit ( 'ready' );
			}
			catch ( e )
			{
	  			RSA_Module.status.emit ( 'failed' );
	  			console.log ( e );
			}
		},

		initPrivate : function ( )
		{
			return ( new Promise ( (resolve, reject) =>
				{
					const child = fork ( __filename, [ JSON.stringify ( RSA_Module.args ) ] );
					
					let result = '';

					child.on ( 'message', ( data ) =>
					{
						result = cryptico.RSAKey.parse ( data );
					});

					child.on ( 'close', function(code) 
					{
						resolve ( result );
					});	
				})
			);
		},

		initPublic : function ( private )
		{
			return ( new Promise ( (resolve, reject) =>
				{
					let key = cryptico.publicKeyString ( private );
					if ( key )
					{
						resolve ( key );
					}
					else
					{
						reject ( null );
					}
				})
			);
		},

		decrypt : cryptico.decrypt,
		encrypt : cryptico.encrypt,
	};

	module.exports = RSA_Module;
}
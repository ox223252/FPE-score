const cryptico = require ( 'cryptico' );
const EventEmitter = require('events');
const { fork } = require ( 'child_process' );
const crypto = require ( 'crypto' );

let RSA_Module = {
	status : new EventEmitter ( ),
	private : null,
	public : null,

	init : async function ( )
	{
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
				const child = fork ( 'RSA_Child.js', [] );
				
				let result = '';

				child.on ( 'message', ( data ) =>
				{
					console.log ( typeof data );
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
	}
};

module.exports = RSA_Module;
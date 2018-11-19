const cryptico = require ( 'cryptico' );
const crypto = require ( 'crypto' );

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

if ( process.send )
{
	process.send ( serializeRSAKey ( cryptico.generateRSAKey ( crypto.createHash( 'sha512' ).update( Math.random ( ).toString ( Math.floor ( Math.random ( ) * 34 ) + 2 ) ).digest( "hex" ), 4092 ) ) );
	process.exit ( 0 );
}
else
{
	console.log ( serializeRSAKey ( cryptico.generateRSAKey ( crypto.createHash( 'sha512' ).update( Math.random ( ).toString ( Math.floor ( Math.random ( ) * 34 ) + 2 ) ).digest( "hex" ), 4092 ) ) );
}

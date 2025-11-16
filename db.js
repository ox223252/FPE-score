import fs from 'fs'; // read / write files
import JSON5 from "json5"; // json with comment

export function dbInit ( params )
{
	for ( let key in params.db.path )
	{
		if ( !fs.existsSync ( params.db.path[ key ] ) )
		{
			continue;
		}

		let data =fs.readFileSync ( params.db.path[ key ], "utf8" );

	 	try {
			params.db[ key ] = JSON5.parse ( data );
		}
		catch ( e )
		{
			params.db[ key ] = data;
		}
	}
}
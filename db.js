import fs from 'fs'; // read / write files

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
			params.db[ key ] = JSON.parse ( data );
		}
		catch ( e )
		{
			params.db[ key ] = data;
		}
	}
}

// watcher
// 	.on ( 'add', ( path )=>{
// 		if ( !watcherParams )
// 		{
// 			return;
// 		}

// 		fs.readFile ( path, "utf8", function ( err,data ) {
// 				watcherParams.io
// 					.in ( "room-log" )
// 					.emit( "setFile", {
// 						name: path,
// 						data: data.split ( "\n" ),
// 					})
// 			});
// 	})
// 	.on ( "change", ( path )=>{
// 		if ( !watcherParams )
// 		{
// 			return;
// 		}

// 		fs.readFile ( path, "utf8", function ( err,data ) {
// 			watcherParams.io
// 				.in ( "room-log" )
// 				.emit( "updateFile", {
// 					fielName: path,
// 					data: data.split ( "\n" ),
// 				})
// 		});
// 	})
// 	.on ( 'unlink', ( path )=>{
// 		if ( !watcherParams )
// 		{
// 			return;
// 		}

// 		watcherParams.io
// 			.in ( "room-log" )
// 			.emit( "rmFile", path )
// 	})
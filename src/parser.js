export function users ( data )
{
	let lines = data.split ( "\n" );
	let keys = lines.shift ( ).split ( ";" );

	return lines.map ( line=>{
		let obj = {};

		line.split ( ";" )
			.map ( (cell,index)=>{
				obj[ keys[ index ] ] = cell;
			})

		if ( obj.categories )
		{
			obj.categories = obj.categories.split ( "," );
		}

		return obj;
	});
}

export function routes ( data )
{
	let lines = data.split ( "\n" );
	let keys = lines.shift ( ).split ( ";" );

	return lines.map ( line=>{
		let obj = {};

		line.split ( ";" )
			.map ( (cell,index)=>{
				obj[ keys[ index ] ] = cell;
			})

		if ( obj.categories )
		{
			obj.categories = obj.categories.split ( "," );
			console.log ( obj.categories )
		}

		if ( obj.score ) try
		{
			obj.score = JSON.parse ( obj.score.replace ( /'/g, '"' ) );
		}
		catch ( e )
		{
			obj.score = obj.score.split ( "," );
		}

		return obj;
	});
}
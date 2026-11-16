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
			obj.categories = obj.categories.split ( / / );
		}

		if ( obj.scores ) try
		{
			obj.scores = JSON.parse ( obj.scores.trim ( ).replace ( /'/g, '"' ) );
		}
		catch ( e )
		{
			obj.scores = obj.scores.split ( / / );
		}

		if ( "bloc" == obj.type
			&& "Array" == obj.scores?.constructor?.name )
		{
			obj.scores = {
				top: Math.max ( ...obj.scores ),
				zone: Math.min ( ...obj.scores )
			};
		}

		return obj;
	});
}
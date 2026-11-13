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

		// if ( "bloc" == r.type )
		// {
		// 	r.scores = {
		// 		zone: r.scores[ 0 ],
		// 		top: r.scores[ 1 ]
		// 	};
		// }

		return obj;
	});
}

export function voies ( data )
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

		// if ( "bloc" == r.type )
		// {
		// 	r.scores = {
		// 		zone: r.scores[ 0 ],
		// 		top: r.scores[ 1 ]
		// 	};
		// }

		return obj;
	});
}
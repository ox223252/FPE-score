export function calcAll ( params )
{
	for ( let voie in params.db.voies )
	{
		params.db.voies[ voie ].meta = {
			total: 0, // totals de points
			tryed: 0, // nombre dessais
			users: 0, // nombre d'utilisateur ayant tentés
			results: [], // repartition des resultas,
		}
	}

	return new Promise ( (ok,ko)=>{
		// calc total of points
		switch ( params.args.mode )
		{
			case "a":
			case "autre":
			{
				params.db.users.map ( user=>{
					if ( !params.db.score[ user.name ] )
					{ // ceux qui n'ont pas particiés
						return;
					}

					params.db.score[ user.name ].total = 0;
					for ( let voie in params.db.score[ user.name ] )
					{
						if ( "Array" != params.db.score[ user.name ][ voie ].constructor.name )
						{
							continue;
						}

						params.db.score[ user.name ].total += Math.max ( ...params.db.score[ user.name ][ voie ] );

						if ( !params.db.voies[ voie ] )
						{
							continue;
						}

						params.db.voies[ voie ].meta.users++;

						params.db.score[ user.name ][ voie ].map ( v=>{
							params.db.voies[ voie ].meta.tryed++;
							params.db.voies[ voie ].meta.total += v;
							if ( !params.db.voies[ voie ].meta.results[ v ] )
							{
								params.db.voies[ voie ].meta.results[ v ] = 1;
							}
							else
							{
								params.db.voies[ voie ].meta.results[ v ]++;
							}
						})
					}
				})
				break;
			}
		}

		// calc rank
		switch ( params.args.mode )
		{
			case "a":
			case "autre":
			{
				let users = Object.keys ( params.db.score )
				users.sort ( (a,b)=>{ return params.db.score[ b ].total - params.db.score[ a ].total })
					.map ( (user,i)=>{
						params.db.score[ user ].rank = (i+1);
					})
				break;
			}
		}

		ok ( );
	})
}
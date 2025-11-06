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
			case "b":
			case "bloc":
			{
				params.db.users.map ( user=>{
					if ( !params.db.score[ user.name ] )
					{ // ceux qui n'ont pas particiés
						return;
					}

					params.db.score[ user.name ].total = "";

					let top = 0;
					let zone = 0;
					let echec = 0;

					for ( let voie in params.db.score[ user.name ] )
					{
						if ( "Array" != params.db.score[ user.name ][ voie ].constructor.name )
						{
							continue;
						}

						if ( !params?.db?.voies?.[ voie ] )
						{
							continue;
						}

						if ( !params.db.voies[ voie ]?.meta?.results )
						{
							params.db.voies[ voie ].meta = {
								tryed: 0,
								results: {
									top: 0,
									zone: 0,
									echec: 0,
								}
							}
						}

						params.db.voies[ voie ].meta.tryed++;

						if ( params.db.score[ user.name ][ voie ].some ( v=>v=="top" ) )
						{
							params.db.voies[ voie ].meta.results.top++;
							top++;
						}
						
						let z = params.db.score[ user.name ][ voie ].filter ( v=>v=="zone" ).length;
						zone += z;
						params.db.voies[ voie ].meta.results.zone += z;

						let e = params.db.score[ user.name ][ voie ].filter ( v=>v=="echec" ).length;
						echec += e;
						params.db.voies[ voie ].meta.results.zone += e;

						params.db.voies[ voie ].meta.users++;
					}

					params.db.score[ user.name ].total = {
						top,
						zone,
						echec,
					};
				})
				break;
			}
			case "d":
			case "diff":
			{
				let full = {};

				let voies = Object.keys ( params.db.voies );
				let uS = Object.keys ( params.db.score );

				uS.map ( k=>{
					voies.map ( v=>{
						if ( !full[ v ] )
						{
							full[ v ] = [];
						}

						if ( "Array" == params.db.score?.[ k ]?.[ v ]?.constructor.name )
						{
							full[ v ].push ( Math.max ( params.db.score?.[ k ]?.[ v ] ) );
						}
					});
					
					params.db.score[ k ].total = 0;
				})

				for ( let v in full )
				{
					if ( !full[ v ].length )
					{
						delete full[ v ];
						continue;
					}

					full[ v ].sort ( (a,b)=>b-a )
				}

				voies = Object.keys ( full );

				uS.map ( k=>{
					voies.map ( v=>{
						let value = undefined;
						if ( "Array" == params.db.score?.[ k ]?.[ v ]?.constructor.name )
						{
							value = Math.max ( params.db.score?.[ k ]?.[ v ] );
						}
						else
						{
							value = params.db.score?.[ k ]?.[ v ];
						}

						let t = full[ v ].indexOf ( value );

						if ( 0 > t )
						{
							t = uS.length;
						}
						t++;

						params.db.score[ k ].total += t * t;
					});

					params.db.score[ k ].total = Math.sqrt ( params.db.score[ k ].total );
				});
				break;
			}
		}

		let users = Object.keys ( params.db.score );

		// calc rank
		switch ( params.args.mode )
		{
			case "a":
			case "autre":
			{
				users.sort ( (a,b)=>{ return params.db.score[ b ].total - params.db.score[ a ].total })
					.map ( (user,i)=>{
						params.db.score[ user ].rank = (i+1);
						return user;
					})
				break;
			}
			case "b":
			case "bloc":
			{
				function cmp ( a, b )
				{
					if ( ( ( undefined != a.top )
						|| ( undefined != b.top ) )
						&& ( a.top != b.top ) )
					{
						return a.top - b.top;
					}
					else if ( ( ( undefined != a.zone )
						|| ( undefined != b.zone ) )
						&& ( a.zone != b.zone ) )
					{
						return b.zone - a.zone;
					}
					else if ( ( ( undefined != a.echec )
						|| ( undefined != b.echec ) )
						&& ( a.echec != b.echec ) )
					{
						return b.echec - a.echec;
					}
					else
					{
						return 0;
					}
				}

				users.sort ( (a,b)=>{return cmp ( params.db.score[ b ].total, params.db.score[ a ].total ) })
					.map ( (user,i)=>{
						params.db.score[ user ].rank = (i+1);
						let t = params.db.score[ user ].total;
						params.db.score[ user ].total = "";
						for ( let key in t )
						{
							if ( t[ key ] )
							{
								params.db.score[ user ].total += t[ key ]+key.charAt ( 0 )+" ";
							}
						}

						return user;
					})
				break;
			}
			case "d":
			case "diff":
			{
				users.sort ( (a,b)=>{
						return params.db.score[ a ].total-params.db.score[ b ].total
					})
					.map ( (user,i)=>{
						params.db.score[ user ].rank = (i+1);
						return user;
					})

				break;
			}
		}

		users.map ( (user,i,array)=>{ // manage ex aequo
				if ( 0 == i )
				{
					return user;
				}

				if ( params.db.score[ user ].total == params.db.score[ array[ i - 1 ] ].total )
				{
					params.db.score[ user ].rank = params.db.score[ array[ i - 1 ] ].rank;
				}

				return user;
			})

		ok ( );
	})
}
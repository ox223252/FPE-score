export function calcAll ( params )
{
	for ( let voie in params.db.voies )
	{
		params.db.voies.map ( v=>{
			v.meta = {
				total: 0, // totals de points
				tryed: 0, // nombre dessais
				users: 0, // nombre d'utilisateur ayant tentés
				results: [], // repartition des resultas,
			}
		});
	}

	let local = {
		speed: {}
	};

	params.db.voies.filter ( v=>{
			return "vitesse" == v.type;
		})
		.map ( v=>{
			local.speed[ v.name ] = [];
			return v.name;
		});

	// recuperation du meilleur chrono de chaque grimpeur sur chaque voie de vitesse
	Object.keys ( params.db.score ).map ( u=>{
			Object.keys ( params.db.score[ u ] ).map ( v=>{
				if ( !local.speed[ v ] )
				{
					return;
				}
				local.speed[ v ].push ( Math.min ( ...params.db.score[ u ][ v ] ) )
			})
		})

	// reordonne les resultat dans l'ordre decroissant (plus rapide au debut)
	Object.keys ( local.speed ).map ( v=>{
			local.speed[ v ] = local.speed[ v ].sort ( (a,b)=>a-b);
		})

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

						let currentVoie = params.db.voies.filter ( v=>v.name == voie )?.[ 0 ];

						if ( !currentVoie )
						{
							continue;
						}

						switch ( currentVoie.type )
						{
							case "vitesse":
							{
								let index = local.speed[ voie ]?.indexOf ( Math.min ( ...params.db.score[ user.name ]?.[ voie ] ) );

								if ( ( undefined == index )
									|| ( 0 > index )
									|| ( index > 50 ) )
								{
								}
								else
								{
									params.db.score[ user.name ].total += 50 - index;
								}
								break;
							}
							default:
							{
								params.db.score[ user.name ].total += Math.max ( ...params.db.score[ user.name ][ voie ] );
								break;
							}
						}

						currentVoie.meta.users++;

						// params.db.score[ user.name ][ voie ].map ( v=>{
						// 	currentVoie.meta.tryed++;
						// 	currentVoie.meta.total += v;
						// 	console.log ( currentVoie.meta.results[ v ] )
						// 	if ( !currentVoie.meta.results[ v ] )
						// 	{
						// 		currentVoie.meta.results[ v ] = 1;
						// 	}
						// 	else
						// 	{
						// 		currentVoie.meta.results[ v ]++;
						// 	}
						// 	console.log ( currentVoie.meta.results[ v ] )
						// })
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

						let currentVoie = params.db.voies.filter ( v=>v.name == voie )?.[ 0 ];

						if ( !currentVoie )
						{
							continue;
						}

						if ( !currentVoie?.meta?.results )
						{
							currentVoie.meta = {
								tryed: 0,
								results: {
									top: 0,
									zone: 0,
									echec: 0,
								}
							}
						}

						currentVoie.meta.tryed++;

						if ( params.db.score[ user.name ][ voie ].some ( v=>v=="top" ) )
						{
							currentVoie.meta.results.top++;
							top++;
						}
						
						let z = params.db.score[ user.name ][ voie ].filter ( v=>v=="zone" ).length;
						zone += z;
						currentVoie.meta.results.zone += z;

						let e = params.db.score[ user.name ][ voie ].filter ( v=>v=="echec" ).length;
						echec += e;
						currentVoie.meta.results.zone += e;

						currentVoie.meta.users++;
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
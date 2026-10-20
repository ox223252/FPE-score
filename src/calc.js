/// \biref calc rank
/// \param [ in ] db : obect with routes, scores, users
/// \param [ in ] mode : string with competition mode [ a, b, d ]
export function calcAll ( db, mode )
{
	if ( !db.scores
		|| !db.routes
		|| !db.users )
	{
		return Promise.reject ( );
	}

	for ( let route in db.routes )
	{
		db.routes.map ( v=>{
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

	db.routes.filter ( v=>{
			return "vitesse" == v.type;
		})
		.map ( v=>{
			local.speed[ v.name ] = [];
			return v.name;
		});

	// recuperation du meilleur chrono de chaque grimpeur sur chaque voie de vitesse
	Object.keys ( db.scores ).map ( u=>{
			Object.keys ( db.scores[ u ] ).map ( v=>{
				if ( !local.speed[ v ] )
				{
					return;
				}
				local.speed[ v ].push ( Math.min ( ...db.scores[ u ][ v ] ) )
			})
		})

	// reordonne les resultat dans l'ordre croissant (plus rapide au debut)
	Object.keys ( local.speed ).map ( v=>{
			local.speed[ v ] = local.speed[ v ].sort ( (a,b)=>a-b);
		})

	return new Promise ( (ok,ko)=>{
		// calc total of points
		switch ( mode )
		{
			case "a":
			case "autre":
			{
				db.users.map ( user=>{
					if ( !db.scores[ user.name ] )
					{ // ceux qui n'ont pas particiés
						return;
					}

					db.scores[ user.name ].total = 0;
					for ( let route in db.scores[ user.name ] )
					{
						if ( "Array" != db.scores[ user.name ][ route ].constructor.name )
						{
							continue;
						}

						let currentVoie = db.routes.filter ( v=>v.name == route )?.[ 0 ];

						if ( !currentVoie )
						{
							continue;
						}

						switch ( currentVoie.type )
						{
							case "vitesse":
							{
								let index = local.speed[ route ]?.indexOf ( Math.min ( ...db.scores[ user.name ]?.[ route ] ) );

								if ( ( undefined == index )
									|| ( 0 > index )
									|| ( index > 50 ) )
								{
								}
								else
								{
									db.scores[ user.name ].total += 50 - index;
								}
								break;
							}
							default:
							{
								db.scores[ user.name ].total += Math.max ( ...db.scores[ user.name ][ route ] );
								break;
							}
						}

						currentVoie.meta.users++;

						// db.score[ user.name ][ voie ].map ( v=>{
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
				db.users.map ( user=>{
					if ( !db.scores[ user.name ] )
					{ // ceux qui n'ont pas particiés
						return;
					}

					db.scores[ user.name ].total = "";

					let top = 0;
					let zone = 0;
					let echec = 0;

					for ( let route in db.scores[ user.name ] )
					{
						if ( "Array" != db.scores[ user.name ][ route ].constructor.name )
						{
							continue;
						}

						if ( !db?.routes?.[ route ] )
						{
							continue;
						}

						let currentVoie = db.routes.filter ( v=>v.name == route )?.[ 0 ];

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

						if ( db.scores[ user.name ][ route ].some ( v=>v=="top" ) )
						{
							currentVoie.meta.results.top++;
							top++;
						}
						
						let z = db.scores[ user.name ][ route ].filter ( v=>v=="zone" ).length;
						zone += z;
						currentVoie.meta.results.zone += z;

						let e = db.scores[ user.name ][ route ].filter ( v=>v=="echec" ).length;
						echec += e;
						currentVoie.meta.results.zone += e;

						currentVoie.meta.users++;
					}

					db.scores[ user.name ].total = {
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

				let routes = Object.keys ( db.routes );
				let uS = Object.keys ( db.scores );

				uS.map ( k=>{
					routes.map ( v=>{
						if ( !full[ v ] )
						{
							full[ v ] = [];
						}

						if ( "Array" == db.scores?.[ k ]?.[ v ]?.constructor.name )
						{
							full[ v ].push ( Math.max ( db.scores?.[ k ]?.[ v ] ) );
						}
					});
					
					db.scores[ k ].total = 0;
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

				routes = Object.keys ( full );

				uS.map ( k=>{
					routes.map ( v=>{
						let value = undefined;
						if ( "Array" == db.scores?.[ k ]?.[ v ]?.constructor.name )
						{
							value = Math.max ( db.scores?.[ k ]?.[ v ] );
						}
						else
						{
							value = db.scores?.[ k ]?.[ v ];
						}

						let t = full[ v ].indexOf ( value );

						if ( 0 > t )
						{
							t = uS.length;
						}
						t++;

						db.scores[ k ].total += t * t;
					});

					db.scores[ k ].total = Math.sqrt ( db.scores[ k ].total );
				});
				break;
			}
		}

		let users = Object.keys ( db.scores );

		// calc rank
		switch ( mode )
		{
			case "a":
			case "autre":
			{
				users.sort ( (a,b)=>{ return db.scores[ b ].total - db.scores[ a ].total })
					.map ( (user,i)=>{
						db.scores[ user ].rank = (i+1);
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

				users.sort ( (a,b)=>{return cmp ( db.scores[ b ].total, db.scores[ a ].total ) })
					.map ( (user,i)=>{
						db.scores[ user ].rank = (i+1);
						let t = db.scores[ user ].total;
						db.scores[ user ].total = "";
						for ( let key in t )
						{
							if ( t[ key ] )
							{
								db.scores[ user ].total += t[ key ]+key.charAt ( 0 )+" ";
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
						return db.scores[ a ].total-db.scores[ b ].total
					})
					.map ( (user,i)=>{
						db.scores[ user ].rank = (i+1);
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

				if ( db.scores[ user ].total == db.scores[ array[ i - 1 ] ].total )
				{
					db.scores[ user ].rank = db.scores[ array[ i - 1 ] ].rank;
				}

				return user;
			})

		ok ( );
	})
}
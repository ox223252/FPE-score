const blocOrder = [ "echec", "zone", "top" ];

Array.prototype.distinct = function () { return Array.from ( new Set ( this ) ); };

function setScore ( name, way, value, id = undefined )
{
	if ( !name ||
		( way == undefined ) )
	{
		return ( false );
	}

	if ( !score[ name ] )
	{
		score[ name ] = {};
	}

	if ( !score[ name ][ way ] )
	{
		score[ name ][ way ] = [];
	}

	if ( id == undefined )
	{
		score[ name ][ way ].push ( value );
	}
	else if ( value == null )
	{
		score[ name ][ way ].splice( id, 1 );
	}
	else
	{
		score[ name ][ way ][ id ] = value;
	}
}

function getScore ( name, id = "rank" )
{
	if ( !name ||
		( id == undefined ) ||
		!score[ name ] ||
		!score[ name ][ id ] )
	{
		return ( false );
	}

	let max = score[ name ][ id ][ 0 ];

	for ( let i = 1; i < score[ name ][ id ].length; i++ )
	{
		if ( isNaN ( max ) )
		{
			if ( blocOrder.indexOf ( score[ name ][ id ][ i ] ) > blocOrder.indexOf ( max ) )
			{
				max = score[ name ][ id ][ i ];
			}

			if ( max == "top" )
			{
				break;
			}
		}
		else if ( score[ name ][ id ][ i ] > max )
		{
			max = score[ name ][ id ][ i ];
		}
	}
	return ( max );
}

function getNbTop ( name )
{
	if ( !name ||
		!score[ name ] )
	{
		return ( 0 );
	}

	let top = 0;
	let v = Object.keys( voie );
	for ( let i = 0; i < v.length; i++ )
	{
		if ( !score[ name ] ||
			!score[ name ][ v[i] ] )
		{
			continue;
		}
		for ( let j = 0; j < score[ name ][ v[i] ].length; j++ )
		{
			if ( score[ name ][ v[i] ][ j ] == 'top' )
			{
				top++;
				break; // si un top à été compté dans une voie on passe à la suivante
			}
		}
	}
	return ( top );
}

function getNbEssaisTop ( name )
{
	if ( !name ||
		!score[ name ] )
	{
		return ( 0 );
	}

	let essai = 0;
	let v = Object.keys( voie );
	for ( let i = 0; i < v.length; i++ )
	{
		if ( !score[ name ] ||
			!score[ name ][ v[i] ] )
		{
			continue;
		}
		let tmp = 0;
		for ( let j = 0; j < score[ name ][ v[i] ].length; j++ )
		{
			tmp++;
			if ( score[ name ][ v[i] ][ j ] == 'top' )
			{
				essai += tmp;
				break; // si un top à été compté dans une voie on passe à la suivante
			}
		}
	}
	return ( essai );
}

function getNbZone ( name )
{
	if ( !name ||
		!score[ name ] )
	{
		return ( 0 );
	}

	let zone = 0;
	let v = Object.keys( voie );
	for ( let i = 0; i < v.length; i++ )
	{
		if ( !score[ name ] ||
			!score[ name ][ v[i] ] )
		{
			continue;
		}
		for ( let j = 0; j < score[ name ][ v[i] ].length; j++ )
		{
			if ( ( score[ name ][ v[i] ][ j ] == 'top' ) ||
				( score[ name ][ v[i] ][ j ] == 'zone' ) )
			{
				zone++;
				break;
			}
		}
	}
	return ( zone );
}

function getNbEssaisZone ( name )
{
	if ( !name ||
		!score[ name ] )
	{
		return ( 0 );
	}

	let essai = 0;
	let v = Object.keys( voie );
	for ( let i = 0; i < v.length; i++ )
	{
		if ( !score[ name ] ||
			!score[ name ][ v[i] ] )
		{
			continue;
		}
		let tmp = 0;
		for ( let j = 0; j < score[ name ][ v[i] ].length; j++ )
		{
			tmp++;
			if ( ( score[ name ][ v[i] ][ j ] == 'top' ) ||
				( score[ name ][ v[i] ][ j ] == 'zone' ) )
			{
				essai += tmp;
				break;
			}
		}
	}
	return ( essai );
}

function getNbTests ( name, id )
{
	if ( !name ||
		( id == undefined ) ||
		!score[ name ] ||
		!score[ name ][ id ] )
	{
		return ( false );
	}

	return ( score[ name ][ id ].length );
}

function getUsersNamesList ( u, cat, genre, club )
{
	let o = [];
	for ( let i = 0; i < u.length; i++ )
	{
		if ( cat &&
			cat != "all" &&
			u[ i ].categorie != cat )
		{
			continue;
		}

		if ( genre &&
			genre != "all" &&
			u[ i ].genre != genre )
		{
			continue;
		}

		if ( club &&
			club != "all" &&
			u[ i ].club != club )
		{
			continue;
		}

		o.push( u[ i ].name );
	}

	o.sort(function (a, b) {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return ( o );
}

/// params : {
/// 	value	
/// 	list	
/// 	selector
/// 	default	
/// }
function uOneSlector ( params = {} )
{
	if ( !params.list )
	{
		return "error";
	}

	if ( undefined == params.value )
	{
		params.value = params.selector.value;
	}

	while ( params.selector.options.length )
	{ // remove all options from selector
		params.selector.options.remove ( 0 );
	}

	// set first option to everything
	params.selector.options.add ( new Option ( params.default, 0 ) );
	params.selector.options[ 0 ].value = "all";

	for ( let i = 0; i < params.list.length; i++ )
	{
		params.selector.options.add ( new Option ( params.list[ i ], i + 1 ) );
		params.selector.options[ i + 1 ].value = params.list[ i ];

		if ( params.value == params.selector.options[ i + 1 ].value )
		{
			params.selector.options[ i + 1 ].selected = true;
		}
	}
}


function calcTotal ( id = "total", mode = "a" )
{ // get data to calculate average and globals metrics
	// init average struct
	let v = Object.keys( voie );
	for ( let i = 0; i < v.length; i++ )
	{
		average.all[ i ] = 0;
		average.tryed[ i ] = 0;
		average.player = 0;
	}

	if ( !users )
	{
		return "error";
	}

	switch ( mode )
	{
		case "a":
		case "autre":
		{ // for non offical contest mode
			for ( let i = 0; i < users.length; i++ )
			{
				if ( !score[ users[ i ].name ] )
				{ // if no score for some user, treat the next
					continue;
				}

				let somme = 0;

				for ( let j = 0; j < v.length; j++ )
				{
					let l_voie = voie[ v[ j ] ];

					let value = getScore( users[ i ].name, v[ j ] );
					if ( value == "echec" )
					{
						value = 0;
					}
					else
					{
						value = l_voie.score[ value ] || value;
					}
					if ( isNaN( value ) )
					{
						console.log( "error : value should be a number, verify config for "+v[ j ] );
						console.log( value );
						return;
					}

					if ( !average.all[ v[ j ] ]  )
					{
						average.all[ v[ j ] ] = 0;
					}

					if ( !average.tryed[ v[ j ] ]  )
					{
						average.tryed[ v[ j ] ] = 0;
					}


					if ( !value )
					{ // la voie n'a pas été faite
						continue;
					}

					switch ( l_voie.type )
					{
						case "vitesse":
						{
							let tmp = ( l_voie.score.time - value );
							tmp = ( tmp < 0 )? 0: tmp;
							somme += Number( tmp );

							average.all[ v[ j ] ] += Number( tmp ); // totalise points for all users
							if ( value )
							{
								average.tryed[ v[ j ] ]++;
							}
							break;
						}
						case "endurance":
						{
							let tmp = 0;
							if ( l_voie.score.time )
							{
								tmp = Math.min ( l_voie.score.time, value )
							}
							else
							{
								tmp = value;
							}
							somme += Number( tmp );

							// TODO
							average.all[ v[ j ] ] += Number( tmp ); // totalise points for all users
							if ( value )
							{
								average.tryed[ v[ j ] ]++;
							}
							break;
						}
						case "manual":
						default:
						{
							somme += Number( value || 0 );
							average.all[ v[ j ] ] += Number( value || 0 );

							if ( value )
							{
								average.tryed[ v[ j ] ]++;
							}

							break;
						}
					}
				}

				if ( score[ users[ i ].name ] )
				{
					average.player++;
				}

				setScore( users[ i ].name, "total", somme, 0 );
			}
			break;
		}
		case "b":
		case "bloc":
		{
			for ( let i = 0; i < users.length; i++ )
			{
				if ( !score[ users[ i ].name ] )
				{
					continue;
				}

				// get the four value needed to calc bloc rank
				let top = getNbTop ( users[ i ].name );
				let nbTestTop = getNbEssaisTop ( users[ i ].name );
				let zone = getNbZone ( users[ i ].name );
				let nbTestZone = getNbEssaisZone ( users[ i ].name );

				setScore( users[ i ].name, "top", top );
				setScore( users[ i ].name, "testTop", nbTestTop );

				setScore( users[ i ].name, "zone", zone );
				setScore( users[ i ].name, "testZone", nbTestZone );

				for ( let j = 0; j < v.length; j++ )
				{
					if ( voie[ v[j] ].type != "bloc" )
					{
						continue;
					}
					average.tryed[ j ] += getNbTests ( users[ i ].name, v[j] );
					average.all[ j ] += top;
				}

				if ( score[ users[ i ].name ] )
				{
					average.player++;
				}

				let str = top+'.'+nbTestTop+'.'+zone+'.'+nbTestZone;

				setScore( users[ i ].name, "total", str, 0 );
			}
			break;
		}
		case "d":
		case "diff":
		case "difficulte":
		{
			let qRank = {};

			// init local rank
			for ( i = 0; i < users.length; i++ )
			{
				qRank[ users[ i ].name ] = 0;
			}

			for ( let track = 0; track < v.length; track++ )
			{ // dans l'idée on utilise le rang de chaque utilisateur sur chaque vois pour calculer le rang global
				if ( voie[ v[track] ].type != "diff" )
				{
					continue;
				}

				orderTable ( v[track] );
				setRank ( v[track] );

				for ( i = 0; i < users.length; i++ )
				{
					let tmp = 0;
					if ( !score[ users[ i ].name ] )
					{ // pas de score pour cet utilisateur
						continue;
					}
					else if ( !score[ users[ i ].name ][ v[track] ] )
					{ // pas de score de diff pour cet utilisateur
						tmp = users.length;
					}
					else
					{
						tmp = score[ users[ i ].name ][ "rank" ][ 0 ];
					}

					console.log( users[ i ].name + " : " + tmp );

					qRank[ users[ i ].name ] += tmp * tmp;
				}
			}

			for ( i = 0; i < users.length; i++ )
			{
				if ( !score[ users[ i ].name ] )
				{
					continue;
				}

				setScore( users[ i ].name, "total", Math.sqrt ( qRank[ users[ i ].name ] ), 0 );
			}
			break;
		}
		case "v":
		case "vitesse":
		{
			for ( let i = 0; i < users.length; i++ )
			{
				if ( !score[ users[ i ].name ] )
				{
					continue;
				}

				let somme = 0;

				for ( let j = 0; j < voie.length; j++ )
				{
					let time = getScore( users[ i ].name, j );
					if ( !time )
					{
						setScore( users[ i ].name, total, undefined, 0 );
						break;
					}
					somme += parseFloat ( time );

					setScore( users[ i ].name, total, somme, 0 );
				}
			}
			break;
		}
	}
}
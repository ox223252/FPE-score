const blocOrder = [ "echec", "zone", "top" ];

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
	else if ( value == "void" )
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

function getStatus ( u = [] )
{
	let c = [];
	let g = [];
	let cl = [];

	for ( let i = 0; i < u.length; i++ )
	{
		if ( u[ i ].categorie &&
			!c.includes( u[ i ].categorie ) )
		{
			c.push ( u[ i ].categorie );
		}

		if ( u[ i ].genre &&
			!g.includes( u[ i ].genre ) )
		{
			g.push ( u[ i ].genre );
		}

		if ( u[ i ].club &&
			!cl.includes( u[ i ].club ) )
		{
			cl.push ( u[ i ].club );
		}
	}

	return { categorie:c, genre:g, club:cl };
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
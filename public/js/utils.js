const blocOrder = [ "echec", "zone", "top" ];

function setScore ( name, id, value, num )
{
	if ( !name ||
		( id == undefined ) )
	{
		return ( false );
	}

	if ( !score[ name ] )
	{
		score[ name ] = [];
	}

	if ( !score[ name ][ id ] )
	{
		score[ name ][ id ] = [];
	}
	
	if ( num == undefined )
	{
		score[ name ][ id ].push ( value );
	}
	else
	{
		score[ name ][ id ][ num ] = value;
	}
}

function getScore ( name, id = rankId )
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
	for ( let i = 0; i < voie.length; i++ )
	{
		if ( !score[ name ][ i ] )
		{
			continue;
		}

		for ( let j = 0; j < score[ name ][ i ].length; j++ )
		{
			if ( score[ name ][ i ][ j ] == 'top' )
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
	for ( let i = 0; i < voie.length; i++ )
	{
		if ( !score[ name ][ i ] )
		{
			continue;
		}

		let tmp = 0;
		for ( let j = 0; j < score[ name ][ i ].length; j++ )
		{
			tmp++;
			if ( score[ name ][ i ][ j ] == 'top' )
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
	for ( let i = 0; i < voie.length; i++ )
	{
		if ( !score[ name ][ i ] )
		{
			continue;
		}
		for ( let j = 0; j < score[ name ][ i ].length; j++ )
		{
			if ( ( score[ name ][ i ][ j ] == 'top' ) ||
				( score[ name ][ i ][ j ] == 'zone' ) )
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
	for ( let i = 0; i < voie.length; i++ )
	{
		if ( !score[ name ][ i ] )
		{
			continue;
		}
		
		let tmp = 0;
		for ( let j = 0; j < score[ name ][ i ].length; j++ )
		{
			tmp++;
			if ( ( score[ name ][ i ][ j ] == 'top' ) ||
				( score[ name ][ i ][ j ] == 'zone' ) )
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
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

	if ( params.parentDiv )
	{
		if ( params.list.length == 1 )
		{
			params.parentDiv.style.display = "none";
		}
		else
		{
			params.parentDiv.style.display = "";
		}
	}
}

/// params : {
/// 	selectedUsers
/// 	thead
/// 	tbody
/// 	scores
/// }
function printTable ( params = {} )
{
	function createLine ( array )
	{
		let line = document.createElement ( "tr" );
		array.map ( (item,index)=>{
			let td = document.createElement ( "td" );
			line.appendChild ( td );

			let span = document.createElement ( "span" );
			td.appendChild ( span );

			span.innerText = item;

			if ( params.event )
			{
				td.onclick = (ev)=>{
					ev.preventDefault ( );
					let e = new Event ( "click" );
					e.value = item;
					e.column = index;
					e.firstCell = array[ 0 ];
					params.event.dispatchEvent ( e );
				};
			}
		})

		return line;
	}

	let sU = params.selectedUsers.map ( u=>u.name );
	let users = Object.keys ( params.scores ).filter ( u=>sU.includes ( u ) );
	let lastRank = -1;

	while ( params.thead.firstChild )
	{
		params.thead.removeChild ( params.thead.lastChild );
	}
	while ( domEls.table.tbody.firstChild )
	{
		params.tbody.removeChild ( params.tbody.lastChild );
	}

	// sort users by rank, and define partial rank for the displayed user only
	users.sort ( (a,b)=>{
			return params.scores[ a ].rank - params.scores[ b ].rank;
		})
		.map ( (user,i)=>{
			params.scores[ user ].partialRank = (i+1);
			return user;
		})
		.map ( (user,i,array)=>{
			if ( 0 == i )
			{
				return user;
			}

			if ( params.scores[ user ].rank == params.scores[ array[ i - 1 ] ].rank )
			{
				params.scores[ user ].partialRank = params.scores[ array[ i - 1 ] ].partialRank;
			}

			return user;
		})

	let voies = users.map ( u=>Object.keys ( params.scores[ u ] ) ).flat ( Infinity ).distinct ( ).sort ( );

	params.thead.appendChild ( createLine ( [ "Nom", ...voies.filter ( v=>!["partialRank","rank","total"].includes ( v ) ), "total", "rank" ] ) );

	for ( let user of users )
	{
		params.tbody.appendChild ( createLine ( [
			user,
			...voies.filter ( v=>!["partialRank","rank","total"].includes ( v ) ).map ( v=>{
				if ( params.scores[ user ][ v ] )
				{
					return Math.max( ...params.scores[ user ][ v ] )
				}
				else
				{
					return "";
				}
			}),
			params.scores[ user ].total,
			params.scores[ user ].partialRank
		] ) );
	}
}

/// params : {
/// 	selectedUsers
/// 	thead
/// 	tbody
/// 	scores
/// 	socket
/// }
function printTableOne ( params = {} )
{
	while ( params.thead.firstChild )
	{
		params.thead.removeChild ( params.thead.lastChild );
	}
	while ( domEls.table.tbody.firstChild )
	{
		params.tbody.removeChild ( params.tbody.lastChild );
	}

	let score = params.scores[ params.selectedUsers[ 0 ].name ]
	
	for ( let voie in score )
	{
		if ( "Array" != score[ voie ].constructor.name )
		{
			continue;
		}
		let line = document.createElement ( "tr" );

		let th = document.createElement ( "th" );
		line.appendChild ( th );
		th.innerText = voie;

		if ( params.event )
		{
			th.onclick = (ev)=>{
				ev.preventDefault ( );
				let e = new Event ( "click" );
				e.firstCell = voie;
				params.event.dispatchEvent ( e );
			};
		}

		score[ voie ].map ( (v,i)=>{
			let td = document.createElement ( "td" );
			line.appendChild ( td );

			let input = document.createElement ( "input" );
			td.appendChild ( input );

			input.value = v;
			input.dataset.index = i;
			input.dataset.id = voie;

			input.addEventListener ( "change", (ev)=>{
				params.socket.emit ( "uValue", {
					index:i,
					voie:voie,
					name:params.selectedUsers[ 0 ].name,
					value: Number ( ev.target.value ),
				} )
			})
		});

		params.tbody.appendChild ( line );
	}
}
const blocOrder = [ "echec", "zone", "top" ];

Array.prototype.distinct = function () { return Array.from ( new Set ( this ) ); };

/// params : {
/// 	value	
/// 	list or obj { list, valueId, textId }
/// 	selector
/// 	default	
/// }
function uOneSlector ( params = {} )
{
	if ( !params.list
		&& !params.obj )
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
	params.selector.appendChild ( new Option ( params.default, 0 ) );
	params.selector.options[ 0 ].value = "all";

	let length = 0;

	if ( params.list?.length )
	{
		for ( let i = 0; i < params.list.length; i++ )
		{
			params.selector.appendChild ( new Option ( params.list[ i ], i + 1 ) );
			params.selector.options[ i + 1 ].value = params.list[ i ];

			if ( params.value == params.selector.options[ i + 1 ].value )
			{
				params.selector.options[ i + 1 ].selected = true;
			}
		}

		length = params.list.length;
	}
	else if ( "Object" == params.obj?.constructor.name )
	{
		for ( let i = 0; i < params.obj.list.length; i++ )
		{
			params.selector.appendChild ( new Option ( params.obj.list[ i ][ params.obj.textId ], i + 1 ) );
			params.selector.options[ i + 1 ].value = params.obj.list[ i ][ params.obj.valueId ];

			if ( params.value == params.selector.options[ i + 1 ].value )
			{
				params.selector.options[ i + 1 ].selected = true;
			}
		}

		length = params.obj.list.length;
	}

	if ( params.parentDiv )
	{
		if ( length == 1 )
		{
			params.parentDiv.style.display = "none";
			params.selector.options[ 1 ].selected = true;
			params.selector.dispatchEvent ( new Event ( "change" ) )
		}
		else
		{
			params.parentDiv.style.display = "";
		}
	}
}

function uOneCheckList ( params = {} )
{
	function addCheck ( keys, text )
	{
		let div = document.createElement ( "div" );

		let label = document.createElement ( "label" );
		div.appendChild ( label );
		label.innerText = text || keys.slice ( -1 );

		let input = document.createElement ( "input" );
		div.appendChild ( input );
		input.type = "checkbox";
		input.checked = true;

		return {div,input};
	}

	for ( let key in params.outList[ params.key ] )
	{
		if ( "main" == key )
		{
			continue;
		}

		if ( params.list.includes ( key ) )
		{
			continue;
		}

		params.outList[ params.key ][ key ].parentNode.parentNode.removeChild ( params.outList[ params.key ][ key ].parentNode );
	}

	let inputs = [];

	for ( let key of params.list )
	{
		if ( params.outList[ params.key ][ key ] )
		{
			continue;
		}

		let {div,input} = addCheck ( [ params.key,  key ] );
		params.outList[ params.key ][ key ] = input;
		params.outList[ params.key ].main.appendChild ( div );

		inputs.push ( input );
	}

	return inputs;
}

/// params : {
/// 	selectedUsers
/// 	thead
/// 	tbody
/// 	scores
/// }
function printTable ( params = {}, voie = undefined )
{
	function createLine ( array, headerArray = [] )
	{
		let line = document.createElement ( "tr" );
		array.map ( (item,index)=>{
			let td = document.createElement ( "td" );
			line.appendChild ( td );

			let span = document.createElement ( "span" );
			td.appendChild ( span );

			span.innerText = item;

			if ( headerArray.includes ( index ) )
			{
				td.classList.add ( "header" );
			}
			else
			{
				td.classList.add ( "data" );
			}

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

			if ( params.callback )
			{
				td.onclick = params.callback;
			}
		})

		return line;
	}

	let users = getUsersList ( params.users, params.filters )
		.filter ( name=>{
			if ( !scores[ name ] )
			{
				return false;
			}
			return true;
		})
		.sort ( (a,b)=>{
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

			if ( params.scores[ user ][ voie.name ] == params.scores[ array[ i - 1 ] ][ voie.name ] )
			{
				params.scores[ user ].partialRank = params.scores[ array[ i - 1 ] ].partialRank;
			}

			return user;
		});

	while ( params.thead.firstChild )
	{
		params.thead.removeChild ( params.thead.lastChild );
	}
	while ( domEls.table.tbody.firstChild )
	{
		params.tbody.removeChild ( params.tbody.lastChild );
	}

	let available = Object.keys ( params.voies )
		.filter ( f=>params.filters.type.includes ( f ) )
		.map ( t=>params.voies[ t ] )
		.flat ( Infinity )

	let voies = users.map ( u=>Object.keys ( params.scores[ u ] ) )
		.flat ( Infinity )
		.distinct ( )
		.filter ( f=>available.includes ( f ) )
		.sort ( );


	let voiesFiltered = voies.filter ( v=>!["partialRank","rank","total"].includes ( v ) );
	let headerArray = [ 0 , voiesFiltered.length + 1, voiesFiltered.length + 2 ]

	params.thead.appendChild ( createLine ( [ "Nom", ...voiesFiltered, "total", "rank" ], headerArray ) );

	for ( let user of users )
	{
		params.tbody.appendChild ( createLine ( [
			user,
			...voiesFiltered.map ( v=>{
				if ( params.scores?.[ user ]?.[ v ] )
				{
					if ( params.scores?.[ user ]?.[ v ]?.some( v=>!isNaN(v) ) )
					{
						return Math.max( ...params.scores[ user ][ v ] )
					}
					else if ( params.scores?.[ user ]?.[ v ]?.some( v=>v=="top" ) )
					{
						return "top";
					}
					else if ( params.scores?.[ user ]?.[ v ]?.some( v=>v=="zone" ) )
					{
						return "zone";
					}
					else if ( params.scores?.[ user ]?.[ v ]?.some( v=>v=="echec" ) )
					{
						return "echec";
					}
					else
					{
						return "";
					}
				}
				else
				{
					return "";
				}
			}),
			params.scores[ user ].total,
			params.scores[ user ].partialRank
		],
		headerArray ) );
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

function getUsersList ( userArray, filters )
{
	return userArray.filter ( user=>{
			for ( let key in filters )
			{
				if ( "type" == key )
				{
					continue;
				}
				else switch ( filters?.[ key ]?.constructor.name )
				{
					case "String":
					{
						if ( user[ key ] != filters[ key ] )
						{
							return false;
						}
						break;
					}
					case "Array":
					{
						if ( !filters[ key ].includes ( user[ key ] ) )
						{
							return false;
						}
						break;
					}
				}
			}

			return true;
		})
		.map ( user=>user.name );
}
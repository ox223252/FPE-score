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

	while ( params.selector.firstChild )
	{ // remove all options from selector
		params.selector.removeChild ( params.selector.lastChild );
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

function getChecked ( obj )
{
	let r = [];
	for ( let c in obj )
	{
		if ( "main" == c )
		{
			continue;
		}

		if ( obj[ c ].checked )
		{
			r.push ( c );
		}
	}
	return r;
}

/// params : {
/// 	users
/// 	thead
/// 	tbody
/// 	scores
/// }
function printTable ( params = {}, route )
{
	function createLine ( array, headerArray = [], isHeader = false )
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

			if ( !params.event )
			{
			}
			if ( isHeader )
			{
				td.onclick = (ev)=>{
					ev.preventDefault ( );
					let e = new Event ( "route" );
					e.value = item;
					e.params = params;
					params.event.dispatchEvent ( e );
				};
			}
			else if ( 0 == index )
			{
				td.onclick = (ev)=>{
					ev.preventDefault ( );
					let e = new Event ( "name" );
					e.value = item;
					e.params = params;
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

	function getBestResult ( result )
	{
		if ( result?.some( v=>!isNaN(v) ) )
		{
			return Math.max( ...result )
		}
		else if ( result?.some( v=>v=="top" ) )
		{
			return "top";
		}
		else if ( result?.some( v=>v=="zone" ) )
		{
			return "zone";
		}
		else if ( result?.some( v=>v=="echec" ) )
		{
			return "echec";
		}
		else
		{
			return "";
		}
	}

	if ( !( params.event instanceof EventTarget ) )
	{
		console.log ( "create event" )
		params.event = new EventTarget ( );
	}

	let users = getUsersList ( params.users, params.filters )
		.filter ( name=>{
			if ( !params?.scores[ name ] )
			{
				return false;
			}
			return true;
		})
		.sort ( (a,b)=>{
			if ( route
				&& params.routes.includes ( route?.name ) )
			{
				let a1 = getBestResult ( params.scores[ a ][ route.name ] );
				let b1 = getBestResult ( params.scores[ b ][ route.name ] );
				
				if ( isNaN ( a1 ) )
				{
					a1 = [ "", "echec", "zone", "top" ].indexOf ( a1 );
				}

				if ( isNaN ( b1 ) )
				{
					a1 = [ "", "echec", "zone", "top" ].indexOf ( b1 );
				}

				return b1 - a1;
			}
			else
			{
				return params.scores[ a ].rank - params.scores[ b ].rank;
			}
		})
		.map ( (user,i,a)=>{
			if ( ( i > 0 )
				&& ( params.scores[ user ].rank == params.scores[ a[ i - 1 ] ].rank ) )
			{
				params.scores[ user ].partialRank = params.scores[ a[ i - 1 ] ].partialRank;
			}
			else
			{
				params.scores[ user ].partialRank = (i+1);
			}
			return user;
		})

	if ( "Nom" == route?.name )
	{
		users.sort ( );
	}

	let routes = users.map ( u=>Object.keys ( params.scores[ u ] ) )
		.flat ( Infinity )
		.distinct ( )
		.filter ( f=>params?.routes?.includes ( f ) ?? true )
		.filter ( v=>!["partialRank","rank","total"].includes ( v ) )
		.sort ( );

	while ( domEls.table.thead.firstChild )
	{
		params.thead.removeChild ( params.thead.lastChild );
	}

	while ( domEls.table.tbody.firstChild )
	{
		params.tbody.removeChild ( params.tbody.lastChild );
	}

	params.thead.appendChild ( createLine ( [ "Nom", "rank", "total", ...routes ], [ 0 ,1, 2 ], true ) );

	for ( let user of users )
	{
		params.tbody.appendChild ( createLine ( [
			user,
			params.scores[ user ].partialRank,
			params.scores[ user ].total,
			...routes.map ( v=>getBestResult ( params.scores?.[ user ]?.[ v ] ) ),
		],
		[ 0, 1, 2 ] ) );
	}

	params.event.removeEventListener ( "route", pTW );
	params.event.addEventListener ( "route", pTW );
}

function pTW ( ev )
{
	printTable ( ev.params,{
			name: ev.value,
		});
}

/// params : {
/// 	users
/// 	thead
/// 	tbody
/// 	scores
/// 	socket
/// }
function printTableOneUser ( params = {} )
{
	while ( params.thead.firstChild )
	{
		params.thead.removeChild ( params.thead.lastChild );
	}
	while ( domEls.table.tbody.firstChild )
	{
		params.tbody.removeChild ( params.tbody.lastChild );
	}

	let score = params.scores[ params.users ]
	
	for ( let route in score )
	{
		if ( "Array" != score[ route ].constructor.name )
		{
			continue;
		}
		let line = document.createElement ( "tr" );

		let th = document.createElement ( "td" );
		line.appendChild ( th );
		th.innerText = route;

		score[ route ].map ( (v,i)=>{
			let td = document.createElement ( "td" );
			line.appendChild ( td );

			let input = document.createElement ( "input" );
			td.appendChild ( input );

			input.value = v;
			input.dataset.index = i;
			input.dataset.id = route;

			input.addEventListener ( "change", (ev)=>{
				let data = {
					name: params.users,
					index: i,
					route: route,
					value: ev.target.value,
				};

				let e = new  Event ( "value" );
				e.data = data;

				params.event.dispatchEvent ( e );
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

function exportFile ( data, file )
{
	function getKeys ( objArray )
	{
		return objArray.map ( (d)=>Object.keys ( d ) )
			.flat ( Infinity )
			.distinct ( );
	}
	
	function manageOneElement ( cell )
	{
		switch ( cell?.constructor.name )
		{
			case "Number":
			case "String":
			{
				return cell;
			}
			case "Array":
			{
				return cell.join ( ", " );
			}
			case "Object":
			{
				if ( cell.zone
					|| cell.top )
				{
					return `${cell.zone ?? 0}, ${cell.top ?? 0}`;
				}
			}
			default:
			{
				console.log ( cell );
				return "";
			}
		}
	}

	switch ( data.constructor.name )
	{
		case "Array":
		{
			let keys = getKeys ( data ).filter ( k=>"meta"!=k );


			data = keys.join ( " ; " ) + "\n" + data.map ( line=>{
					return keys.map ( k=>{
							return line[ k ] ?? "";
						})
						.map ( manageOneElement )
						.join ( " ; " )
				})
				.join ( "\n" );

			break;
		}
		case "Object":
		{
			let keys = getKeys ( Object.values ( data ) );

			data = "Name ; " + keys.join ( " ; " ) + "\n" + Object.keys ( data ).map ( key=>{
					return [ key, ...keys.map ( k=>{
							return data[ key ][ k ] ?? ""
						}) ]
						.map ( manageOneElement )
						.join ( " ; " )
				})
				.join ( "\n" );

			break;
		}
	}

	// let sI = undefined;
	// switch ( msg.file )
	// {
	// 	case "voies":
	// 	case "users":
	// 	{
	// 		sI = getKeys ( msg.data );
	// 		data = msg.data.map ( (d,i)=>{
	// 				let out = [];

	// 				for ( let k of sI )
	// 				{
	// 					switch ( d[ k ]?.constructor.name )
	// 					{
	// 						case "Object":
	// 						{
	// 							out.push ( JSON.stringify ( d[ k ] ) );
	// 							break;
	// 						}
	// 						case "Array":
	// 						{
	// 							out.push ( d[ k ].join ( "," ) );
	// 							break;
	// 						}
	// 						case undefined:
	// 						{
	// 							out.push ( "" );
	// 							break;
	// 						}
	// 						default:
	// 						{
	// 							out.push ( d[ k ] );
	// 							break;
	// 						}
	// 					}
	// 				}

	// 				return out.join ( ";" );
	// 			})
			
	// 		data.unshift ( sI.join ( ";" ) );
	// 		data = data.join ( "\n" );

	// 		break;
	// 	}
	// 	case "score":
	// 	{
	// 		data = JSON.stringify ( msg.data, null, 4 );
	// 		break;
	// 	}
	// 	default:
	// 	{
	// 		return;
	// 	}
	// }

	const downloadLink = document.createElement('a');
	downloadLink.href = URL.createObjectURL ( new Blob ( [ data ], { type: 'text/plain' } ) );
	downloadLink.download = file + ".csv";

	document.body.appendChild ( downloadLink );
	downloadLink.click();
	document.body.removeChild ( downloadLink );
}
import readline from "readline";

export default function ( params )
{
	console.log ( " - cmd availables" );
	params.cmd = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: false
		});

	let fnct = [
		{
			cmd: "help",
			comment: "help window",
			fnct: ( args )=>{
				console.log ( " - availables cmds" );
				for ( let f of fnct )
				{
					if ( "string" == typeof f.comment )
					{
						console.log ( `   - ${f.cmd} : ${f.comment}` );
					}
					else if ( "function" == typeof f.comment )
					{
						console.log ( `   - ${f.cmd} : ` + f.comment ( ).join ( "\n       " ) );
					}
					else
					{
						console.log ( `   - ${f.cmd} : unknow` );
					}
				}
			},
		},
		{
			cmd: "list",
			comment: ( )=>{
				return [
					"[ users ]",
					"users : connected users"
				];
			},
			fnct: ( args )=>{
				switch ( args[ 0 ] )
				{
					case "users":
					{
						Object.values ( params.connected ).map ( v=>{
							console.log ( `${v.user} ${v.id} :\n\t${Object.entries ( v.page ).map ( v=>v[ 0 ]+'\t'+v[ 1 ] ).join ( "\n\t" )}` )
						})
						break;
					}
					default:{
						console.log ( "allowed : [ users ]" )
						break;
					}
				}
			},
		}
	]

	params.cmd.on ( "line", ( line )=>{
			let args = line.split ( " " );

			let cmd = args.shift ( );

			let index = fnct.map ( r=>r.cmd ).indexOf ( cmd );

			if ( ( 0 <= index )
				&& ( "function" == typeof fnct[ index ].fnct ) )
			{
				fnct[ index ].fnct( args );
			}
			else
			{
				console.log ( " unknow cmd", cmd );
			}
		});

	params.cmd.once ( 'close', () => {
			console.log ( " - close" )
		});

	return params;
}

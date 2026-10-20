import fs from 'fs'; // read / write files
import chokidar from "chokidar";

export default function ( params )
{
	switch ( params.args.mode )
	{
		case "a":
		case "autre":
		{
			params.types = [ "diff","bloc","endurance","vitesse","slack" ];
			break;
		}
		case "b":
		case "bloc":
		{
			params.types = [ "bloc" ];
			break;
		}
		case "c":
		case "contest":
		{
			params.types = [  "diff","bloc","vitesse" ];
			break;
		}
		case "d":
		case "diff":
		{
			params.types = [  "diff" ];
			break;
		}
		case "v":
		case "vitesse":
		{
			params.types = [  "vitesse" ];
			break;
		}
		default:
		{
			throw "pas encore fait"
		}
	}

	function parse ( path )
	{
		let tmp;
		try
		{
			tmp = fs.readFileSync ( path, "utf-8" );
			tmp = eval ( tmp );
		}
		catch ( e )
		{
			tmp = [];
		}

		return tmp;
	}

	params.db = {}

	for ( let item of [ "routes","scores","users" ] )
	{
		console.log ( " - read db for", item, params.args.db[ item ] );

		chokidar.watch ( params.args.db[ item ], {ignored: /^\.+/} )
			.on ( 'add', ()=>{
				params.db[ item ] = parse ( params.args.db[ item ] );
			})
			.on ( 'change', ()=>{
				params.db[ item ] = parse ( params.args.db[ item ] );
			})
			.on ( 'unlink', ()=>{
				params.db[ item ] = [];
			})
	}

	return Promise.resolve ( params );
}
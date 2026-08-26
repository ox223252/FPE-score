import fs from 'fs'; // read / write files
import chokidar from "chokidar";
import {calcAll} from "./calc.js";

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

	params.categories = params.args.categories;
	params.genres = params.args.genres;

	function parse ( path )
	{
		let tmp;
		try
		{
			tmp = fs.readFileSync ( path, "utf-8" );
			tmp = JSON.parse ( tmp );
		}
		catch ( e )
		{
			tmp = [];
		}

		return tmp;
	}

	params.db = {
		empty: {
			routes:[],
			users:[],
			scores:{},
		}
	};

	for ( let item of [ "routes","scores","users" ] )
	{
		console.log ( " - read db for", item, params.args.db[ item ] );

		if ( !fs.existsSync ( params.args.db[ item ] ) )
		{
			params.db[ item ] = JSON.parse ( JSON.stringify ( params.db.empty[ item ] ) );
			fs.writeFileSync ( params.args.db[ item ], JSON.stringify ( params.db[ item ], null, 4 ), 'utf8' );
		}

		chokidar.watch ( params.args.db[ item ], {ignored: /^\.+/} )
			.on ( 'add', ()=>{
				params.db[ item ] = parse ( params.args.db[ item ] );

				calcAll ( params.db, params.args.mode )
					.then ( ()=>{
						params.io.to( item ).emit ( item, params?.db?.[ item ] );
					})
					.catch ( e=>{
						if ( e )
						{
							console.log ( e );
						}
					})
			})
			.on ( 'change', ()=>{
				params.db[ item ] = parse ( params.args.db[ item ] );

				calcAll ( params.db, params.args.mode )
					.then ( ()=>{
						params.io.to( item ).emit ( item, params?.db?.[ item ] );
					})
					.catch ( e=>{
						if ( e )
						{
							console.log ( e );
						}
					})
			})
			.on ( 'unlink', ()=>{
				params.db[ item ] = JSON.parse ( JSON.stringify ( params.db.empty[ item ] ) );
				fs.writeFileSync ( params.args.db[ item ], JSON.stringify ( params.db[ item ], null, 4 ), 'utf8' );
			})
	}

	return Promise.resolve ( params );
}
import fs from 'fs'; // read / write files
import path from "path";
import chokidar from "chokidar";

export default class DB_file extends EventTarget {
	constructor ( params = {} )
	{
		super ( );

		this._data = [];
		this._path = params.path;
		this._fileName = params.name;
		this._default = params.default ?? [];
		this._live = params.live === true;

		this._fileName = path.join ( this._path, params.name ) 

		if ( this._live )
		{
			chokidar.watch ( this._fileName )
				.on ( "add", ()=>{
					this._read ( );
				})
				.on ( "change", ()=>{
					this._read ( );
				})
				.on ( "unlink", ()=>{
					this._data = this.default;
					this._write ( );
				})
		}

		if ( !fs.existsSync ( this._fileName ) )
		{
			this._data = this.default;
			this._write ( );
		}
		else
		{
			this._read ( );
		}

		console.log ( `  - DB ${params.name} ready` );
	}

	_write ( )
	{
		if ( !fs.existsSync ( this._path ) )
		{
			fs.mkdirSync ( this._path, {recursive:true} )
		}

		fs.writeFileSync ( this._fileName, JSON.stringify ( this._data, null, 4 ), 'utf8' );
	}

	_read ( )
	{
		try
		{
			this._data = JSON.parse ( fs.readFileSync ( this._fileName, 'utf8' ) );

		}
		catch ( e )
		{
			this._data = this.default;
			console.log ( `  - DB error in ${this._fileName} content` );
			this.dispatchEvent ( new Event ( "error" ) );
		}
	}

	set data ( value )
	{
		this._data = value;
		this._write ( );
	}

	get data ( )
	{
		return this._data;
	}

	get default ( )
	{
		return JSON.parse ( JSON.striungify ( this._default ) );
	}

	empty ( )
	{
		this.data = this.default;
		this._write ( );
	}

	import ( data, callback = (obj)=>{} )
	{
		let lines = data.split ( "\n" );
		let keys = lines.shift ( ).split ( ";" );

		this.data = lines.map ( async line=>{
				let obj = {};

				line.split ( ";" )
					.map ( (cell,index)=>{
						obj[ keys[ index ] ] = cell;
					})

				return await callback ( obj );
			})
	}
}
import getParams from "./src/args.js"
import cmd from "./src/cmd.js"
import pre from "./src/pre.js"
import init from "./src/root.init.js"
import root from "./src/root.js"
import ajax from "./src/root.ajax.js"
import error from "./src/root.error.js"
import user from "./src/db.user.js"
import socket from "./src/ioSocket.js"

import DBFile from "./src/db.file.js"

import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const dir = path.dirname ( fileURLToPath ( import.meta.url ) );
const pkg = JSON.parse ( readFileSync ( path.join ( dir, "package.json" ) ).toString ( ) );

let params = {
	path: dir,
	name: pkg.name,
	description: pkg.description,
};

getParams ( params )
	// .then ( pre )
	.then ( p=>{
		if ( !params.db )
		{
			params.db = {};
		}

		params.db.routes = new DBFile ({
			path: path.join ( dir, params.args.db.path ),
			name: params.args.db.routes,
			default: [],
			live: false,
		});

		params.db.users = new DBFile ({
			path: path.join ( dir, params.args.db.path ),
			name: params.args.db.users,
			default: [],
			live: false,
		});

		params.db.scores = new DBFile ({
			path: path.join ( dir, params.args.db.path ),
			name: params.args.db.scores,
			default: {},
			live: false,
		});
		return p;
	})
	.then ( user )
	.then ( init )
	.then ( ajax )
	.then ( root )
	.then ( error )
	.then ( socket )
	.then ( cmd )
	.catch ( r=>{
		console.error ( "KO", r );
		process.exitCode = 1;
	})

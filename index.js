import getParams from "./src/args.js"
import cmd from "./src/cmd.js"
import init from "./src/root.init.js"
import root from "./src/root.main.js"
import ajax from "./src/root.ajax.js"
import user from "./src/db.user.js"
import socket from "./src/ioSocket.js"

import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const dir = path.dirname ( fileURLToPath ( import.meta.url ) );

let params = {
	path: dir,
	name: JSON.parse ( readFileSync( path.join ( dir, "package.json" ) ).toString( ) ).name,
};

getParams ( params )
	.then ( user )
	.then ( init )
	.then ( root )
	.then ( ajax )
	.then ( socket )
	.then ( cmd )
	.catch ( r=>{
		console.error ( "KO", r );
		process.exitCode = 1;
	})

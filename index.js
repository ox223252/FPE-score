import getParams from "./src/args.js"
import cmd from "./src/cmd.js"
import pre from "./src/pre.js"
import init from "./src/root.init.js"
import root from "./src/root.main.js"
import ajax from "./src/root.ajax.js"
import _404 from "./src/root.404.js"
import user from "./src/db.user.js"
import socket from "./src/ioSocket.js"

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
	.then ( pre )
	.then ( user )
	.then ( init )
	.then ( root )
	.then ( ajax )
	.then ( _404 )
	.then ( socket )
	.then ( cmd )
	.catch ( r=>{
		console.error ( "KO", r );
		process.exitCode = 1;
	})

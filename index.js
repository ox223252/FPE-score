import getParams from "./src/args.js"
import cmd from "./src/cmd.js"
import init from "./src/root.init.js"
import root from "./src/root.main.js"
import ajax from "./src/root.ajax.js"
import user from "./src/db.user.js"
import socket from "./src/ioSocket.js"

import { readFileSync } from "fs";

let params = {
	path: "/"+import.meta.url.split ( "/" ).filter ( f=>f ).slice ( 1, -1 ).join ( "/" ),
	name: JSON.parse ( readFileSync("./package.json").toString( ) ).name,
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

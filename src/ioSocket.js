import { Server as ServerIO } from "socket.io";

// lit l'utilisateur dans la session côté serveur ( jamais dans ce qu'envoie le navigateur )
// la session est rechargée car elle a pu changer depuis la connexion de la socket
// ( ex : connexion via /ajax/login après l'ouverture de la socket )
function sessionUser ( socket )
{
	return new Promise ( ( ok )=>{
		if ( !socket.request.session )
		{
			return ok ( "unknow" );
		}

		socket.request.session.reload ( ( err )=>{
			let session = socket.request.session; // reload remplace l'objet session

			if ( !err
				&& session?.logged
				&& ( "string" == typeof session.user ) )
			{
				ok ( session.user );
			}
			else
			{ // session absente / expirée / non connectée
				ok ( "unknow" );
			}
		});
	});
}

export default function ( params )
{
	console.log ( "   - Init Socket.io" );

	params.io = new ServerIO ( params.server );
	params.io.engine.use ( params.sessionMiddleware );

	params.connected = {};

	params.io.on ( "connection", function( socket )
	{
		let id = socket.request.sessionID;

		if ( !params.connected[ id ] )
		{
			params.connected[ id ] = {
				user: "unknow",
				page: {},
				id: id,
			};
		}

		socket.emit ( "timer", "" );

		if ( !params.connected[ id ] )
		{
			params.connected[ id ] = {
				user: "unknow",
				page: {},
				id: id,
			};
		}

		socket.on ( "identify", ( msg )=>{
			// la page n'est qu'une information d'affichage : on la borne
			let page = ( "string" == typeof msg?.page ) ? msg.page.slice ( 0, 256 ) : "";

			sessionUser ( socket )
				.then ( ( user )=>{
					if ( !socket.connected )
					{ // déconnectée pendant la lecture de la session
						return;
					}

					if ( !params.connected[ id ] )
					{
						params.connected[ id ] = {
							user: user,
							page: {},
							id: id,
						};
					}

					params.connected[ id ].user = user;
					params.connected[ id ].page[ socket.id ] = page;
				});
				
			switch ( page )
			{
				case "/":
				{
					socket.join ( "scores" );
					break;
				}
				case "/road":
				{
					socket.join ( "route" );
					break;
				}
				case "/addUser":
				{
					socket.join ( "users" );
					break;
				}
			}
		});

		socket.on ( "disconnect", ( )=>{
			if ( !params.connected[ id ] )
			{
				return;
			}

			delete params.connected[ id ].page[ socket.id ];

			if ( 0 == Object.keys ( params.connected[ id ].page ).length )
			{
				delete params.connected[ id ];
			}
		});
	});

	return params;
}

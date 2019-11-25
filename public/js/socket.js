let socket = io ( );

function calcTotal(){};
function orderTable(){};
function setRank(){};
function drawTable(){};
function calcAverage(){};
function updateSelector(){};
function orderTable(){};

socket.on ( 'scores', function ( data )
{
	setScore ( data.usr, data.voie, data.points );

	calcTotal ( ); // acceuril.html
	orderTable ( ); // acceuril.html
	setRank ( ); // acceuril.html
	drawTable ( ); // acceuril.html
	calcAverage ( ); // statistiques.html
});

socket.on ( 'users', function ( usr )
{
	let i;
	for ( i = 0; i < users.length; i++ )
	{
		if ( users[ i ].name == usr.name )
		{
			break;
		}
	}

	if ( i == users.length )
	{
		users.push ( usr );
	}

	updateSelector ( ); // fullDisplay.html
	orderTable ( ); // acceuril.html / fullDisplay.html
	drawTable ( ); // acceuril.html
});
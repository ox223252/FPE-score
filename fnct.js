import fs from 'fs'; // read / write files

Array.prototype.distinct = function () { return Array.from ( new Set ( this ) ); };

/// \brief fonction qui verifie que les competiteurs on des dossards
/// \params [ in ] array : table des utilisateurs
/// \params [ in ] id : id du dossard
/// \params [ in ] filePath : path du fichier de sortie, si non definie la modification n'est pas sauvé
/// \return boolean indique si la donnée a été modifié
export function checkId ( array, id = "dossard", filePath )
{
	if ( array.map ( u=>u[ id ] ).some ( v=>undefined==v ) )
	{
		console.log ( "besoin MAJ dossard" );
		let numbers = array.map ( u=>u[ id ] ).filter ( v=>!isNaN ( v ) );

		console.log ( "list des dossard ", numbers );

		array.filter ( u=>undefined==u[ id ] )
			.map ( (u,i)=>{
				console.log ( "utilisateur ", u );
				console.log ( " - ", i )
				while ( numbers.includes ( i ) )
				{
					i++;
				}
				console.log ( " - ", i )

				numbers.push ( i );

				u[ id ] = i;
			});

		if ( filePath )
		{
			fs.writeFileSync ( filePath, JSON.stringify ( array, null, 4 ) );
		}

		return true;
	}
	else
	{
		return false;
	}
}
export default function ( params )
{
	params.express.use ( function ( req, res )
	{
		res.status(404).send("<div>404 Not Found</div>");
	});

	return params;
}

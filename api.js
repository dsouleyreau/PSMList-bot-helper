/*
 *
 * Discord bot - PSMList helper
 *
 * Authors : DodoDye and Arshellan
 *
 */

const express = require('express'),
			cors = require('cors')
      app = express(),
      mysql = require('mysql'),
      dbConfig = require('./secret').db;

const pool = mysql.createPool({
    connectionLimit : 20,
	port : 3306,
	...dbConfig,
});

pool.getConnection( err => {
    if (err) {
    	console.log('Unable to connect to database!');
    	throw err;
	}
    else {
		console.log('Database is connected!');
	}
});

function poolQuery(query, args){
	return new Promise((resolve, reject) => {
		pool.query(query, args, (err, results, fields) => {
			if (!err) {
				resolve(results, fields);
			}
			else {
				reject(err);
			}
		});
	});
}

let extensions, extensionsRegex;
require('./utils').loadData('extension').then( imports => {
	extensions = imports;
    const extensionShorts = [];
    Object.values(extensions).forEach((extension) => {
    	extensionShorts.push(extension.short)
		if (extension.shortcommunity) {
			extensionShorts.push(extension.shortcommunity)
		}
		extensionShorts.push(extension.shortwizkids.toUpperCase())
	});
	extensionShorts.sort().reverse();
	extensionsRegex = '(' +
		extensionShorts.reduce(
			(accu, extension, index) =>
				accu + extension + (index < extensionShorts.length - 1 ? '|' : ''), ''
		) +
	')';
});

app.use(cors())

const api = express.Router();
app.use('/api', api);

const ship = express.Router();
api.use('/ship', ship);

const fort = express.Router();
api.use('/fort', fort);

const crew = express.Router();
api.use('/crew', crew);

const treasure = express.Router();
api.use('/treasure', treasure);

const event = express.Router();
api.use('/event', event);

const keyword = express.Router();
api.use('/keyword', keyword);

function formatExactRegex(regex) {
	if (regex.startsWith('"') && regex.endsWith('"')) {
		regex = `^${regex.slice(1, -1)}$`;
	}
	return regex;
}

/*
 * /ship
 */

ship.get('/', (req, res) => {
	res.json({error: 'Not available!'});
});

ship.get('/id/:ship', (req, res) => {
	const shipID = req.params.ship.substring(0, 10).toUpperCase();

	if (shipID.length === 0 || shipID.length !== req.params.ship.length) {
		return res.json([]);
	}

	const parts = shipID.match(extensionsRegex + '?([^-]+-)?(.+)');
	// console.log(parts);

	const extensionShort = parts[1], prefix = parts[2], numID = parts[3];

	const query = "SELECT * FROM ship WHERE idtype != 2 AND numid REGEXP ?" + (extensionShort ? " AND idextension = (SELECT id FROM extension WHERE short = ? OR shortcommunity = ? OR shortwizkids = ?);" : ";");
	const params = extensionShort ? [`^${prefix ?? ''}0*${numID}a?$`, extensionShort, extensionShort, extensionShort] : [`^${prefix ?? ''}0*${numID}a?$`];
	// console.log(params);

	poolQuery(query, params)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		// error will be an Error if one occurred during the query
		console.trace(err);
		res.json({error: err});
	});
});

ship.get('/name/:ship', (req, res) => {
	const shipName = req.params.ship.substring(0, 30).toUpperCase();

	if ( shipName.length === 0 || shipName.length !== req.params.ship.length) {
		return res.json([]);
	}

	poolQuery("SELECT * FROM ship WHERE idtype != 2 AND name REGEXP ?;", formatExactRegex(shipName))
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

/*
 * /fort
 */

fort.get('/', (req, res) => {
	res.json({error: 'Not available!'});
});

fort.get('/id/:fort', (req, res) => {
	const fortID = req.params.fort.substring(0, 10).toUpperCase();

	if (fortID.length === 0 || fortID.length !== req.params.fort.length) {
		return res.json([]);
	}

	const parts = fortID.match(extensionsRegex + '?([^-]+-)?(.+)');
	// console.log(parts);

	const extensionShort = parts[1], prefix = parts[2], numID = parts[3];

	const query = "SELECT * FROM ship WHERE idtype = 2 AND numid REGEXP ?" + (extensionShort ? " AND idextension = (SELECT id FROM extension WHERE short = ? OR shortcommunity = ? OR shortwizkids = ?);" : ";");
	const params = extensionShort ? [`^${prefix ?? ''}0*${numID}$`, extensionShort, extensionShort, extensionShort] : [`^${prefix ?? ''}0*${numID}$`];

	poolQuery(query, params)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

fort.get('/name/:fort', (req, res) => {
	const fortName = req.params.fort.substring(0, 30).toUpperCase();

	if ( fortName.length === 0 || fortName.length !== req.params.fort.length) {
		return res.json([]);
	}

	poolQuery("SELECT * FROM ship WHERE idtype = 2 AND name REGEXP ?;", formatExactRegex(fortName))
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

/*
 * /crew
 */

crew.get('/', (req, res) => {
	res.json({error: 'Not available!'});
});

crew.get('/id/:crew', (req, res) => {
	const crewID = req.params.crew.substring(0, 10).toUpperCase();

	if (crewID.length === 0 || crewID.length !== req.params.crew.length) {
		return res.json([]);
	}

	const parts = crewID.match(extensionsRegex + '?([^-]+-)?(.+)');
	// console.log(parts);

	const extensionShort = parts[1], prefix = parts[2], numID = parts[3];

	const query = "SELECT * FROM crew WHERE numid REGEXP ?" + (extensionShort ? " AND idextension = (SELECT id FROM extension WHERE short = ? OR shortcommunity = ? OR shortwizkids = ?);" : ";");
	const params = extensionShort ? [`^${prefix ?? ''}0*${numID}[ab]?$`, extensionShort, extensionShort, extensionShort] : [`^${prefix ?? ''}0*${numID}[ab]?$`];

	poolQuery(query, params)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

crew.get('/name/:crew', (req, res) => {
	const crewName = req.params.crew.substring(0, 30).toUpperCase();

	if ( crewName.length === 0 || crewName.length !== req.params.crew.length) {
		return res.json([]);
	}

	poolQuery("SELECT * FROM crew WHERE name REGEXP ?;", formatExactRegex(crewName))
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

/*
 * /treasure
 */

treasure.get('/', (req, res) => {
	res.json({error: 'Not available!'});
});

treasure.get('/id/:treasure', (req, res) => {
	const treasureID = req.params.treasure.substring(0, 10).toUpperCase();

	if (treasureID.length === 0 || treasureID.length !== req.params.treasure.length) {
		return res.json([]);
	}

	const parts = treasureID.match(extensionsRegex + '?([^-]+-)?(.+)');
	// console.log(parts);

	const extensionShort = parts[1], prefix = parts[2], numID = parts[3];

	const query = "SELECT * FROM treasure WHERE numid REGEXP ?" + (extensionShort ? " AND idextension = (SELECT id FROM extension WHERE short = ? OR shortcommunity = ? OR shortwizkids = ?);" : ";");
	const params = extensionShort ? [`^${prefix ?? ''}0*${numID}b?$`, extensionShort, extensionShort, extensionShort] : [`^${prefix ?? ''}0*${numID}b?$`];

	poolQuery(query, params)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

treasure.get('/name/:treasure', (req, res) => {
	const treasureName = req.params.treasure.substring(0, 30).toUpperCase();

	if ( treasureName.length === 0 || treasureName.length !== req.params.treasure.length) {
		return res.json([]);
	}

	poolQuery("SELECT * FROM treasure WHERE name REGEXP ?;", formatExactRegex(treasureName))
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

/*
 * /event
 */

event.get('/', (req, res) => {
	res.json({error: 'Not available!'});
});

event.get('/id/:event', (req, res) => {
	res.json({error: 'Not implemented yet!'});

	/*const eventID = req.params.event.substring(0, 10).toUpperCase();

	if (eventID.length === 0 || eventID.length !== req.params.event.length) {
		return res.json([]);
	}

	const parts = eventID.match(extensionsRegex + '?([^-]+-)?(.+)');
	// console.log(parts);

	const extensionShort = parts[1], prefix = parts[2], numID = parts[3];

	const query = "SELECT * FROM event WHERE numid REGEXP ?" + (extensionShort ? " AND idextension = (SELECT id FROM extension WHERE short = ? OR shortcommunity = ? OR shortwizkids = ?);" : ";");
	const params = extensionShort ? [`^${prefix ?? ''}0*${numID}?$`, extensionShort, extensionShort, extensionShort] : [`^${prefix ?? ''}0*${numID}?$`];

	poolQuery(query, params)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});*/
});

event.get('/name/:event', (req, res) => {
	res.json({error: 'Not implemented yet!'});

	/*const eventName = req.params.event.substring(0, 30).toUpperCase();

	if ( eventName.length === 0 || eventName.length !== req.params.event.length) {
		return res.json([]);
	}

	poolQuery("SELECT * FROM event WHERE name REGEXP ?;", eventName)
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});*/
});

/*
 * /keyword
 */

keyword.get('/', (req, res) => {
    poolQuery("SELECT * FROM keyword;")
    .then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

keyword.get('/id/:keyword', (req, res) => {
	res.json([]);
});

keyword.get('/name/:keyword', (req, res) => {
	const keywordName = req.params.keyword.substring(0, 30).toUpperCase();

	if ( keywordName.length === 0 || keywordName.length !== req.params.keyword.length) {
		return res.json([]);
	}

	const regex = `${keywordName.replace(/[^A-Z]/g, '.*')}`;

	poolQuery("SELECT * FROM keyword WHERE shortname REGEXP ?;", formatExactRegex(keywordName))
	.then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

keyword.get('/category', (req, res) => {
    poolQuery("SELECT * FROM kw_category;")
    .then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

keyword.get('/target', (req, res) => {
    poolQuery("SELECT * FROM kw_target;")
    .then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});


/*
 * /faction
 */

api.get('/faction', (req, res) => {
    poolQuery("SELECT * FROM faction;")
    .then( results => {
		res.json(results);
	})
	.catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

/*
 * /extension
 */

api.get('/extension', (req, res) => {
    poolQuery("SELECT * FROM extension;")
    .then( results => {
		res.json(results);
	})
    .catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

/*
 * /rarity
 */

api.get('/rarity', (req, res) => {
    poolQuery("SELECT * FROM rarity;")
    .then( results => {
		res.json(results);
	})
    .catch( err => {
		console.trace(err);
		res.json({error: err});
	});
});

api.get('*', (req, res) => {
	res.json({});
});

app.listen(8080, () => {
    console.log('API is running on port 8080');
});

process.on('exit', () => pool.end( err => {
    // all connections in the pool have ended
	console.trace(err);
}));


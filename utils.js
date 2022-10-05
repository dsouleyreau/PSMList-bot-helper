
const http  = require('http'),
	  https = require('https'),
	  { emojis, prefix, apiURI } = require('./config.js');

function apiRequest(url, options = {}, data) {
	return new Promise( (resolve, reject) => {
		const req = (url.match(/^https/) ? https : http)
			.request(url, options, (res) => {
				let output = '';
				res.on('data', data => {
					output += data;
				});

				res.on('end', () => {
					try {
						output = JSON.parse(output);
						resolve(output);
					} catch (err) {
						console.log('error with data', output);
						output = {error: JSON.stringify(err)};
						reject(output);
					}
				});
			});

		req.on('error', (err) => {
			console.log("Request error: " + err.message);
			reject({error: err});
		});

		if (data && options.method.toUpperCase() === 'POST') {
			req.write(data);
		}
		req.end();
	});
}

function bulkApiRequest(...optionsList){
	const promises = [];
	for (let options of optionsList) {
		try {
			if (typeof options === 'string' || options.constructor.name === 'URL') {
				promises.push(apiRequest(options));
			}
			else {
				promises.push(apiRequest(...options));
			}
		}
		catch (err) {
			console.trace(err);
		}
	}
	return Promise.all(promises).then((values) => values.flat() );
}

function allHelp(hasManageMessagesPermission) {
	return 'Available commands:\n' +
		['ping', 'search', 'ship', 'fort', 'crew', 'treasure', 'keyword', 'factions', 'extensions', 'rarities', 'udc', 'simcost']
			.reduce((accu, command) => accu + ' \u200b \u200b * `' + prefix + command + '`\n', '')
		+ (hasManageMessagesPermission ? ' \u200b \u200b - `' + prefix + 'purge`\n' : '') + '\n' +
		`Type \`${prefix}help <command>\` or \`${prefix}<command> help\` to get detailed information.\n` +
		'For further help, please check the [documentation](https://psmlist.com/public/blog/documentation_psmlisthelper) on psmlist.com.';
}

const Discord = require('discord.js');

async function loadData(type) {
	const exports = {};
	
	const data = await apiRequest(`${apiURI}/${type}`); // expected to throw error and quit process if api is unreachable
	
	if (!data) {
		return;
	}

	switch (type) {
		case 'faction':
			for (let { id, nameimg, defaultname } of data) {
				if (id && nameimg && defaultname) {
					exports[id] = { nameimg, name: defaultname };
				}
			}
			break;
		case 'extension':
			for (let { id, name, short, shortcommunity, shortwizkids } of data) {
				if (id && name && short && shortwizkids) {
					exports[id] = {name, short, shortcommunity, shortwizkids};
				}
			}
			break;
		case 'rarity':
			for (let { id, colorhex, defaultname } of data) {
				if (id && defaultname && colorhex){
					exports[id] = { color: '#' + colorhex, name: defaultname};
				}
			}
			break;
		case 'keyword/category':
			for (let { id, name } of data) {
				if (id && name){
					exports[id] = { name };
				}
			}
			break;
		case 'keyword/target':
			for (let { id, name } of data) {
				if (id && name){
					exports[id] = { name };
				}
			}
			break;
	}

	return exports;
}

function outputSimulatedCost(type, masts, cargo, speed, cannons){
	const total = masts + cargo + speed + cannons;

	return new Discord.MessageEmbed()
		.setTitle(`${type === 'udc' ? 'UDC': 'SimCost'} points`)
		.setURL(`https://psmlist.com/public/${type}_calculator`)
		.setDescription(`${emojis.masts} ${masts} ${emojis.cargo} ${cargo} ${emojis.speed} ${speed} ${emojis.cannon} ${cannons}`)
		.addField("Total", total.toFixed(1))
}

module.exports = {
	apiRequest,
	bulkApiRequest,
	loadData,
	allHelp,
	outputSimulatedCost
}

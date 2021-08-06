
const http  = require('http'),
	  https = require('https');

function apiRequest(url, options, data) {
	return new Promise( (resolve, reject) => {
		const req = (url.match(/https/) ? https : http)
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
			console.log(err);
		}
	}
	return Promise.all(promises).then((values) => values.flat() );
}

function allHelp(hasManageMessagesPermission) {
	return 'Available commands:\n' +
		' * ping\n' +
		' * psm\n' +
		' * ship\n' +
		' * fort\n' +
		' * crew\n' +
		' * factions\n' +
		' * extensions\n' +
		' * rarities\n' +
		(hasManageMessagesPermission ? ' - purge\n' : '');
}

const Discord = require('discord.js'),
	config = require('./config.js'),
	{ emojis } = config;

async function loadData(type) {
	if (['faction', 'extension', 'rarity'].indexOf(type) === - 1) {
		throw Error('Provided type is not recognized.\nPlease choose between "faction", "extension" or "rarity".');
	}

	let types = type + 's';
	if (type === 'rarity') {
		types = 'rarities';
	}

	const exports = {};
	exports[types] = {};

	let data = [];
	data = await apiRequest(`${config.apiURI}/${type}`); // expected to throw error and quit process if api is unreachable
	switch (type) {
		case 'faction':
			for (let { idFaction, nameImg } of data) {
				if (idFaction && nameImg) {
					exports.factions[idFaction] = nameImg;
				}
			}
			break;
		case 'extension':
			for (let { idExtension, name, short } of data) {
				if (idExtension && name && short) {
					exports.extensions[idExtension] = {name, short};
				}
			}
			break;
		case 'rarity':
			for (let { idRarity, colorHex, nameLocale } of data) {
				if (idRarity && nameLocale && colorHex){
					const nameSplit = nameLocale.match(/^rarity([A-Z][a-z]+)(.*)/);
					exports.rarities[idRarity] = { color: '#' + colorHex, colorName: nameSplit[1], name: nameSplit[2]};
				}
			}
			break;
	}
	switch (type) {
		case 'faction':
			exports.factionsString = Object.values(exports.factions).reduce((output, faction) => output + config.emojis[faction] + "\ \u200b\ \u200b" + faction + "\n", "")
			break;
		case 'extension':
			exports.extensionsString = Object.values(exports.extensions).reduce((output, extension) => output + emojis[extension.short] + "\ \u200b\ \u200b" + extension.name + "\n", "")
			break;
		case 'rarity':
			exports.raritiesString = Object.values(exports.rarities).reduce((output, rarity) => `${output}${emojis[rarity.color]} ${rarity.name} \n`, "")
			break;
	}

	exports[types + 'Embed'] = new Discord.MessageEmbed()
		.setTitle(types.charAt(0).toUpperCase() + types.slice(1))
		.setDescription(
			exports[types + 'String']
		)
		.setFooter('Provided by Broken Arms Team');

	return exports;
}

module.exports = {
	apiRequest,
	bulkApiRequest,
	loadData,
	allHelp,
}

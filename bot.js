/*
 *
 * Discord Helper Bot for PSMList
 *
 * Authors : Arshellan and DodoDye
 *
 */

// imports
const Discord = require( 'discord.js' ),
	  bot = new Discord.Client(/*{
		  presence: {
		  	  status: 'online',
				  activity: {
				  name: 'In maintenance!',
				  type: 4,
			  },
		  }
	  }*/),
	  prefix = '!',
	  config = require('./config'),
	  sanitizer = require('sanitize')(),
	  { apiRequest, loadData, allHelp } = require('./utils.js');

// dynamic / async imports
let   /*factions,*/ factionsEmbed,
	  /*extensions,*/ extensionsEmbed,
	  /*rarities,*/ raritiesEmbed,
	  itemEmbed, itemsEmbed;

Promise.all([
	// parallel fetching of factions, extensions and rarity instead of serial fetching
	loadData('faction'),
	loadData('extension'),
	loadData('rarity')
])
.then((modules) => {
	const [ faction, extension, rarity ] = modules,
		  items = require('./items.js')(faction.factions, extension.extensions, rarity.rarities);
	      factionsEmbed = faction.factionsEmbed,
		  extensionsEmbed = extension.extensionsEmbed,
	      raritiesEmbed = rarity.raritiesEmbed,
	      itemEmbed = items.itemEmbed;
	      itemsEmbed = items.itemsEmbed;
})
.catch( err => {
	console.log(err);
	process.exit(1);
});

// catch errors
try {

// calculate hosted server offset with online time API
let timeOffset = 0;
setInterval(function setTimeOffset() {
	apiRequest('http://worldtimeapi.org/api/ip')
	.then( ({ datetime }) => {
		timeOffset = Date.now() - new Date(datetime);
	});
	return setTimeOffset;
}(), 2 * 3600 * 1000);

// bot behavior
bot.on("message", (message) => {
	// stop if the message is from a bot
	if ( message.author.bot ) {
		return;
	}
	// stop if message is too small or prefix not the one this bot expects
	if ( message.content.length < 3 || !message.content.startsWith( prefix ) ) {
		return;
	}

	// remove the prefix from the message
	const commandBody = sanitizer.value(message.content.slice(prefix.length), 'str');
	// split the message into pieces separated by a 'space'
	const args = commandBody.replace(/ +/g, ' ').split(' ');
	// switch command and args if firts argument is 'help'
	// put the first arg into lowercase because it is the command name
	const command = sanitizer.value(args[1] && args[1].toLowerCase() === 'help' ? args.splice(1, 1)[0].toLowerCase() : args.shift().toLowerCase(), 'str');

	// defines if it is possible to manage messages (help and purge commands)
	const clientHasManageMessagesPermission = message.member.hasPermission('MANAGE_MESSAGES') || message.member.hasPermission('ADMINISTRATOR');
	const botHasManageMessagesPermission = message.guild.me.hasPermission('MANAGE_MESSAGES') || message.guild.me.hasPermission('ADMINISTRATOR');
	const hasManageMessagesPermission = clientHasManageMessagesPermission || botHasManageMessagesPermission;

	switch (command) {
		case 'psm' :
			if (args.length === 0) {
				message.channel.send('More content is available at https://psmlist.com');
			} else {
				let input = '';
				// get search type and remove it from args for future processing
				const searchType = sanitizer.value(args.shift(), 'str').toLowerCase();
				if (searchType === 'id') {
					if (args.length > 1) {
						return message.channel.send('Please provide only one ID per research.');
					}
					input = args[0];
					if (input.length > 10) {
						return message.channel.send('ID is limited to 10 characters.');
					}
				} else if (searchType === 'name' || searchType === 'text') {
					input = sanitizer.value(args.join(' '), 'str');
					if (input.length < 3) {
						return message.channel.send('Name needs at least 3 characters.');
					}
					if (input.length > 30) {
						return message.channel.send('Name is limited to 30 characters.');
					}
				} else {
					return message.channel.send(`Please indicate if you search by name or ID.\nType \`${prefix}help\` if needed.`);
				}
				// run all requests to API in parallel and process results all requests ended
				Promise.all([
					// add type as last element to identify each array as the are returned in api answer's order
					apiRequest(`${config.apiURI}/ship/${searchType === 'id' ? 'id' : 'name'}/${input}`).then( data => { data.push('ship'); return data; }),
					apiRequest(`${config.apiURI}/fort/${searchType === 'id' ? 'id' : 'name'}/${input}`).then( data => { data.push('fort'); return data; }),
					apiRequest(`${config.apiURI}/crew/${searchType === 'id' ? 'id' : 'name'}/${input}`).then( data => { data.push('crew'); return data; }),
					apiRequest(`${config.apiURI}/treasure/${searchType === 'id' ? 'id' : 'name'}/${input}`).then( data => { data.push('treasure'); return data; }),
				])
					.then( data => {
						// create an associative array of data by item type
						const dataByType = {};
						let hasCrewData = false;
						for (let array of data) {
							const type = array.pop();
							dataByType[type] = array;
							// check if data contains crew items
							if (type === 'crew' && array.length > 0) {
								hasCrewData = true;
							}
						}
						// flatten the input array to check the amount of results
						const values = data.flat(1);

						if (values.length === 0) {
							message.channel.send(`${searchType === 'id' ? 'ID' : 'Name'} provided did not match any type.`)
						}
						// check if two results correspond to crews from the same card (with same ID, but database IDs follow each other)
						else if (values.length === 1 || (values.length === 2 && hasCrewData && values[0].idextension === values[1].idextension && values[0].id + 1 === values[1].id)) {
							// retrieve the type of item
							const type = values.pop();
							// create detailed embed
							const embeds = itemEmbed(type, values);
							message.channel.send(embeds[0]);
							// add second embed if its a crew from the same card
							if (embeds[1]) {
								message.channel.send(embeds[1]);
							}
						} else {
							// create one embed for each type of item
							for (let type in dataByType) {
								const array = dataByType[type];
								// avoid creating an empty embed if there is no value for the item type
								if (array.length === 0) {
									continue;
								}
								message.channel.send(itemsEmbed(type, array, input)).catch( err => {
									// console.log(err);
									console.log('Too many results with the research: ' + input);
									message.channel.send('Unable to generate result with more than 6000 characters. Please refine your search terms.');
								});
							}
						}
					})
					.catch(err => {
						message.channel.send('Unexpected error, please try again.');
						console.log(err);
					});
			}
			break;

		case 'help' :
			const help = sanitizer.value(args[0], 'str');
			let helpMessage = '';
			switch (help) {
				case 'ping':
					helpMessage = 'Test your ping for fun!';
					break;
				case 'psm':
					helpMessage =
						`Type \`${prefix}psm\` to be redirected to the website\n` +
						`\`${prefix}psm id <id>\` or \`${prefix}psm name <name>\` to research in PSMList database\n` +
						`Ex: \`${prefix}psm id oe001\``
					;
					break;
				case 'ship':
					helpMessage =
						'Shows information about a ship based on its name or ID.\n' +
						`\`${prefix}ship id <id>\` or \`${prefix}ship name <name>\`\n` +
						`Ex: \`${prefix}ship id oe059\``
					;
					break;
				case 'fort':
					helpMessage =
						'Shows information about a fort based on its name or ID.\n' +
						`\`${prefix}fort id <id>\` or \`${prefix}fort name <name>\`\n` +
						`Ex: \`${prefix}fort rvu065\``
					;
					break;
				case 'crew':
					helpMessage =
						'Shows information about a crew based on its name or ID.\n' +
						`\`${prefix}crew id <id>\` or \`${prefix}crew name <name>\`\n` +
						`Ex: \`${prefix}crew ca063\``
					;
					break;
				case 'treasure':
					helpMessage =
						'Shows information about a treasure based on its name or ID.\n' +
						`\`${prefix}treasure id <id>\` or \`${prefix}treasure name <name>\`\n` +
						`Ex: \`${prefix}treasure rf066\``
					;
					break;
				case 'factions':
					helpMessage = 'List of factions with their flag.';
					break;
				case 'extensions':
					helpMessage = 'List of extensions as flag, full name, short name, community short name and WizKids short name.';
					break;
				case 'rarities':
					helpMessage = 'List of rarities with their color';
					break;
				case 'purge':
					if (hasManageMessagesPermission) {
						helpMessage = 'Purge previous messages. Give it the number of messages to delete.';
					}
					else {
						helpMessage = allHelp(hasManageMessagesPermission);
					}
					break;
				default:
					helpMessage = allHelp(hasManageMessagesPermission);
			}
			if (['psm', 'ship', 'fort', 'crew', 'treasure'].includes(help)) {
				helpMessage += '\n\nID research has a permissive syntax:\n' +
										` * \`${prefix}extensions\` shows original, community and WizKids short names to use as a prefix\n` +
										' * it is not case sensitive -> PotCC = potcc = POTCC\n' +
										' * leading zeros are optional -> oe001 = oe01 = oe1'
			}

			message.channel.send(helpMessage);
			break;

		case 'ship':
		case 'crew':
		case 'fort':
		case 'treasure':
			let input = '';
			const searchType = sanitizer.value(args.shift(), 'str').toLowerCase();
			if (searchType === 'id') {
				if (args.length > 1) {
					return message.channel.send('Please provide only one ID per research.');
				}
				input = sanitizer.value(args[0], 'str');
				if (input.length > 10) {
					return message.channel.send('ID is limited to 10 characters.');
				}
			} else if (searchType === 'name' || searchType === 'text') {
				input = sanitizer.value(args.join(' '), 'str');
				if (input.length < 3) {
					return message.channel.send('Name needs at least 3 characters.');
				}
				if (input.length > 30) {
					return message.channel.send('Name is limited to 30 characters.');
				}
			} else {
				return message.channel.send(`Please indicate if you search by name or ID.\nType \`${prefix}help\` if needed.`);
			}

			apiRequest(`${config.apiURI}/${command}/${searchType === 'id' ? 'id' : 'name'}/${input}`)
				.then( data => {
					if (data.length === 0) {
						message.channel.send(`${searchType === 'id' ? 'ID' : 'Name'} provided did not match any type.`)
					} else if (data.length === 1 || (command === 'crew' && data.length === 2 && data[0].idextension === data[1].idextension && data[0].id + 1 === data[1].id)) {
						const embeds = itemEmbed(command, data);
						message.channel.send(embeds[0]);
						if (embeds[1]) {
							message.channel.send(embeds[1]);
						}
					} else {
						message.channel.send(itemsEmbed(command, data, input)).catch( err => {
							// console.log(err);
							console.log('Too many results with the research: ' + input);
							message.channel.send('Unable to generate result with more than 6000 characters. Please refine your search terms.');
						});
					}
				})
				.catch(err => {
					console.log(err);
					message.channel.send('Unexpected error, please try again.');
				});
			break;

		case 'factions' :
			message.channel.send(factionsEmbed);
			break;

		case 'extensions' :
			message.channel.send(extensionsEmbed);
			break;

		case 'rarities' :
			message.channel.send(raritiesEmbed);
			break;

		case 'ping' :
			// calculate time taken to process this message
			const timeTaken = Date.now() - message.createdTimestamp - timeOffset;
			message.reply(`I'm alive! Ping: ${timeTaken}ms.`);
			break;

		case 'purge' :
			// check permissions
			if (!hasManageMessagesPermission) {
				return message.channel.send('You don\'t have permissions for that!');
			}

			let number = 0;
			try {
				number = sanitizer.value(Number.parseInt(args[0]), 'int');
			} catch (e) {
				return message.channel.send('Indicate a valid number, between 2 and 10.');
			}

			// check value type
			if (isNaN(args[0]) || args[0] < 2 || args[0] > 10) {
				return message.channel.send('Indicate a valid number, between 2 and 10.');
			}

			// delete the command itself
			message.delete();

			message.channel.bulkDelete(number, true)
				.catch(err => {
					console.log(err);
					message.channel.send('Failed to delete old messages!');
				});
			break;

		default :
			message.channel.send(`Unable to understand your request. Type ${prefix}help for the list of commands.`);
			break;
	}
});

bot.login(require('./secret.js').BOT_TOKEN)
	.then( () => {
		console.log('PSM Helper bot is available.');
	})
	.catch( err => {
		console.log(err);
		process.exit(1);
	});

}
catch (err) {
	console.log(err);
}

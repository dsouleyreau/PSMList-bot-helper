/*
 *
 * Discord Helper Bot for PSMList
 *
 * Authors : Arshellan and DodoDye
 *
 */

// imports
const Discord = require( 'discord.js' ),
	  config = require('./config'),
	  prefix = config.prefix.toLowerCase(),
	  bot = new Discord.Client({
		  presence: {
		  	  status: 'online',
				  activity: {
				  name: `${prefix} help`,
				  type: 'PLAYING',
			  },
		  }
	  }),
	  sanitizer = require('sanitize')(),
	  { apiRequest, loadData, allHelp } = require('./utils.js');

// dynamic / async imports
let   /*factions,*/ factionsEmbed,
	extensions, extensionsEmbed,
	/*rarities,*/ raritiesEmbed,
	buildItemEmbed, buildItemsEmbed;

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
		  buildItemEmbed = items.buildItemEmbed;
		  buildItemsEmbed = items.buildItemsEmbed;
		  extensions = extension.extensions
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

const psmDataTypes = ['ship', 'fort', 'crew', 'treasure'];

// bot behavior
bot.on("message", (message) => {
	// stop if the message is from a bot
	if ( message.author.bot ) {
		return;
	}
	// stop if message is too small or prefix not the one this bot expects
	if ( message.content.length < 3 || message.content.slice(0, prefix.length).toLowerCase() !== prefix ) {
		return;
	}
	message.content = message.content.toLowerCase();

	// remove the prefix from the message
	const commandBody = sanitizer.value(message.content.slice(prefix.length), 'str')
	// replace alternative apostrophes for the most widely used one
		.replace(/‘|’|`/g, "'");
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

		case 'help' :
			const help = sanitizer.value(args[0], 'str');
			let helpMessage = '';
			switch (help) {
				case 'ping':
					helpMessage = 'Test your ping for fun!';
					break;
				case 'search':
					helpMessage =
						`Type \`${prefix}search\` to be redirected to the website\n` +
						`\`${prefix}search id <id>\` or \`${prefix}search name <name>\` to research in searchList database\n` +
						`Ex: \`${prefix}search id oe001\``
					;
					break;
				case 'ship':
					helpMessage =
						'Shows information about a ship based on its `name` or `id`.\n' +
						`\`${prefix}ship id <id>\` or \`${prefix}ship name <name>\`\n` +
						`Ex: \`${prefix}ship id oe059\``
					;
					break;
				case 'fort':
					helpMessage =
						'Shows information about a fort based on its `name` or `id`.\n' +
						`\`${prefix}fort id <id>\` or \`${prefix}fort name <name>\`\n` +
						`Ex: \`${prefix}fort rvu065\``
					;
					break;
				case 'crew':
					helpMessage =
						'Shows information about a crew based on its `name` or `id`.\n' +
						`\`${prefix}crew id <id>\` or \`${prefix}crew name <name>\`\n` +
						`Ex: \`${prefix}crew ca063\``
					;
					break;
				case 'treasure':
					helpMessage =
						'Shows information about a treasure based on its `name` or `id`.\n' +
						`\`${prefix}treasure id <id>\` or \`${prefix}treasure name <name>\`\n` +
						`Ex: \`${prefix}treasure rof209\``
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
			if (['search', 'ship', 'fort', 'crew', 'treasure'].includes(help)) {
				helpMessage += '\n\nID research has a permissive syntax:\n' +
					` * \`${prefix}extensions\` shows original, community and WizKids short names to use as a prefix\n` +
					' * it is not case sensitive -> PotCC = potcc = POTCC\n' +
					' * leading zeros are optional -> oe001 = oe01 = oe1'
			}

			message.channel.send(helpMessage);
			break;

		case 'search' :
			if (args.length === 0) {
				message.channel.send('More content is available at https://psmlist.com');
			} else {
				let input = '', searchType = '';
				// get search type and remove it from args for future processing
				try {
					searchType = sanitizer.value(args.shift(), 'str').toLowerCase();
				} catch (e) {
					console.log(`Error with command '${message.content}'`);
				}
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
					// check length without space characters
					if (input.replace(' ', '').length < 3) {
						return message.channel.send('Name needs at least 3 characters.');
					}
					if (input.length > 30) {
						return message.channel.send('Name is limited to 30 characters.');
					}
				} else {
					return message.channel.send(`Please indicate if you search by \`name\` or \`id\`.\nType \`${prefix}help\` if needed.`);
				}
				// run all requests to API in parallel and process results all requests ended
				Promise.all([
					// add type as last element to identify each array as the are returned in api answer's order
					apiRequest(`${config.apiURI}/ship/${searchType === 'id' ? 'id' : 'name'}/${input}`),
					apiRequest(`${config.apiURI}/fort/${searchType === 'id' ? 'id' : 'name'}/${input}`),
					apiRequest(`${config.apiURI}/crew/${searchType === 'id' ? 'id' : 'name'}/${input}`),
					apiRequest(`${config.apiURI}/treasure/${searchType === 'id' ? 'id' : 'name'}/${input}`),
				])
					.then( data => {
						// create an associative array of data by item type
						const dataByType = {};
						for (let i in data) {
							const array = data[i];
							const type = psmDataTypes[i];
							// avoid creating an empty embed if there is no value for this item type
							if (array.length > 0) {
								dataByType[type] = array;
							}
						}

						// get the amount of items to display
						const length = data[0].length + data[1].length + data[2].length + data[3].length;

						if (length === 0) {
							message.channel.send(`${searchType === 'id' ? 'ID' : 'Name'} provided did not match any type.`)
						} else {
							// check if there would be one item to show or two corresponding to crew from the same card (with same extension and numid)
							const isSingleEmbed = (
								length === 1
								||
								(
									// check if only one type
									length === 2
									&& Object.keys(dataByType).length === 1
									&& (
										// crew from the same card
										(
											dataByType['crew'] &&
											(
												dataByType['crew'][0].idextension === dataByType['crew'][1].idextension
												&& dataByType['crew'][0].numid.match('[^a]+')[0] === dataByType['crew'][1].numid.match('[^b]+')[0]
											)
										)
										||
										// ships from both non unlimited and unlimited extensions
										(
											dataByType['ship'] &&
											(
												extensions[dataByType['ship'][0].idextension].short + 'U' === extensions[dataByType['ship'][1].idextension].short
												|| extensions[dataByType['ship'][0].idextension].short === extensions[dataByType['ship'][1].idextension].short + 'U'
											)
										)
									)
								)
							);

							// create one embed for each type of item
							for (let type in dataByType) {
								const array = dataByType[type];
								// if data contains only one item or two successive crew
								if (isSingleEmbed) {
									// create detailed embed
									const embeds = buildItemEmbed(type, array);
									message.channel.send(embeds[0])
									.catch(err => {
										console.log(err);
										console.log('Error with the research: ' + input);
										// message.channel.send('Internal error.');
									});
									// add second embed if its a crew from the same card
									if (embeds[1]) {
										message.channel.send(embeds[1])
										.catch(err => {
											console.log(err);
											console.log('Error with the research: ' + input);
											// message.channel.send('Internal error.');
										});
									}
								} else {
									message.channel.send(buildItemsEmbed(type, array, input))
									.catch(err => {
										// console.log(err);
										console.log('Too many results with the research: ' + input);
										message.channel.send('Unable to generate result with more than 6000 characters. Please refine your search terms.');
									});
								}
							}
						}
					})
					.catch(err => {
						console.log(err);
						message.channel.send('Unexpected error, please try again.');
					});
			}
			break;

		case 'ship':
		case 'crew':
		case 'fort':
		case 'treasure':
			let input = '', searchType = '';
			// get search type and remove it from args for future processing
			try {
				searchType = sanitizer.value(args.shift(), 'str').toLowerCase();
			} catch (e) {
				console.log(`Error with command '${message.content}'`);
			}
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
				if (input.replace(' ', '').length < 3) {
					return message.channel.send('Name needs at least 3 characters.');
				}
				if (input.length > 30) {
					return message.channel.send('Name is limited to 30 characters.');
				}
			} else {
				return message.channel.send(`Please indicate if you search by \`name\` or \`id\`.\nType \`${prefix}help\` if needed.`);
			}

			apiRequest(`${config.apiURI}/${command}/${searchType === 'id' ? 'id' : 'name'}/${input}`)
				.then( data => {
					if (data.length === 0) {
						message.channel.send(`${searchType === 'id' ? 'ID' : 'Name'} provided did not match any type.`)
					} else if (data.length === 1 || (command === 'crew' && data.length === 2 && data[0].idextension === data[1].idextension && data[0].numid.match('[^a]+')[0] === data[1].numid.match('[^b]+')[0])) {
						const embeds = buildItemEmbed(command, data);
						message.channel.send(embeds[0])
						.catch( err => {
							console.log('Error line 305: ' + input);
							console.log(err);
						});
						if (embeds[1]) {
							message.channel.send(embeds[1])
							.catch( err => {
								console.log('Error line 305: ' + input);
								console.log(err);
							});
						}
					} else {
						message.channel.send(buildItemsEmbed(command, data, input))
						.catch( err => {
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
			if (!Number.isFinite(number) || number < 2 || number > 10) {
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

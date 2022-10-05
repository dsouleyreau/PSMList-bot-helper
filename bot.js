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
	  { apiRequest, loadData, allHelp, outputSimulatedCost } = require('./utils.js');

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
	console.trace(err);
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
	}).catch(err => {
		console.trace(err);
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

	// if send content is a string, embed it
	const send = message.channel.send;
	message.channel.send = function(content, options) {
		if (typeof content === 'string') {
			return send.call(
				message.channel,
				new Discord.MessageEmbed()
					.setDescription(content),
				options
			);
		}
		else {
			return send.call(
				message.channel,
				content,
				options
			);
		}
	}

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
			const helpCommand = sanitizer.value(args[0], 'str');
			let helpMessage = '';
			let helpTitle = '';
			switch (helpCommand) {
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
					helpMessage = 'List of rarities with their color.';
					break;
				case 'udc':
				case 'simcost':
					helpTitle = helpCommand === 'udc' ? 'UDC': 'SimCost';
					helpMessage = `Calculates the point value of a ship based on the [${helpTitle}](https://psmlist.com/public/blog/documentation_${helpCommand}) algorithm.

					\`${prefix}${helpCommand} <masts> <cargo> <speed> <cannons>\`
					
					\`speed\` is a list of speed letters (S, L, D, T), with or without a + sign in between.
					\`cannons\` is a list of cannons dice (1 to 6) and range (S or L), with or without a space in between.
					Lowercase letters are supported.
					
					Ex: \`${prefix}${helpCommand} 3 5 SL 2S3L2S\`
					 or \`${prefix}${helpCommand} 3 5 s+l 2s 3l 2s\``;
					break;
				case 'ping':
					helpMessage = 'Test your ping for fun!';
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
			if (['search', 'ship', 'fort', 'crew', 'treasure'].includes(helpCommand)) {
				helpMessage += '\n\nID research has a permissive syntax:\n' +
					` * \`${prefix}extensions\` shows original, community and WizKids short names to use as a prefix\n` +
					' * it is not case sensitive -> PotCC = potcc = POTCC\n' +
					' * leading zeros are optional -> oe001 = oe01 = oe1'
			}

			if (helpTitle === '') {
				helpTitle = helpCommand;
			}

			message.channel.send(
				new Discord.MessageEmbed()
					.setTitle(helpTitle)
					.setDescription(helpMessage)
			);
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
						let types = 0;
						for (let typeID in data) {
							const array = data[typeID];
							const type = psmDataTypes[typeID];
							// avoid creating an empty embed if there is no value for this item type
							if (array.length > 0) {
								dataByType[type] = array;
								types ++;
							}
						}

						// get the amount of items to display
						const length = data.flat().length;

						if (length === 0) {
							message.channel.send(`${searchType === 'id' ? 'ID' : 'Name'} provided did not match any type.`)
						} else {
							// check if there would be one item to show or two corresponding to crew from the same card (with same extension and numid)
							const isSingleEmbed =
								// more than one type or more than two items means multi embed
								types > 1
								|| length > 2 ? false :
								// one item or two which match type specific conditions
								(
									length === 1
									||
									(
										// crew from the same card
										(
											dataByType['crew'] &&
											(
												dataByType['crew'][0].idextension === dataByType['crew'][1].idextension
												&& dataByType['crew'][0].numid.match('[^a]+')[0] === dataByType['crew'][1].numid.match('[^b]+')[0]
											)
										)
										||
										// ships from both non Unlimited and Unlimited extensions
										(
											dataByType['ship'] &&
											(
												extensions[dataByType['ship'][0].idextension].short + 'U' === extensions[dataByType['ship'][1].idextension].short
												|| extensions[dataByType['ship'][0].idextension].short === extensions[dataByType['ship'][1].idextension].short + 'U'
											)
										)
									)
								);
							
							// keep only the ship not from Unlimited extension
							if (isSingleEmbed && dataByType['ship'] && dataByType['ship'].length === 2) {
								dataByType['ship'] = [
									!(extensions[dataByType['ship'][0].idextension].short.endsWith('U')) ?
										dataByType['ship'][0] : dataByType['ship'][1]
								]
							}
							// create one embed for each type of item
							for (let type in dataByType) {
								const array = dataByType[type];
								// if data contains only one item or two successive crew
								if (isSingleEmbed) {
									// create detailed embed
									const embeds = buildItemEmbed(type, array);
									message.channel.send(embeds[0])
									.catch(err => {
										console.trace(err);
										console.log('Error with the research: ' + input);
										// message.channel.send('Internal error.');
									});
									// add second embed if its a crew from the same card
									if (embeds[1]) {
										message.channel.send(embeds[1])
										.catch(err => {
											console.trace(err);
											console.log('Error with the research: ' + input);
											// message.channel.send('Internal error.');
										});
									}
								} else {
									message.channel.send(buildItemsEmbed(type, array, input))
									.catch(err => {
										console.log('Too many results with the research: ' + input);
										console.trace(err);
										message.channel.send('Unable to generate response because of too many results to print. Please refine your search terms to reduce it.');
									});
								}
							}
						}
					})
					.catch(err => {
						console.trace(err);
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
							console.trace(err);
						});
						if (embeds[1]) {
							message.channel.send(embeds[1])
							.catch( err => {
								console.log('Error with input: ' + input);
								console.trace(err);
							});
						}
					} else {
						message.channel.send(buildItemsEmbed(command, data, input))
						.catch( err => {
							console.log('Too many results with the research: ' + input);
							console.trace(err);
							message.channel.send('Unable to generate response because of too many results to print. Please refine your search terms to reduce it.');
						});
					}
				})
				.catch(err => {
					console.trace(err);
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

		case 'udc':
		case 'simcost':
			const matches = args.join(' ').toUpperCase().match(/([0-9]|10) ([0-9]|10) ((?:[SLDT]\+?)+) ((?:[1-6](?:S|L) ?)+)/);
			
			if (!matches) {
				return message.channel.send(`Wrong input format.\nType \`${prefix}help ${command}\` if needed.`)
			}

            const masts = matches[1];
            const cargo = matches[2];
            const speed = matches[3].replace(/\+| /g, '');
            const cannons = matches[4].replace(/ /g, '');

			if (command === 'udc') {
				// Masts
				const udc_masts = masts > 2 ? masts - 2 : 0;

				// Cargo
				const udc_cargo = cargo > 2 ? cargo - 2 : 0;

				// Speed
				const udc_speed = (3*((speed.match(/L/g) || []).length)) + (2*((speed.match(/S/g) || []).length));

				// Cannons
				const cannons_arr = cannons.match(/.{2}/g); // cuts the string into 2-char-long segments
				const udc_cannons = !cannons_arr ? 0 :
					cannons_arr.reduce((total, cannon) => {
						// 6 5 4 => free
						if (cannon[0] > 3) {
							return total;
						}
						// 3L 2L 1L 2S 1S => +1 point
						if (cannon[0] < 3) {
							return total + 1;
						}
						// 3S => free
						if (cannon[1] === "S") {
							return total;
						}
						// 3L => +1 point
						return total + 1;
					}, 0);
				
				return message.channel.send(
					outputSimulatedCost(command, udc_masts, udc_cargo, udc_speed, udc_cannons)
				);
			}
			else if (command === 'simcost') {
				function round(value) {
					return Math.round(value * 100.0) / 100.0;
				}
				// Masts
				const simcost_masts = round(masts * 0.7);
	
				// Cargo
				const simcost_cargo = round(cargo * 0.5);
	
				// Speed
				const simcost_speed = round(
					(3*((speed.match(/L/g) || []).length)) + (2*((speed.match(/S/g) || []).length))
					* 0.2
				);
	
				// Cannons
				let simcost_cannons = 0;
				let simcost_cannons_unit = 0;
				const cannons_arr = cannons.match(/.{2}/g); // cuts the string into 2-char-long segments
				if (cannons_arr) {
					cannons_arr.forEach((cannon) => {
						//  6 - cannonvalue = score per cannon. And 1 point per L cannon
						simcost_cannons += 6 - cannon[0];
						if (cannon[1] === "L") {
							simcost_cannons_unit ++;
						}
					});
				}
				simcost_cannons = round(simcost_cannons * 0.3)
				simcost_cannons_unit = round(simcost_cannons_unit * 0.2)
	
				return message.channel.send(
					outputSimulatedCost(command, simcost_masts, simcost_cargo, simcost_speed, simcost_cannons + simcost_cannons_unit)
				);
			}
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
				console.trace(err);
				message.channel.send('Failed to delete old messages!');
			});
			break;

		default :
			message.channel.send(`Unable to understand your request. Type ${prefix}help to show the list of available commands.`);
			break;
	}
});

bot.login(require('./secret.js').BOT_TOKEN)
	.then( () => {
		console.log('PSM Helper bot is available.');

		const channel = bot.channels.cache.find(channel => channel.name === "bot-dev")

		if (channel) {
			channel.send(
				new Discord.MessageEmbed()
					.setTitle('🤖\u200b Helper bot update\u200b 🤖')
					.setDescription(`
						<:1L:849023175584776222> You can now ask the bot to calculate point cost based on UDC or SimCost. Type \`psm help udc\` or \`psm help simcost\` to get detailed instructions or visit the [online documentation](https://psmlist.com/public/blog/documentation_psmlisthelper) for more info
						<:1S:849023175937490975> In the case the result of a search only outputs two ships and one is for example from RV and the other one from RVU, it will display only the RV one instead of the list. Works with RV, RVU, BC, BCU, SM and SMU.
						<:1S:849023175937490975> The search engine will turn any of the weird apostrophes like ‘ into ' before searching, so you won't be penalized if your phone only has different apostrophes available.
						<:1S:849023175937490975> More improvemets and bugfixes (see the [changelog](https://psmlist.com/public/blog/psmlist_helper_0_4_0))
					`)
			);
			console.log('bot-dev sent');
		}
	})
	.catch( err => {
		console.trace(err);
		process.exit(1);
	});

}
catch (err) {
	console.trace(err);
}

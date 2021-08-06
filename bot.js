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
	  { apiRequest, loadData, allHelp } = require('./utils.js');

// dynamic / async imports
let   /*factions,*/ factionsEmbed,
	  /*extensions,*/ extensionsEmbed,
	  /*rarities,*/ raritiesEmbed,
	  itemEmbed, itemsEmbed

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
	const commandBody = message.content.slice(prefix.length);
	// split the message into pieces separated by a 'space'
	const args = commandBody.split(' ');
	// switch command and args if firts argument is 'help'
	// put the first arg into lowercase because it is the command name
	const command = args[1] && args[1].toLowerCase() === 'help' ? args.splice(1, 1)[0].toLowerCase() : args.shift().toLowerCase();

	// defines if it is possible to manage messages (help and purge commands)
	const clientHasManageMessagesPermission = message.member.hasPermission('MANAGE_MESSAGES') || message.member.hasPermission('ADMINISTRATOR');
	const botHasManageMessagesPermission = message.guild.me.hasPermission('MANAGE_MESSAGES') || message.guild.me.hasPermission('ADMINISTRATOR');
	const hasManageMessagesPermission = clientHasManageMessagesPermission || botHasManageMessagesPermission;

	switch (command) {
		case 'psm' :
			if (args.length !== 0) {
				message.channel.send('More content is available at https://psmlist.com');
			} else {
				let input = '';
				// get search type and remove it from args for future processing
				const searchType = args.shift();
				if (searchType === 'id') {
					if (args.length > 1) {
						return message.channel.send('Please provide only one ID per research.');
					}
					input = args[0];
					if (input.length > 10) {
						return message.channel.send('ID is limited to 10 characters.');
					}
				} else if (searchType === 'name' || searchType === 'text') {
					input = args.join(' ');
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
					apiRequest(`${config.apiURI}/ship/${searchType === 'id' ? 'id' : 'name'}/${input}`),
					apiRequest(`${config.apiURI}/fort/${searchType === 'id' ? 'id' : 'name'}/${input}`),
					apiRequest(`${config.apiURI}/crew/${searchType === 'id' ? 'id' : 'name'}/${input}`),
				])
					.then(values => {
						// flatten the input array to check the amount and type of results
						const data = values.flat();
						if (data.length === 0) {
							message.channel.send(`${searchType === 'id' ? 'ID' : 'Name'} provided did not match any type.`)
						}
						// check if two results correspond to crews from the same card (with same ID, but database IDs follow each other)
						else if (data.length === 1 || (data.length === 2 && data[0].idExtension === data[1].idExtension && data[0].idCrew + 1 === data[1].idCrew)) {
							// create detailed embed
							const embeds = itemEmbed(data);
							message.channel.send(embeds[0]);
							// add second embed if its a crew from the same card
							if (embeds[1]) {
								message.channel.send(embeds[1]);
							}
						} else {
							// create one embed for each type of item (ship, fort, crew)
							for (let value of values) {
								// avoid creating an empty embed if there is no value for the item type
								if (value.length === 0) {
									continue;
								}
								// TODO: handling large results
								try {
									message.channel.send(itemsEmbed(value, input));
								} catch (err) {
									console.log(err);
									console.log('Too many results with the research: ' + input);
								}
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
			switch (args[0]) {
				case 'ping':
					message.channel.send('Test your ping for fun!');
					break;
				case 'psm':
					message.channel.send(`Type \`${prefix}psm [id <id> | name <name>]\` to get some information or \`${prefix}psm\` to be redirected to the website.`);
					break;
				case 'ship':
					message.channel.send(
						'Shows information about a ship based on its name or ID.\n' +
						`\`${prefix}ship [id <id> | name <name>]\`\n` +
						`Ex: \`${prefix}ship id oe001\``
					);
					break;
				case 'fort':
					message.channel.send(
						'Shows information about a fort based on its name or ID.\n' +
						`\`${prefix}fort [id <id> | name <name>]\`\n` +
						`Ex: \`${prefix}fort oe001\``
					);
					break;
				case 'crew':
					message.channel.send(
						'Shows information about a crew based on its name or ID.\n' +
						`\`${prefix}crew [id <id> | name <name>]\`\n` +
						`Ex: \`${prefix}crew oe001\``
					);
					break;
				case 'factions':
					message.channel.send('List of factions.');
					break;
				case 'extensions':
					message.channel.send('List of extensions.');
					break;
				case 'rarities':
					message.channel.send('List of rarities.');
					break;
				case 'purge':
					if (hasManageMessagesPermission) {
						message.channel.send('Purge previous messages. Give it the number of messages to delete.');
					}
					else {
						message.channel.send(allHelp(hasManageMessagesPermission));
					}
					break;
				default:
					message.channel.send(allHelp(hasManageMessagesPermission));
			}
			break;

		case 'ship':
		case 'crew':
		case 'fort':
			let input = '';
			const searchType = args.shift();
			if (searchType === 'id') {
				if (args.length > 1) {
					return message.channel.send('Please provide only one ID per research.');
				}
				input = args[0];
				if (input.length > 10) {
					return message.channel.send('ID is limited to 10 characters.');
				}
			} else if (searchType === 'name' || searchType === 'text') {
				input = args.join(' ');
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
					} else if (data.length === 1 || (data.length === 2 && data[0].idExtension === data[1].idExtension && data[0].idCrew + 1 === data[1].idCrew)) {
						const embeds = itemEmbed(data);
						message.channel.send(embeds[0]);
						if (embeds[1]) {
							message.channel.send(embeds[1]);
						}
					} else {
						try {
							message.channel.send(itemsEmbed(data, input));
						} catch (e) {
							console.log('Too many results with the research: ' + input);
						}
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

			try {
				args[0] = Number.parseInt(args[0]);
			} catch (e) {
				args[0] = 0;
			}

			// check value type
			if (isNaN(args[0]) || args[0] < 2 || args[0] > 10) {
				return message.channel.send('Indicate a valid number, between 2 and 10.');
			}

			message.delete();

			message.channel.bulkDelete(args[0], true)
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

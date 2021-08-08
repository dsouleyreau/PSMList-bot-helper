const Discord = require('discord.js'),
      { emojis } = require('./config');

// take arguments from previous imports
module.exports = (factions, extensions, rarities) => {
    return {
        // create embed depending on type and number
        itemsEmbed(items, input) {
            let fields = [];
            let title = '';
            // if the first item
            if (items[0].hasOwnProperty('idShip') && items[0].hasOwnProperty('isFort')) {
                if (items[0].isFort) {
                    title = 'Forts listed as : \ ' + input;
                }
                else {
                    title = 'Ships listed as : \ ' + input;
                }
            }
            else if (items[0].hasOwnProperty('idCrew')) {
                title = 'Crews listed as : \ ' + input;
            }
            else {
                return;
            }
            // pack results in columns of 8
            for ( let i = 0; i < items.length; i += 8 ) {
                const output = items.slice(i, i + 8).reduce( (accu, item) => {
                    const factionName = factions[item.idFaction];
                    const extensionObject = extensions[item.idExtension];
                    return accu +
                        '\ \u200b\ \u200b\ \u200b\ \u200b' +
                        extensionObject.short + item.numId +
                        '\ \u200b\ \u200b' +
                        emojis[factionName] +
                        '\ \u200b\ \u200b' +
                        item.name.charAt(0).toUpperCase() + item.name.slice(1) +
                        '\n';
                }, '');
                fields.push({ name: title, value: output, inline: true });
                title = '\u200b'; // second, third... titles will be empty
            }

            return new Discord.MessageEmbed()
                .addFields(fields)
                .setFooter('Provided by Broken Arms Team');
        },
        itemEmbed(data) {
            const embeds = [];
            for (let item of data) {
                const factionName = factions[item.idFaction];
                const extensionObject = extensions[item.idExtension];

                const itemID = extensionObject.short + item.numId;
                const itemType = item.hasOwnProperty('idShip') && item.hasOwnProperty('isFort') ? item.isFort ?
                    'fort' : 'ship' : 'crew';

                const itemEmbed = new Discord.MessageEmbed()
                    .setColor(rarities[item.idRarity].color)
                    .attachFiles([__dirname + '/bot_icon.png'])
                    .setAuthor(`PSM ${itemType} identity`, 'attachment://bot_icon.png', 'https://psmlist.com/')
                    .setTitle(`${item.name} (${itemID})`)
                    .setURL('https://psmlist.com/ship/' + itemID)
                    //.addField('Inline field title', 'Some value here', true)
                    //.setImage('https://i.imgur.com/wSTFkRM.png')
                    // .setTimestamp()
                    .setFooter('Provided by Broken Arms Team');

                if (itemType === 'ship') {
                    itemEmbed.addFields(
                        {
                            name: emojis[extensionObject.short] + '\ \u200b\ \u200b' + extensionObject.name + '\ \u200b\ \u200b\ \u200b\ \u200b' + emojis[factionName] + '\ \u200b\ \u200b' + factionName.charAt(0).toUpperCase() + factionName.slice(1),
                            value: item.points + ' points' + '\ \u200b\ \u200b\ \u200b' +
                                emojis.masts + '\ ' + item.masts + '\ \u200b\ \u200b\ \u200b' +
                                emojis.cargo + '\ ' + item.cargo + '\ \u200b\ \u200b\ \u200b' +
                                emojis.speed + '\ ' + item.baseMove + '\ \u200b\ \u200b\ \u200b' +
                                emojis.cannon + '\ ' + item.cannons.match(/\w{2}/g).reduce((cannons, cannon) => cannons + '\ \u200b\ \u200b' + emojis[cannon], ''),
                        },
                        {name: 'Ability', value: item.defaultAptitude ?? '-', inline: true},
                        {name: 'Flavor Text', value: item.defaultLore ?? '-', inline: true},
                    )
                } else if (itemType === 'crew') {
                    itemEmbed.addFields(
                        {
                            name: emojis[extensionObject.short] + '\ \u200b\ \u200b' + extensionObject.name + '\ \u200b\ \u200b\ \u200b\ \u200b' + emojis[factionName] + '\ \u200b\ \u200b' + factionName.charAt(0).toUpperCase() + factionName.slice(1),
                            value: item.points + ' points'
                        },
                        {name: 'Ability', value: item.defaultAptitude ?? '-', inline: true},
                        {name: 'Flavor Text', value: item.defaultLore ?? '-', inline: true},
                    )
                } else {
                    itemEmbed.addFields(
                        {
                            name: emojis[extensionObject.short] + '\ \u200b\ \u200b' + extensionObject.name + '\ \u200b\ \u200b\ \u200b\ \u200b' + emojis[factionName] + '\ \u200b\ \u200b' + factionName.charAt(0).toUpperCase() + factionName.slice(1),
                            value: item.points + ' points' + '\ \u200b\ \u200b\ \u200b' +
                                emojis.cannon + '\ ' + item.cannons.match(/\w{2}/g).reduce((cannons, cannon) => cannons + '\ \u200b\ \u200b' + emojis[cannon], ''),
                        },
                        {name: 'Ability', value: item.defaultAptitude ?? '-', inline: true},
                        {name: 'Flavor Text', value: item.defaultLore ?? '-', inline: true},
                    )
                }
                embeds.push( itemEmbed );
            }

            return embeds;
        }
    }
}

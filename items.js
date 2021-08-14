const Discord = require('discord.js'),
      { emojis } = require('./config');

// take arguments from previous imports
module.exports = (factions, extensions, rarities) => {
    return {
        // create embed depending on type and number
        itemsEmbed(items, input) {
            const fields = [];
            let title = '';
            // if the first item
            if (items[0].hasOwnProperty('isfort')) {
                if (items[0].isfort) {
                    title = 'Forts listed as : \ ' + input;
                }
                else {
                    title = 'Ships listed as : \ ' + input;
                }
            }
            else {
                title = 'Crews listed as : \ ' + input;
            }
            // pack results in columns of 8
            for ( let i = 0; i < items.length; i += 8 ) {
                const output = items.slice(i, i + 8).reduce( (accu, item) => {
                    const faction = factions[item.idfaction];
                    const extensionObject = extensions[item.idextension];
                    return accu +
                        '\ \u200b\ \u200b\ \u200b\ \u200b' +
                        extensionObject.short + item.numid +
                        '\ \u200b\ \u200b' +
                        emojis[faction.nameimg] +
                        '\ \u200b\ \u200b' +
                        item.name +
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
                const faction = factions[item.idfaction];
                const extensionObject = extensions[item.idextension];

                const itemID = extensionObject.short + item.numid;
                const itemType = item.hasOwnProperty('isfort') ? item.isfort ?
                    'fort' : 'ship' : 'crew';

                const itemEmbed = new Discord.MessageEmbed()
                    .setColor(rarities[item.idrarity].color)
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
                            name: emojis[extensionObject.short] + '\ \u200b\ \u200b' + extensionObject.name + '\ \u200b\ \u200b\ \u200b\ \u200b' + emojis[faction.nameimg] + '\ \u200b\ \u200b' + faction.name,
                            value: item.points + ' points' + '\ \u200b\ \u200b\ \u200b' +
                                emojis.masts + '\ ' + item.masts + '\ \u200b\ \u200b\ \u200b' +
                                emojis.cargo + '\ ' + item.cargo + '\ \u200b\ \u200b\ \u200b' +
                                emojis.speed + '\ ' + item.basemove + '\ \u200b\ \u200b\ \u200b' +
                                emojis.cannon + '\ ' + item.cannons.match(/\w{2}/g).reduce((cannons, cannon) => cannons + '\ \u200b\ \u200b' + emojis[cannon], ''),
                        },
                        {name: 'Ability', value: item.defaultaptitude ?? '-', inline: true},
                        {name: 'Flavor Text', value: item.defaultlore ?? '-', inline: true},
                    )
                } else if (itemType === 'crew') {
                    itemEmbed.addFields(
                        {
                            name: emojis[extensionObject.short] + '\ \u200b\ \u200b' + extensionObject.name + '\ \u200b\ \u200b\ \u200b\ \u200b' + emojis[faction.nameimg] + '\ \u200b\ \u200b' + faction.name,
                            value: item.points + ' points'
                        },
                        {name: 'Ability', value: item.defaultaptitude ?? '-', inline: true},
                        {name: 'Flavor Text', value: item.defaultlore ?? '-', inline: true},
                    )
                } else {
                    itemEmbed.addFields(
                        {
                            name: emojis[extensionObject.short] + '\ \u200b\ \u200b' + extensionObject.name + '\ \u200b\ \u200b\ \u200b\ \u200b' + emojis[faction.nameimg] + '\ \u200b\ \u200b' + faction.name,
                            value: item.points + ' points' + '\ \u200b\ \u200b\ \u200b' +
                                emojis.cannon + '\ ' + item.cannons.match(/\w{2}/g).reduce((cannons, cannon) => cannons + '\ \u200b\ \u200b' + emojis[cannon], ''),
                        },
                        {name: 'Ability', value: item.defaultaptitude ?? '-', inline: true},
                        {name: 'Flavor Text', value: item.defaultlore ?? '-', inline: true},
                    )
                }
                embeds.push( itemEmbed );
            }

            return embeds;
        }
    }
}

const Discord = require('discord.js'),
      { emojis } = require('./config');

// take arguments from previous imports
module.exports = (factions, extensions, rarities) => {
    return {
        // create embed depending on type and number
        itemsEmbed(type, items, input) {
            const fields = [];
            let title = type.charAt(0).toUpperCase() + type.slice(1) + 's listed as: ' + input;
            // pack results in columns of 8
            for ( let i = 0; i < items.length; i += 8 ) {
                const output = items.slice(i, i + 8).reduce( (accu, item) => {
                    const faction = factions[item.idfaction];
                    const extensionObject = extensions[item.idextension];
                    return accu +
                        ' \u200b \u200b ' + extensionObject.short + item.numid +
                        (faction && faction.nameimg ? ' \u200b ' + emojis[faction.nameimg] : '') +
                        ' \u200b\ ' + item.name +
                        '\n';
                }, '');
                fields.push({ name: title, value: output, inline: true });
                title = '\u200b'; // second, third... titles will be empty
            }

            return new Discord.MessageEmbed()
                .addFields(fields)
                .setFooter('Provided by Broken Arms Team');
        },
        itemEmbed(type, data) {
            const embeds = [];
            for (let item of data) {
                const faction = factions[item.idfaction];
                const extensionObject = extensions[item.idextension];

                const itemID = extensionObject.short + item.numid;

                const itemEmbed = new Discord.MessageEmbed()
                    .setColor(rarities[item.idrarity].color)
                    .attachFiles([__dirname + '/bot_icon.png'])
                    .setAuthor(`PSM ${type} identity`, 'attachment://bot_icon.png', 'https://psmlist.com/')
                    .setTitle(`${item.name} (${itemID})`)
                    .setURL('https://psmlist.com/public/' + type + '/' + itemID)
                    //.addField('Inline field title', 'Some value here', true)
                    //.setImage('https://i.imgur.com/wSTFkRM.png')
                    // .setTimestamp()
                    .setFooter('Provided by Broken Arms Team');

                switch(type){
                    case 'ship':
                        itemEmbed.addFields([
                            {
                                name: emojis[extensionObject.short] + ' \u200b ' + extensionObject.name + ' \u200b - \u200b ' + extensionObject.short + ' \u200b \u200b \u200b ' + emojis[faction.nameimg] + ' \u200b ' + faction.name,
                                value: item.points + ' points' + ' \u200b \u200b ' +
                                    emojis.masts + ' ' + item.masts + ' \u200b \u200b ' +
                                    emojis.cargo + ' ' + item.cargo + ' \u200b \u200b ' +
                                    emojis.speed + ' ' + item.basemove + ' \u200b \u200b ' +
                                    emojis.cannon + ' ' + item.cannons.match(/\w{2}/g).reduce((cannons, cannon) => cannons + ' \u200b ' + emojis[cannon], ''),
                            },
                            {name: 'Ability', value: item.defaultaptitude || '-', inline: true},
                            {name: 'Flavor Text', value: item.defaultlore || '-', inline: true}
                        ]);
                        break;
                    case 'crew':
                        itemEmbed.addFields([
                            {
                                name: emojis[extensionObject.short] + ' \u200b ' + extensionObject.name + ' \u200b - \u200b ' + extensionObject.short + ' \u200b \u200b \u200b ' + emojis[faction.nameimg] + ' \u200b ' + faction.name,
                                value: '**' + item.points + '** points',
                            },
                            { name: 'Ability', value: item.defaultaptitude || '-', inline: true },
                            { name: 'Flavor Text', value: item.defaultlore || '-', inline: true },
                        ]);
                        break;
                    case 'fort':
                        itemEmbed.addFields([
                            {
                                name: emojis[extensionObject.short] + ' \u200b ' + extensionObject.name + ' \u200b - \u200b ' + extensionObject.short + ' \u200b \u200b \u200b ' + emojis[faction.nameimg] + ' \u200b ' + faction.name,
                                value: item.points + ' points \u200b \u200b ' +
                                    emojis.cannon + '\ ' + item.cannons.match(/\w{2}/g).reduce((cannons, cannon) => cannons + ' \u200b b' + emojis[cannon], ''),
                            },
                            {name: 'Ability', value: item.defaultaptitude || '-', inline: true},
                            {name: 'Flavor Text', value: item.defaultlore || '-', inline: true}
                        ]);
                        break;
                    case 'treasure':
                        itemEmbed.addField(
                            emojis[extensionObject.short] + ' \u200b ' + extensionObject.name + ' \u200b - \u200b ' + extensionObject.short,
                            item.defaultaptitude || '-'
                        );
                        break;
                }
                embeds.push( itemEmbed );
            }

            return embeds;
        }
    }
}


const Discord = require('discord.js'),
    { emojis } = require('./config'),
    dbdata = require('./dbdata.js');

module.exports = {
    // create embed depending on type and number
    buildItemsEmbed(type, items, input) {
        let title = type.charAt(0).toUpperCase() + type.slice(1) + 's listed as: ' + input;
        const fields = [];

        // pack results in columns of 8
        for (let i = 0; i < items.length; i += 8) {
            let output = '';

            if (type !== 'keyword') {
                output = items.slice(i, i + 8).reduce((accu, item) => {
                    const faction = dbdata.factions[item.idfaction];
                    const extensionObject = dbdata.extensions[item.idextension];
                    return accu +
                        ' \u200b \u200b ' + '[' + extensionObject.short + item.numid + '](https://psmlist.com/public/' + (type !== 'fort' ? type : 'ship') + '/' + extensionObject.short + item.numid + ')' +
                        (faction && faction.nameimg ? ' \u200b ' + emojis[faction.nameimg] : '') +
                        ' \u200b\ ' + item.name +
                        '\n';
                }, '');
            }
            else {
                output = items.slice(i, i + 8).reduce((accu, item) =>
                    accu + ' \u200b \u200b ' + '[' + item.shortname + '](https://www.psmlist.com/public/keyword/detail?kw=' + item.shortname + ') \n'
                    , '');
            }
            fields.push({ name: title, value: output, inline: true });
            title = '\u200b'; // second, third... titles will be empty
        }

        return new Discord.MessageEmbed()
            .addFields(fields)
            .setFooter('Provided by Broken Arms Team');
    },
    buildItemEmbed(type, data) {
        const embeds = [];

        const itemEmbed = new Discord.MessageEmbed()
            .attachFiles([`${__dirname}/bot_icon.png`])
            .setAuthor(`PSM ${type} identity`, 'attachment://bot_icon.png', 'https://psmlist.com/')
            // .setTimestamp()
            .setFooter('Provided by Broken Arms Team');

        if (type === 'keyword') {
            const item = data[0];
            return [
                itemEmbed
                    .setTitle(item.shortname)
                    .setURL(`https://www.psmlist.com/public/keyword/detail?kw=${item.shortname}`)
                    .addFields([
                        { name: 'Cost', value: item.cost, inline: true },
                        { name: 'Category', value: dbdata.kw_categories[item.idkeywordtype].name, inline: true },
                        { name: 'Target', value: dbdata.kw_targets[item.idkeywordtarget].name, inline: true },
                        { name: 'Effect', value: item.effect }
                    ])
            ]
        }

        for (let item of data) {
            const faction = dbdata.factions[item.idfaction];
            const extensionObject = dbdata.extensions[item.idextension];

            const itemID = extensionObject.short + item.numid;

            if (type === 'fort') {
                type = 'ship';
            }

            itemEmbed
                .setColor(dbdata.rarities[item.idrarity].color)
                .setTitle(`${item.name} (${itemID})`)
                .setURL(`https://psmlist.com/public/${type}/${itemID}`)
                .setImage(`https://psmlist.com/public/img/gameicons/full/${extensionObject.short}/${item.numid}.jpg`)

            const fields = [];

            switch (type) {
                case 'ship':
                    fields.push(
                        {
                            name: emojis[extensionObject.short] + ' \u200b ' + extensionObject.name + ' \u200b - \u200b ' + extensionObject.short + ' \u200b \u200b \u200b ' + emojis[faction.nameimg] + ' \u200b ' + faction.name,
                            value: '**' + item.points + ' points**' + ' \u200b \u200b ' +
                                emojis.masts + ' ' + item.masts + ' \u200b \u200b ' +
                                emojis.cargo + ' ' + item.cargo + ' \u200b \u200b ' +
                                emojis.speed + ' ' + item.basemove + ' \u200b \u200b ' +
                                emojis.cannon + ' ' + item.cannons.match(/\w{2}/g).reduce((cannons, cannon) => cannons + ' \u200b ' + emojis[cannon], ''),
                        },
                        { name: 'Ability', value: item.defaultaptitude || '-', inline: true },
                        { name: 'Flavor Text', value: item.defaultlore || '-', inline: true }
                    );
                    break;
                case 'crew':
                    fields.push(
                        {
                            name: emojis[extensionObject.short] + ' \u200b ' + extensionObject.name + ' \u200b - \u200b ' + extensionObject.short + ' \u200b \u200b \u200b ' + emojis[faction.nameimg] + ' \u200b ' + faction.name,
                            value: '**' + item.points + ' points**',
                        },
                        { name: 'Ability', value: item.defaultaptitude || '-', inline: true },
                        { name: 'Flavor Text', value: item.defaultlore || '-', inline: true },
                    );
                    break;
                case 'fort':
                    fields.push(
                        {
                            name: emojis[extensionObject.short] + ' \u200b ' + extensionObject.name + ' \u200b - \u200b ' + extensionObject.short + ' \u200b \u200b \u200b ' + emojis[faction.nameimg] + ' \u200b ' + faction.name,
                            value: '**' + item.points + ' points** \u200b \u200b ' +
                                emojis.cannon + '\ ' + item.cannons.match(/\w{2}/g).reduce((cannons, cannon) => cannons + ' \u200b ' + emojis[cannon], ''),
                        },
                        { name: 'Ability', value: item.defaultaptitude || '-', inline: true },
                        { name: 'Flavor Text', value: item.defaultlore || '-', inline: true }
                    );
                    break;
                case 'treasure':
                    fields.push(
                        {
                            name: emojis[extensionObject.short] + ' \u200b ' + extensionObject.name + ' \u200b - \u200b ' + extensionObject.short,
                            value: item.defaultaptitude || '-'
                        }
                    );
                    break;
            }

            if (type !== 'treasure' && item.lookingforbetterpic === 1) {
                fields.push({ name: 'The current image available for this ship is flagged "unsatisfactory".', value: 'If you are willing to help providing a better image of a built ship, please contact us at support@psmlist.com or via Discord.' })
            }

            itemEmbed.addFields(fields);
            embeds.push(itemEmbed);
        }

        return embeds;
    },
    createStaticEmbeds(type) {
        let data = this[type];
        if (!data) {
            data = this[type] = {
                title: type.charAt(0).toUpperCase() + type.slice(1) + ' list'
            }
            switch (type) {
                case 'faction':
                    data.description = Object.values(dbdata.factions).sort().reduce((output, faction) => output + emojis[faction.nameimg] + " \u200b " + faction.name + "\n", "");
                    break;
                case 'extension':
                    data.description = Object.values(dbdata.extensions).reduce((output, extension) => output + emojis[extension.short] + " \u200b " + extension.name + " - " + extension.short + (extension.shortcommunity ? " - " + extension.shortcommunity : '') + (extension.shortwizkids ? " - " + extension.shortwizkids : '') + "\n", "");
                    break;
                case 'rarity':
                    data.description = Object.values(dbdata.rarities).reduce((output, rarity) => `${output}${emojis[rarity.color]} ${rarity.name}\n`, "");
                    break;
                case 'keyword/category':
                    data.description = Object.values(dbdata.kw_categories).reduce((output, kw_category) => `${output} ${kw_category.name}\n`, "");
                    break;
                case 'keyword/target':
                    data.description = Object.values(dbdata.kw_targets).reduce((output, kw_target) => `${output} ${kw_target.name}\n`, "");
                    break;
            }
        }
        return new Discord.MessageEmbed()
            .setTitle(data.title)
            .setDescription(data.description)
            .setFooter('Provided by Broken Arms Team');
    }
}

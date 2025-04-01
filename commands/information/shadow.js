const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const shadowsData = require('././shadows.json'); // Adjust the path if necessary

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shadow')
        .setDescription('Get information about a specific shadow.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the shadow.')
                .setRequired(true)
                .setAutocomplete(true)),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        let allShadowNames = [];

        for (const island in shadowsData.islands) {
            shadowsData.islands[island].forEach(shadow => {
                allShadowNames.push(shadow.name);
            });
        }

        for (const event in shadowsData.events) {
            shadowsData.events[event].forEach(shadow => {
                allShadowNames.push(shadow.name);
            });
        }

        const choices = allShadowNames
            .filter(name => name.toLowerCase().includes(focusedValue.toLowerCase()))
            .slice(0, 25)
            .map(name => ({ name: name, value: name }));

        await interaction.respond(choices);
    },
    async execute(interaction) {
        const shadowName = interaction.options.getString('name');
        let foundShadow = null;

        // Search through islands
        for (const island in shadowsData.islands) {
            const shadow = shadowsData.islands[island].find(s => s.name === shadowName);
            if (shadow) {
                foundShadow = shadow;
                break;
            }
        }

        // If not found in islands, search through events
        if (!foundShadow) {
            for (const event in shadowsData.events) {
                const shadow = shadowsData.events[event].find(s => s.name === shadowName);
                if (shadow) {
                    foundShadow = shadow;
                    break;
                }
            }
        }

        if (foundShadow) {
            const rarityColors = {
                "Common": 0x999999,
                "Epic": 0x800080,
                "Legendary": 0xFFD700
            };
            const embedColor = rarityColors[foundShadow.rarity] || 0x0099ff;

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`✨ ${foundShadow.name}`)
                .setDescription(`Detailed information about **${foundShadow.name}** shadow, showcasing its stats and attributes.`)
                .setThumbnail(foundShadow.imageUrl)
                .addFields(
                    { name: '📍 Obtain Location', value: foundShadow.obtainLocation, inline: true },
                    { name: '⭐ Rarity', value: `**${foundShadow.rarity}**`, inline: true },
                    { name: '🔑 Obtainable', value: foundShadow.obtainable, inline: true },
                    { name: '💪 DPS Range at Max Level', value: foundShadow.dpsRange || 'N/A', inline: true }
                )
                .setFooter({ text: 'Arise Crossover Shadow Info' })
                .setTimestamp(); // Adds the current timestamp

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ content: `Shadow "${shadowName}" not found.`, flags: [MessageFlags.Ephemeral] });
        }
    },
};

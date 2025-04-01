const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const codesData = require('./codes.json'); // Adjust the path if necessary

module.exports = {
    data: new SlashCommandBuilder()
        .setName('codes')
        .setDescription('Shows active, exclusive, and expired reward codes with their rewards and conditions.')
        .addBooleanOption(option =>
            option.setName('showexpired')
                .setDescription('Check to show expired codes (expired codes are hidden by default).')),
    async execute(interaction) {
        const activeCodes = codesData.activeCodes;
        const exclusiveCodes = codesData.exclusiveCodes;
        const expiredCodes = codesData.expiredCodes; // newly added array in codes.json

        const showExpired = interaction.options.getBoolean('showexpired') || false;

        const formatCodes = (codesArray, isExclusive = false) => {
            if (codesArray.length === 0) {
                return 'No codes available at the moment.';
            }
            return codesArray.map(item => {
                let codeInfo = `**\`${item.code}\`**`;
                if (item.reward) {
                    codeInfo += ` → ${item.reward}`;
                }
                if (isExclusive && item.condition) {
                    codeInfo += ` (Condition: ${item.condition})`;
                }
                return codeInfo;
            }).join('\n');
        };

        const embed = new EmbedBuilder()
            .setColor(0x1E90FF) // A refreshed blue color
            .setTitle('🎉 Reward Codes')
            .setDescription('Here are the latest active and exclusive reward codes. Use them wisely to unlock amazing rewards!')
            .addFields(
                { name: '🔥 Active Codes', value: formatCodes(activeCodes), inline: false },
                { name: '💎 Exclusive Codes', value: formatCodes(exclusiveCodes, true), inline: false }
            )
            .setThumbnail('https://yourdomain.com/path/to/thumbnail.png') // Replace with an actual URL for a thumbnail image.
            .setFooter({ text: 'Arise Crossover Reward Codes' })
            .setTimestamp(); // Adds current timestamp

        // Show expired codes only if the user opted in.
        if (showExpired) {
            embed.addFields({ name: '⏳ Expired Codes', value: formatCodes(expiredCodes), inline: false });
        }

        await interaction.reply({ embeds: [embed] });
    },
};

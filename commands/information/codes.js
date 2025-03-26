const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const codesData = require('./codes.json'); // Adjust the path if necessary

module.exports = {
    data: new SlashCommandBuilder()
        .setName('codes')
        .setDescription('Shows active and exclusive reward codes with their rewards and conditions.'),
    async execute(interaction) {
        const activeCodes = codesData.activeCodes;
        const exclusiveCodes = codesData.exclusiveCodes;

        const formatCodes = (codesArray, isExclusive = false) => {
            if (codesArray.length === 0) {
                return 'No codes available at the moment.';
            }
            return codesArray.map(item => {
                let codeInfo = `\`${item.code}\``;
                if (item.reward) {
                    codeInfo += `: ${item.reward}`;
                }
                if (isExclusive && item.condition) {
                    codeInfo += ` (Condition: ${item.condition})`;
                }
                return codeInfo;
            }).join('\n');
        };

        const embed = new EmbedBuilder()
            .setColor(0x0099ff) // You can choose any color
            .setTitle('Reward Codes')
            .addFields(
                { name: '🔥 Active Codes', value: formatCodes(activeCodes), inline: false },
                { name: '💎 Exclusive Codes', value: formatCodes(exclusiveCodes, true), inline: false }, // Added true for isExclusive
            )
            .setFooter({ text: 'Arise Crossover Reward Codes' });

        await interaction.reply({ embeds: [embed] });
    },
};
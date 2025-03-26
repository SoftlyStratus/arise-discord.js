const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

// Replace with the ID of the role you want to be able to verify reports
const VERIFIER_ROLE_ID = 'YOUR_VERIFIER_ROLE_ID';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dungeon-report')
        .setDescription('Report details about a dungeon run.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the dungeon.')
                .setRequired(true)
                .addChoices(
                    { name: 'Leveling City', value: 'Leveling City' },
                    { name: 'Grass Village', value: 'Grass Village' },
                    { name: 'Brum Island', value: 'Brum Island' },
                    { name: 'Faceheal Town', value: 'Faceheal Town' },
                    { name: 'Lucky Kingdom', value: 'Lucky Kingdom' },
                ))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('The rank of the dungeon.')
                .setRequired(true)
                .addChoices(
                    { name: 'S', value: 'S' },
                    { name: 'A', value: 'A' },
                    { name: 'B', value: 'B' },
                    { name: 'C', value: 'C' },
                    { name: 'D', value: 'D' },
                    { name: 'E', value: 'E' },
                ))
        .addAttachmentOption(option => // Required option moved up
            option.setName('image')
                .setDescription('A picture of the dungeon gate.')
                .setRequired(true))
        .addBooleanOption(option => // Non-required option moved down
            option.setName('redgate')
                .setDescription('Was it a red gate?')),
    async execute(interaction) {
        const dungeonName = interaction.options.getString('name');
        const dungeonRank = interaction.options.getString('rank');
        const isRedGate = interaction.options.getBoolean('redgate');
        const dungeonImage = interaction.options.getAttachment('image');

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Dungeon Report')
            .setImage(dungeonImage.url)
            .addFields(
                { name: '📍 Dungeon Name', value: dungeonName, inline: true },
                { name: '🏆 Rank', value: dungeonRank, inline: true },
                { name: '🔴 Red Gate', value: isRedGate === true ? 'Yes' : 'No', inline: true },
                { name: '👯 Double Dungeon', value: 'Awaiting Confirmation...', inline: true },
                { name: '✅ Verified', value: 'No', inline: true },
            )
            .setTimestamp()
            .setFooter({ text: `Reported by ${interaction.user.tag}` });

        const confirmDoubleButton = new ButtonBuilder()
            .setCustomId('confirm_double_dungeon')
            .setLabel('Confirm Double Dungeon')
            .setStyle(ButtonStyle.Primary);

        const notDoubleButton = new ButtonBuilder()
            .setCustomId('not_double_dungeon')
            .setLabel('Not a Double Dungeon')
            .setStyle(ButtonStyle.Secondary);

        const approveButton = new ButtonBuilder()
            .setCustomId('approve_report')
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success);

        const rejectButton = new ButtonBuilder()
            .setCustomId('reject_report')
            .setLabel('Reject')
            .setStyle(ButtonStyle.Danger);

        const reporterRow = new ActionRowBuilder()
            .addComponents(confirmDoubleButton, notDoubleButton);

        const verifierRow = new ActionRowBuilder()
            .addComponents(approveButton, rejectButton);

        const reply = await interaction.reply({ embeds: [embed], components: [reporterRow, verifierRow] });

        // Collector for reporter buttons (Double Dungeon)
        const reporterCollector = reply.createMessageComponentCollector({ filter: i => (i.customId === 'confirm_double_dungeon' || i.customId === 'not_double_dungeon') && i.user.id === interaction.user.id, time: 60000 });

        reporterCollector.on('collect', async i => {
            let updatedEmbed = EmbedBuilder.from(i.message.embeds[0]);

            if (i.customId === 'confirm_double_dungeon') {
                updatedEmbed.spliceFields(3, 1, { name: '👯 Double Dungeon', value: 'Yes', inline: true });
            } else if (i.customId === 'not_double_dungeon') {
                updatedEmbed.spliceFields(3, 1, { name: '👯 Double Dungeon', value: 'No', inline: true });
            }

            await i.update({ embeds: [updatedEmbed], components: [verifierRow] }); // Update embed and keep verifier buttons
            reporterCollector.stop();
        });

        reporterCollector.on('end', collected => {
            if (collected.size === 0) {
                // Optionally handle timeout
            }
        });

        // Collector for verifier buttons (Approve/Reject)
        const verifierCollector = reply.createMessageComponentCollector({ filter: i => (i.customId === 'approve_report' || i.customId === 'reject_report') && i.member.roles.cache.has(VERIFIER_ROLE_ID), time: null }); // Listen indefinitely for verifiers

        verifierCollector.on('collect', async i => {
            let updatedEmbed = EmbedBuilder.from(i.message.embeds[0]);

            if (i.customId === 'approve_report') {
                updatedEmbed.spliceFields(4, 1, { name: '✅ Verified', value: 'Yes', inline: true });
            } else if (i.customId === 'reject_report') {
                updatedEmbed.spliceFields(4, 1, { name: '✅ Verified', value: 'Rejected', inline: true });
            }

            await i.update({ embeds: [updatedEmbed], components: [reporterRow, verifierRow] }); // Update the embed
            await i.reply({ content: i.customId === 'approve_report' ? 'Report approved!' : 'Report rejected!', ephemeral: true });
        });

        verifierCollector.on('end', collected => {
            // Optionally handle the end of the verifier collector
        });
    },
};
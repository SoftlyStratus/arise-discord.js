const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Thresholds for majority voting
const REPORT_THRESHOLD = 3;
const DOUBLE_THRESHOLD = 3;
// Replace with your developer log channel ID
const DEV_LOG_CHANNEL_ID = '1182511650625028127';

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

        // Voting counters
        let reportVotes = 0;
        let doubleVotes = 0;

        // Create the initial embed with vote stats
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Dungeon Report')
            .setImage(dungeonImage.url)
            .addFields(
                { name: '📍 Dungeon Name', value: dungeonName, inline: true },
                { name: '🏆 Rank', value: dungeonRank, inline: true },
                { name: '🔴 Red Gate', value: isRedGate ? 'Yes' : 'No', inline: true },
                { name: '👯 Double Dungeon', value: 'Awaiting Votes...', inline: true },
                { name: '✅ Verified', value: 'Pending', inline: true },
                { name: '🗳 Report Votes', value: `${reportVotes}`, inline: true },
                { name: '🗳 Double Votes', value: `${doubleVotes}`, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: `Reported by ${interaction.user.tag}` });

        // Create vote buttons for report validity and double dungeon
        const voteReportButton = new ButtonBuilder()
            .setCustomId('vote_report')
            .setLabel('Vote Valid Report')
            .setStyle(ButtonStyle.Primary);
        
        const voteDoubleButton = new ButtonBuilder()
            .setCustomId('vote_double')
            .setLabel('Vote Double Dungeon')
            .setStyle(ButtonStyle.Secondary);

        const voteRow = new ActionRowBuilder()
            .addComponents(voteReportButton, voteDoubleButton);

        const replyMessage = await interaction.reply({ 
            embeds: [embed], 
            components: [voteRow],
            fetchReply: true
        });

        // Helper function to update vote fields in the embed
        const updateEmbedVotes = (updatedEmbed) => {
            updatedEmbed.spliceFields(5, 1, { name: '🗳 Report Votes', value: `${reportVotes}`, inline: true });
            updatedEmbed.spliceFields(6, 1, { name: '🗳 Double Votes', value: `${doubleVotes}`, inline: true });
            return updatedEmbed;
        };

        // Read persistent config file to retrieve guild notification channels
        const configPath = path.join(__dirname, '..', '..', 'data', 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            try {
                const fileData = fs.readFileSync(configPath, { encoding: 'utf8' });
                config = JSON.parse(fileData);
            } catch (err) {
                console.error('Error parsing config file:', err);
            }
        }

        // Function to notify every guild that has set up a dungeon notification channel
        const notifyServers = async () => {
            if (config.guilds) {
                for (const guildId in config.guilds) {
                    const channelId = config.guilds[guildId];
                    try {
                        const channel = await interaction.client.channels.fetch(channelId);
                        if (channel) {
                            channel.send(`New verified dungeon report:\nDungeon: ${dungeonName}\nRank: ${dungeonRank}\nRed Gate: ${isRedGate ? 'Yes' : 'No'}`);
                        }
                    } catch (err) {
                        console.error(`Error notifying guild ${guildId}:`, err);
                    }
                }
            }
        };

        // Function to log detailed vote stats to the developer log channel
        const logDevStats = async () => {
            try {
                const devChannel = await interaction.client.channels.fetch(DEV_LOG_CHANNEL_ID);
                if (devChannel) {
                    devChannel.send(`Dungeon Report Stats:\nDungeon: ${dungeonName}\nRank: ${dungeonRank}\nRed Gate: ${isRedGate ? 'Yes' : 'No'}\nReport Votes: ${reportVotes}\nDouble Votes: ${doubleVotes}`);
                }
            } catch (err) {
                console.error('Error logging to dev channel:', err);
            }
        };

        // Create a collector for vote buttons (active for 5 minutes)
        const collector = replyMessage.createMessageComponentCollector({ 
            filter: i => ['vote_report', 'vote_double'].includes(i.customId), 
            time: 300000 
        });

        collector.on('collect', async i => {
            // Increment appropriate vote counters (no duplicate vote prevention for simplicity)
            if (i.customId === 'vote_report') {
                reportVotes++;
            } else if (i.customId === 'vote_double') {
                doubleVotes++;
            }
            
            // Clone and update the embed votes
            let updatedEmbed = EmbedBuilder.from(i.message.embeds[0]);
            updatedEmbed = updateEmbedVotes(updatedEmbed);

            // Check if the report vote threshold is met.
            if (reportVotes >= REPORT_THRESHOLD) {
                updatedEmbed.spliceFields(4, 1, { name: '✅ Verified', value: 'Yes', inline: true });
                // Add a notification field once (only once, if not already added)
                if (!updatedEmbed.data.fields.some(field => field.name === 'Notification')) {
                    updatedEmbed.addFields({ name: 'Notification', value: 'Servers have been notified.' });
                    await notifyServers();
                }
            }
            
            // Check if the double dungeon vote threshold is met.
            if (doubleVotes >= DOUBLE_THRESHOLD) {
                updatedEmbed.spliceFields(3, 1, { name: '👯 Double Dungeon', value: 'Yes', inline: true });
            }
            
            await i.update({ embeds: [updatedEmbed] });
            await logDevStats();
        });

        collector.on('end', collected => {
            // Disable the vote buttons after collector ends.
            const disabledRow = new ActionRowBuilder().addComponents(
                voteReportButton.setDisabled(true),
                voteDoubleButton.setDisabled(true)
            );
            interaction.editReply({ components: [disabledRow] });
        });
    },
};

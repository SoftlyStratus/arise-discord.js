const { SlashCommandBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup the dungeon notifications channel'),
  
  async execute(interaction) {
    // Create a channel select menu for text channels.
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('select_dungeon_channel')
      .setChannelTypes([ChannelType.GuildText])
      .setPlaceholder('Select a channel for dungeon notifications');
    
    const row = new ActionRowBuilder().addComponents(channelSelect);
    
    await interaction.reply({ 
      content: 'Please select a channel for dungeon notifications:', 
      components: [row], 
      flags: MessageFlags.Ephemeral 
    });
    
    // Collect the channel selection from the user.
    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.customId === 'select_dungeon_channel' && i.user.id === interaction.user.id,
      time: 60000
    });
    
    collector.on('collect', async i => {
      const selectedChannelId = i.values[0]; // Selected channel id

      // Define path to the persistent configuration file.
      const configPath = path.join(__dirname, '..', 'data', 'config.json');
      let config = {};
      
      // Read existing config if available.
      if (fs.existsSync(configPath)) {
        try {
          const fileData = fs.readFileSync(configPath, { encoding: 'utf8' });
          config = JSON.parse(fileData);
        } catch (err) {
          console.error('Error parsing config file:', err);
        }
      }
      
      // Update the config with the selected channel id.
      config.dungeonChannel = selectedChannelId;
      
      // Ensure the directory exists.
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Save the updated config back to the file.
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: 'utf8' });
      
      await i.update({ content: `Dungeon notifications channel set to <#${selectedChannelId}>.`, components: [] });
      collector.stop();
    });
    
    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'No channel selected, setup aborted.', components: [] });
      }
    });
  }
};

require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands', 'information');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const commandsToRegister = client.commands.map(command => command.data.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerGuildCommands() {
    try {
        console.log('Started refreshing application (/) commands for guild.');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commandsToRegister },
        );

        console.log('Successfully reloaded application (/) commands for guild.');
    } catch (error) {
        console.error(error);
    }
}

async function registerGlobalCommands() {
    try {
        console.log('Started refreshing application (/) commands globally.');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commandsToRegister },
        );

        console.log('Successfully reloaded application (/) commands globally.');
    } catch (error) {
        console.error(error);
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    //registerGuildCommands(); // Or registerGlobalCommands();
    registerGlobalCommands();
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else if (interaction.isAutocomplete()) { // Add this block
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            if (command.autocomplete) { // Check if the command has an autocomplete function
                await command.autocomplete(interaction);
            }
        } catch (error) {
            console.error('Error handling autocomplete:', error);
        }
    }
});

client.login(TOKEN);
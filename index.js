require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

// Helper function to recursively read all .js command files from a directory
function getCommandFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getCommandFiles(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

const commandsPath = path.join(__dirname, 'commands'); // now searching the entire commands folder
const commandFiles = getCommandFiles(commandsPath);

for (const file of commandFiles) {
    const command = require(file);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`);
    }
}

const commandsToRegister = client.commands.map(command => command.data.toJSON());
const snapshotDir = path.join(__dirname, 'data');
const snapshotFile = path.join(snapshotDir, 'commands_snapshot.json');

// Helper function to load previous snapshot
function loadPreviousSnapshot() {
    if (fs.existsSync(snapshotFile)) {
        try {
            const data = fs.readFileSync(snapshotFile, { encoding: 'utf8' });
            return JSON.parse(data);
        } catch (err) {
            console.error('Error parsing commands snapshot file:', err);
            return [];
        }
    }
    return [];
}

// Helper function to save current snapshot
function saveCurrentSnapshot(snapshot) {
    if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
    }
    fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), { encoding: 'utf8' });
}

// Helper function to compare old and new commands
function compareCommands(oldSnapshot, newSnapshot) {
    const oldMap = new Map();
    oldSnapshot.forEach(cmd => {
        if (cmd.name) {
            oldMap.set(cmd.name, cmd);
        }
    });
    
    const newMap = new Map();
    newSnapshot.forEach(cmd => {
        if (cmd.name) {
            newMap.set(cmd.name, cmd);
        }
    });
    
    const added = [];
    const removed = [];
    const modified = [];

    // New commands
    for (const [name, newCmd] of newMap.entries()) {
        if (!oldMap.has(name)) {
            added.push(name);
        } else {
            const oldCmd = oldMap.get(name);
            // Compare the command definitions
            if (JSON.stringify(oldCmd) !== JSON.stringify(newCmd)) {
                modified.push(name);
            }
        }
    }

    // Removed commands
    for (const [name] of oldMap.entries()) {
        if (!newMap.has(name)) {
            removed.push(name);
        }
    }
    
    return { added, removed, modified };
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerGuildCommands() {
    try {
        console.log('Started refreshing application (/) commands for guild.');
        const previousSnapshot = loadPreviousSnapshot();
        const diff = compareCommands(previousSnapshot, commandsToRegister);
        
        if (diff.added.length) {
            console.log('New commands added:', diff.added.join(', '));
        }
        if (diff.removed.length) {
            console.log('Commands removed:', diff.removed.join(', '));
        }
        if (diff.modified.length) {
            console.log('Commands modified:', diff.modified.join(', '));
        }
        if (!diff.added.length && !diff.removed.length && !diff.modified.length) {
            console.log('No changes to commands detected.');
        }
        
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commandsToRegister },
        );
        console.log('Successfully reloaded application (/) commands for guild.');
        
        saveCurrentSnapshot(commandsToRegister);
    } catch (error) {
        console.error(error);
    }
}

async function registerGlobalCommands() {
    try {
        console.log('Started refreshing application (/) commands globally.');
        const previousSnapshot = loadPreviousSnapshot();
        const diff = compareCommands(previousSnapshot, commandsToRegister);
        
        if (diff.added.length) {
            console.log('New commands added:', diff.added.join(', '));
        }
        if (diff.removed.length) {
            console.log('Commands removed:', diff.removed.join(', '));
        }
        if (diff.modified.length) {
            console.log('Commands modified:', diff.modified.join(', '));
        }
        if (!diff.added.length && !diff.removed.length && !diff.modified.length) {
            console.log('No changes to commands detected.');
        }
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commandsToRegister },
        );
        console.log('Successfully reloaded application (/) commands globally.');
        
        saveCurrentSnapshot(commandsToRegister);
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

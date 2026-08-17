require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const GUILD_ID = '1449372567529062412';
const CHANNEL_ID = '1481271832551362783';

async function joinTargetChannel() {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(CHANNEL_ID);

    if (!channel || channel.type !== 2) {
        throw new Error('Target channel was not found or is not a voice channel.');
    }

    const connection = joinVoiceChannel({
        channelId: CHANNEL_ID,
        guildId: GUILD_ID,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        console.log('Disconnected. Trying to reconnect...');

        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5000)
            ]);
        } catch {
            connection.destroy();
            setTimeout(joinTargetChannel, 5000);
        }
    });

    console.log('✅ Timer Guardian joined asotea!');
}

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    try {
        await joinTargetChannel();
    } catch (error) {
        console.error('❌ Could not join the voice channel:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);
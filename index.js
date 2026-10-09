
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const GUILD_ID = '1449372567529062412';
const CHANNEL_ID = '1481271832551362783';

let reconnectTimer = null;
let joining = false;
let currentConnection = null;

async function joinTargetChannel() {
    if (joining) return;
    joining = true;

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await guild.channels.fetch(CHANNEL_ID);

        if (!channel || channel.type !== 2) {
            throw new Error(
                'Target channel was not found or is not a voice channel.'
            );
        }

        if (currentConnection) {
            currentConnection.destroy();
            currentConnection = null;
        }

        const connection = joinVoiceChannel({
            channelId: CHANNEL_ID,
            guildId: GUILD_ID,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        currentConnection = connection;

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log('✅ Timer Guardian voice connection is ready!');
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.warn('⚠️ Disconnected. Attempting recovery...');
            console.log('Voice state:', connection.state.status);

            try {
                await Promise.race([
                    entersState(
                        connection,
                        VoiceConnectionStatus.Signalling,
                        10000
                    ),
                    entersState(
                        connection,
                        VoiceConnectionStatus.Connecting,
                        10000
                    ),
                    entersState(
                        connection,
                        VoiceConnectionStatus.Ready,
                        10000
                    )
                ]);

                console.log('🔄 Voice connection is recovering...');
            } catch (error) {
                console.error('❌ Recovery failed:', error.message);

                if (currentConnection === connection) {
                    connection.destroy();
                    currentConnection = null;
                }

                scheduleReconnect();
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            console.log('Voice connection destroyed.');
        });

        console.log('🔗 Connecting to the target voice channel...');
    } catch (error) {
        console.error('❌ Could not join the voice channel:', error.message);
        scheduleReconnect();
    } finally {
        joining = false;
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return;

    reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        await joinTargetChannel();
    }, 5000);
}

client.once('clientReady', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    await joinTargetChannel();
});

client.on('error', error => {
    console.error('Discord client error:', error.message);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Discord login failed:', error.message);
});

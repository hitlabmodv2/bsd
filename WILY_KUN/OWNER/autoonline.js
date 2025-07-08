const fs = require('fs');
const path = require('path');
const { Wily } = require('../../CODE_REPLAY/reply');

// Fungsi untuk membaca config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Fungsi untuk menyimpan config
function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'config.json');

        // Backup config lama jika ada
        if (fs.existsSync(configPath)) {
            const backupPath = path.join(process.cwd(), 'DATA', 'config.backup.json');
            const currentConfig = fs.readFileSync(configPath, 'utf8');
            fs.writeFileSync(backupPath, currentConfig);
        }

        // Simpan config baru
        const configString = JSON.stringify(config, null, 2);
        fs.writeFileSync(configPath, configString, 'utf8');

        // Verifikasi file tersimpan dengan benar
        if (fs.existsSync(configPath)) {
            const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return true;
        }

        return false;
    } catch (error) {
        return false;
    }
}

// Handler untuk auto online
async function handleAutoOnline(sock, msg, args, config) {
    if (args.length < 2) {
        const helpText = `
❌ *Format salah!*

📝 *Cara penggunaan:*
${config.bot.prefix}online on
${config.bot.prefix}online off

📋 *Penjelasan:*
• *on* - Bot akan selalu tampil online
• *off* - Bot akan tampil status normal (last seen)

📊 *Status saat ini:* ${config.autoFeatures?.online ? 'ON ✅' : 'OFF ❌'}`;

        await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
        return;
    }

    const newMode = args[1].toLowerCase();

    if (newMode !== 'on' && newMode !== 'off') {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Mode tidak valid! Gunakan 'on' atau 'off'` }, { quoted: msg });
        return;
    }

    const enabled = newMode === 'on';

    // Inisialisasi autoFeatures jika belum ada
    if (!config.autoFeatures) {
        config.autoFeatures = {
            typing: false,
            recording: false,
            online: false
        };
    }

    // Periksa apakah mode sudah sama
    if (config.autoFeatures.online === enabled) {
        await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Auto online sudah dalam keadaan *${newMode.toUpperCase()}*` }, { quoted: msg });
        return;
    }

    // Update config
    config.autoFeatures.online = enabled;

    // Simpan config
    const saveResult = saveConfig(config);

    if (saveResult) {
        // Langsung update presence status setelah config berubah
        if (!enabled) {
            try {
                await sock.sendPresenceUpdate('unavailable');
                // Tunggu sebentar lalu set last seen
                setTimeout(async () => {
                    try {
                        await sock.sendPresenceUpdate('unavailable');
                    } catch (error) {
                        // Silent error
                    }
                }, 2000);
            } catch (error) {
                // Silent error
            }
        } else {
            try {
                await sock.sendPresenceUpdate('available');
            } catch (error) {
                // Silent error
            }
        }

        const statusText = enabled ? 
            `🟢 *AUTO ONLINE: ON*\n\n🎯 Bot akan selalu tampil online dan tidak akan menampilkan last seen\n📁 Data tersimpan ke config.json` :
            `❌ *AUTO ONLINE: OFF*\n\n🎯 Bot akan tampil status normal dengan last seen\n📁 Data tersimpan ke config.json\n\n✅ Status presence telah direset ke unavailable`;

        await sock.sendMessage(msg.key.remoteJid, { text: statusText }, { quoted: msg });
    } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan pengaturan auto online ke config.json` }, { quoted: msg });
    }
}

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

// Auto online handler untuk connection events
function setupAutoOnline(sock) {
    let onlineInterval = null;

    const setOnlinePresence = async () => {
        try {
            const config = loadConfig();
            if (config?.autoFeatures?.online) {
                await sock.sendPresenceUpdate('available');
            } else {
                // Jika auto online dimatikan, set presence ke unavailable
                await sock.sendPresenceUpdate('unavailable');
            }
        } catch (error) {
            // Silent error
        }
    };

    // Set initial online status
    setOnlinePresence();

    // Periodic online status update
    const startPeriodicOnline = () => {
        if (onlineInterval) {
            clearInterval(onlineInterval);
            onlineInterval = null;
        }

        onlineInterval = setInterval(async () => {
            try {
                const config = loadConfig();
                if (!config?.autoFeatures?.online) {
                    // Jika dimatikan, set unavailable dan hentikan interval
                    await sock.sendPresenceUpdate('unavailable');
                    if (onlineInterval) {
                        clearInterval(onlineInterval);
                        onlineInterval = null;
                    }
                    return;
                }

                await setOnlinePresence();
            } catch (error) {
                // Silent error
            }
        }, 15000); // Every 15 seconds untuk response lebih cepat
    };

    startPeriodicOnline();

    // Listen untuk connection updates
    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            // Set online status when connected
            setTimeout(() => setOnlinePresence(), 3000);

            // Restart periodic online updates
            if (onlineInterval) {
                clearInterval(onlineInterval);
            }
            startPeriodicOnline();
        }
    });

    // Listen untuk message events untuk maintain online status
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const config = loadConfig();
            if (!config?.autoFeatures?.online) {
                // Jika auto online dimatikan, pastikan status unavailable
                await sock.sendPresenceUpdate('unavailable');
                return;
            }

            // Immediately set online when receiving messages
            await setOnlinePresence();
        } catch (error) {
            // Silent error
        }
    });
}

module.exports = {
    handleAutoOnline,
    setupAutoOnline,
    loadConfig,
    saveConfig
};
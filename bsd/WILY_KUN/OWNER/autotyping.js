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

// Handler untuk auto typing
async function handleAutoTyping(sock, msg, args, config) {
    if (args.length < 2) {
        const helpText = `
❌ *Format salah!*

📝 *Cara penggunaan:*
${config.bot.prefix}typing on
${config.bot.prefix}typing off

📋 *Penjelasan:*
• *on* - Bot akan selalu tampil sedang mengetik
• *off* - Bot tidak menampilkan status typing

📊 *Status saat ini:* ${config.autoFeatures?.typing ? 'ON ✅' : 'OFF ❌'}`;

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
    if (config.autoFeatures.typing === enabled) {
        await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Auto typing sudah dalam keadaan *${newMode.toUpperCase()}*` }, { quoted: msg });
        return;
    }

    // Update config
    config.autoFeatures.typing = enabled;

    // Simpan config
    const saveResult = saveConfig(config);

    if (saveResult) {
        const statusText = enabled ? 
            `✅ *AUTO TYPING: ON*\n\n🎯 Bot akan selalu tampil sedang mengetik saat ada aktivitas\n📁 Data tersimpan ke config.json` :
            `❌ *AUTO TYPING: OFF*\n\n🎯 Bot tidak akan menampilkan status typing\n📁 Data tersimpan ke config.json`;

        await sock.sendMessage(msg.key.remoteJid, { text: statusText }, { quoted: msg });
    } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan pengaturan auto typing ke config.json` }, { quoted: msg });
    }
}

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

// Auto typing handler untuk message events
function setupAutoTyping(sock) {
    let typingInterval = null;

    const startTyping = async (jid) => {
        try {
            const config = loadConfig();
            if (config?.autoFeatures?.typing) {
                await sock.sendPresenceUpdate('composing', jid);
            }
        } catch (error) {
            // Silent error
        }
    };

    const stopTyping = async (jid) => {
        try {
            await sock.sendPresenceUpdate('paused', jid);
        } catch (error) {
            // Silent error
        }
    };

    // Listen untuk message events
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const config = loadConfig();
            if (!config?.autoFeatures?.typing) return;

            const messages = chatUpdate.messages;
            if (!messages || messages.length === 0) return;

            for (const msg of messages) {
                if (msg.key?.fromMe) continue; // Skip pesan dari bot sendiri

                const jid = msg.key?.remoteJid;
                if (!jid || jid === 'status@broadcast') continue;

                // Start typing
                await startTyping(jid);

                // Stop typing after random delay (2-5 seconds)
                const delay = Math.random() * 3000 + 2000;
                setTimeout(() => stopTyping(jid), delay);
            }
        } catch (error) {
            // Silent error
        }
    });

    // Periodic typing untuk chat aktif
    const startPeriodicTyping = () => {
        const config = loadConfig();
        if (!config?.autoFeatures?.typing) return;

        typingInterval = setInterval(async () => {
            try {
                const config = loadConfig();
                if (!config?.autoFeatures?.typing) {
                    if (typingInterval) {
                        clearInterval(typingInterval);
                        typingInterval = null;
                    }
                    return;
                }

                // Simulasi typing ke chats yang aktif
                // Implementasi bisa disesuaikan dengan kebutuhan
            } catch (error) {
                // Silent error
            }
        }, 30000); // Every 30 seconds
    };

    startPeriodicTyping();
}

module.exports = {
    handleAutoTyping,
    setupAutoTyping,
    loadConfig,
    saveConfig
};
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

// Handler untuk auto recording
async function handleAutoRecord(sock, msg, args, config) {
    if (args.length < 2) {
        const helpText = `
❌ *Format salah!*

📝 *Cara penggunaan:*
${config.bot.prefix}record on
${config.bot.prefix}record off

📋 *Penjelasan:*
• *on* - Bot akan selalu tampil sedang merekam audio
• *off* - Bot tidak menampilkan status recording

📊 *Status saat ini:* ${config.autoFeatures?.recording ? 'ON ✅' : 'OFF ❌'}`;

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
    if (config.autoFeatures.recording === enabled) {
        await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Auto recording sudah dalam keadaan *${newMode.toUpperCase()}*` }, { quoted: msg });
        return;
    }

    // Update config
    config.autoFeatures.recording = enabled;

    // Simpan config
    const saveResult = saveConfig(config);

    if (saveResult) {
        const statusText = enabled ? 
            `🎙️ *AUTO RECORDING: ON*\n\n🎯 Bot akan selalu tampil sedang merekam audio saat ada aktivitas\n📁 Data tersimpan ke config.json` :
            `❌ *AUTO RECORDING: OFF*\n\n🎯 Bot tidak akan menampilkan status recording\n📁 Data tersimpan ke config.json`;

        await sock.sendMessage(msg.key.remoteJid, { text: statusText }, { quoted: msg });
    } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan pengaturan auto recording ke config.json` }, { quoted: msg });
    }
}

// Auto recording handler untuk message events
function setupAutoRecord(sock) {
    let recordingInterval = null;

    const startRecording = async (jid) => {
        try {
            const config = loadConfig();
            if (config?.autoFeatures?.recording) {
                await sock.sendPresenceUpdate('recording', jid);
            }
        } catch (error) {
            // Silent error
        }
    };

    const stopRecording = async (jid) => {
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
            if (!config?.autoFeatures?.recording) return;

            const messages = chatUpdate.messages;
            if (!messages || messages.length === 0) return;

            for (const msg of messages) {
                if (msg.key?.fromMe) continue; // Skip pesan dari bot sendiri

                const jid = msg.key?.remoteJid;
                if (!jid || jid === 'status@broadcast') continue;

                // Start recording
                await startRecording(jid);

                // Stop recording after random delay (3-6 seconds)
                const delay = Math.random() * 3000 + 3000;
                setTimeout(() => stopRecording(jid), delay);
            }
        } catch (error) {
            // Silent error
        }
    });

    // Periodic recording untuk chat aktif
    const startPeriodicRecording = () => {
        const config = loadConfig();
        if (!config?.autoFeatures?.recording) return;

        recordingInterval = setInterval(async () => {
            try {
                const config = loadConfig();
                if (!config?.autoFeatures?.recording) {
                    if (recordingInterval) {
                        clearInterval(recordingInterval);
                        recordingInterval = null;
                    }
                    return;
                }

                // Simulasi recording ke chats yang aktif
                // Implementasi bisa disesuaikan dengan kebutuhan
            } catch (error) {
                // Silent error
            }
        }, 45000); // Every 45 seconds
    };

    startPeriodicRecording();
}

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

module.exports = {
    handleAutoRecord,
    setupAutoRecord,
    loadConfig,
    saveConfig
};
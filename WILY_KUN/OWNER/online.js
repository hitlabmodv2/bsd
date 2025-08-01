
import fs from 'fs';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk membaca nomor bot dari creds.json
function getBotNumber() {
    try {
        if (fs.existsSync('./sesi/creds.json')) {
            const creds = JSON.parse(fs.readFileSync('./sesi/creds.json', 'utf8'));
            if (creds.me?.id) {
                const botNumber = creds.me.id.split(':')[0];
                return botNumber;
            }
        }
        const config = readConfig();
        const fallbackNumber = config.OWNER[0] || "6289681008411";
        return fallbackNumber;
    } catch (error) {
        return "6289681008411";
    }
}

// Fungsi untuk membuat backup
function createBackup() {
    try {
        if (fs.existsSync('./config.json')) {
            const config = fs.readFileSync('./config.json', 'utf8');
            const backupPath = `./DATA/config-backup.json`;

            if (!fs.existsSync('./DATA')) {
                fs.mkdirSync('./DATA', { recursive: true });
            }

            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }

            fs.writeFileSync(backupPath, config);
        }
    } catch (error) {
        // Silent fail
    }
}

// Fungsi untuk mengubah status auto online
function changeAutoOnlineStatus(enabled) {
    try {
        let config;

        if (!fs.existsSync('./config.json')) {
            config = {
                "OWNER": ["6289681008411"],
                "SELF": true,
                "mode": "self",
                "packName": "Sticker Dibuat Oleh : Wily",
                "packPublish": "Dika Ardnt.",
                "SESSION_NAME": "sesi",
                "autoOnline": {
                    "enabled": false,
                    "interval": 30000
                }
            };
        } else {
            config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        }

        // Backup sebelum mengubah
        createBackup();

        // Pastikan autoOnline object ada
        if (!config.autoOnline) {
            config.autoOnline = {
                "enabled": false,
                "interval": 30000
            };
        }

        // Update status auto online
        config.autoOnline.enabled = enabled;

        // Simpan config yang sudah diupdate
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk membaca config dengan fallback
function readConfig() {
    try {
        if (!fs.existsSync('./config.json')) {
            return {
                "OWNER": ["6289681008411"],
                "SELF": true,
                "mode": "self",
                "packName": "Sticker Dibuat Oleh : Wily",
                "packPublish": "Dika Ardnt.",
                "SESSION_NAME": "sesi",
                "autoOnline": {
                    "enabled": false,
                    "interval": 30000
                }
            };
        }
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Pastikan autoOnline object ada
        if (!config.autoOnline) {
            config.autoOnline = {
                "enabled": false,
                "interval": 30000
            };
        }

        return config;
    } catch (error) {
        return {
            "OWNER": ["6289681008411"],
            "SELF": true,
            "mode": "self",
            "packName": "Sticker Dibuat Oleh : Wily",
            "packPublish": "Dika Ardnt.",
            "SESSION_NAME": "sesi",
            "autoOnline": {
                "enabled": false,
                "interval": 30000
            }
        };
    }
}

// Class untuk mengelola auto online
class AutoOnline {
    constructor() {
        this.intervalId = null;
        this.sock = null;
    }

    // Initialize auto online dengan socket
    initialize(sock) {
        this.sock = sock;
        const config = readConfig();

        if (config.autoOnline.enabled) {
            this.start();
        } else {
            // Pastikan stop jika disabled
            this.stop();
        }
    }

    // Start auto online
    start() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        const config = readConfig();
        const interval = config.autoOnline.interval || 30000;

        this.intervalId = setInterval(async () => {
            try {
                if (this.sock && this.sock.user) {
                    await this.sock.sendPresenceUpdate('available');
                }
            } catch (error) {
                // Silent error handling
            }
        }, interval);
    }

    // Stop auto online
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Set status offline
        try {
            if (this.sock && this.sock.user) {
                this.sock.sendPresenceUpdate('unavailable');
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Check status
    isActive() {
        return this.intervalId !== null;
    }

    // Force refresh status dari config
    refreshFromConfig() {
        const config = readConfig();

        if (config.autoOnline.enabled && !this.isActive()) {
            this.start();
        } else if (!config.autoOnline.enabled && this.isActive()) {
            this.stop();
        }
    }
}

// Instance global auto online
const autoOnlineInstance = new AutoOnline();

// Handler untuk command online
export async function handleOnlineCommand(m, { hisoka, text, command }) {
    try {
        const config = readConfig();

        // Ekstraksi sender number
        let senderNumber = '';
        const isFromMe = m.key?.fromMe === true;

        if (isFromMe) {
            senderNumber = getBotNumber();
        } else if (m.sender) {
            senderNumber = m.sender.split('@')[0];
        } else if (m.key?.participant) {
            senderNumber = m.key.participant.split('@')[0];
        } else if (m.key?.remoteJid && !m.key.remoteJid.includes('@g.us')) {
            senderNumber = m.key.remoteJid.split('@')[0];
        }

        if (!senderNumber || senderNumber === 'undefined' || senderNumber === '') {
            return;
        }

        // Cek apakah user adalah owner
        if (!config.OWNER.includes(senderNumber)) {
            // Respon sesuai mode bot
            const shouldReply = !config.SELF || config.mode === 'public' || m.key?.participant;
            if (shouldReply) {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Fitur Auto Online hanya dapat diakses oleh Owner\n\n🔒 Akses terbatas untuk menjaga keamanan dan privasi bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text ? text.trim().split(' ') : [];
        const action = args[0]?.toLowerCase();

        // Jika tidak ada argument, tampilkan status
        if (!action || !['on', 'off', 'refresh'].includes(action)) {
            const currentStatus = config.autoOnline.enabled;
            const statusText = currentStatus ? 'AKTIF' : 'NONAKTIF';
            const statusEmoji = currentStatus ? '🟢' : '🔴';
            const interval = config.autoOnline.interval || 30000;
            const instanceStatus = autoOnlineInstance.isActive() ? 'RUNNING' : 'STOPPED';

            await Wily(`📊 *STATUS AUTO ONLINE*

${statusEmoji} *Status Config: ${statusText}*
🔧 *Status Instance: ${instanceStatus}*
⏱️ *Interval: ${interval / 1000} detik*

📋 *Cara penggunaan:*
• \`.online on\` - Aktifkan auto online
• \`.online off\` - Nonaktifkan auto online
• \`.online refresh\` - Refresh status dari config

💡 *Keterangan:*
• Auto Online membuat bot terlihat selalu online
• Bot akan mengirim presence 'available' secara berkala
• Saat dinonaktifkan, bot akan terlihat offline
• Fitur ini khusus untuk Owner Bot

⚙️ *Fungsi:*
• ON: Bot terlihat online terus menerus
• OFF: Bot terlihat offline/tidak aktif
• REFRESH: Sinkronkan dengan config.json

🔒 *Privasi:*
• Hanya Owner yang dapat mengontrol fitur ini
• Mode SELF: Hanya Owner yang bisa akses
• Mode PUBLIC: Tetap khusus Owner saja`, m, hisoka);
            return;
        }

        // Handle refresh command
        if (action === 'refresh') {
            autoOnlineInstance.refreshFromConfig();
            const newConfig = readConfig();
            const newStatus = newConfig.autoOnline.enabled;
            const statusText = newStatus ? 'AKTIF' : 'NONAKTIF';
            const statusEmoji = newStatus ? '🟢' : '🔴';
            const instanceStatus = autoOnlineInstance.isActive() ? 'RUNNING' : 'STOPPED';

            await Wily(`🔄 *AUTO ONLINE REFRESHED*

${statusEmoji} *Status Config: ${statusText}*
🔧 *Status Instance: ${instanceStatus}*
✅ *Status berhasil di-refresh dari config.json*

💡 Instance sekarang sinkron dengan konfigurasi`, m, hisoka);
            return;
        }

        const currentStatus = config.autoOnline.enabled;

        // Cek jika status sudah sama
        if ((action === 'on' && currentStatus) || (action === 'off' && !currentStatus)) {
            if (action === 'on') {
                await Wily(`ℹ️ *AUTO ONLINE SUDAH AKTIF*

🟢 *STATUS SAAT INI: ONLINE*
━━━━━━━━━━━━━━━━━━━
• Bot sudah dalam keadaan auto online
• Presence bot: AVAILABLE (Terlihat Online)
• Interval pengiriman: ${config.autoOnline.interval / 1000} detik
• Bot terlihat aktif terus menerus

🎯 *KEUNTUNGAN AUTO ONLINE:*
━━━━━━━━━━━━━━━━━━━
✅ Bot terlihat selalu siap melayani
✅ Memberikan kesan responsif
✅ User merasa bot aktif 24/7
✅ Meningkatkan kepercayaan user
✅ Professional appearance

💡 *SARAN:*
• Gunakan \`.online off\` untuk mode offline
• Auto Online cocok untuk bot aktif
• Menghemat pertanyaan "bot hidup?"`, m, hisoka);
            } else {
                await Wily(`ℹ️ *AUTO ONLINE SUDAH NONAKTIF*

🔴 *STATUS SAAT INI: OFFLINE*
━━━━━━━━━━━━━━━━━━━
• Bot sudah dalam keadaan offline
• Presence bot: UNAVAILABLE (Terlihat Offline)
• Auto online tidak berjalan
• Bot terlihat tidak aktif

🎯 *KEUNTUNGAN MODE OFFLINE:*
━━━━━━━━━━━━━━━━━━━
✅ Privasi tinggi, bot terlihat tidak aktif
✅ Menghemat resource sistem
✅ Tidak menarik perhatian user
✅ Mode stealth untuk bot personal
✅ Menghindari spam dari user

💡 *SARAN:*
• Gunakan \`.online on\` untuk mode online
• Mode offline cocok untuk bot personal
• Owner tetap bisa akses penuh`, m, hisoka);
            }
            return;
        }

        // Update status auto online
        const success = changeAutoOnlineStatus(action === 'on');

        if (success) {
            // Verifikasi perubahan
            const newConfig = readConfig();
            const newStatus = newConfig.autoOnline.enabled;
            const statusText = newStatus ? 'AKTIF' : 'NONAKTIF';
            const statusEmoji = newStatus ? '🟢' : '🔴';

            // Update instance auto online
            if (newStatus) {
                autoOnlineInstance.initialize(hisoka);
            } else {
                autoOnlineInstance.stop();
            }

            await Wily(`${statusEmoji} *AUTO ONLINE BERHASIL DIUBAH*

🔄 Status: ${currentStatus ? 'AKTIF' : 'NONAKTIF'} ➜ *${statusText}*
📱 Presence: ${newStatus ? 'AVAILABLE (Online)' : 'UNAVAILABLE (Offline)'}
⏱️ Interval: ${newConfig.autoOnline.interval / 1000} detik

✅ Konfigurasi tersimpan ke config.json
💾 Backup dibuat di folder DATA
⚡ ${newStatus ? 'Bot sekarang terlihat online' : 'Bot sekarang terlihat offline'}

🔍 *Verifikasi:* Auto Online sekarang ${statusText}`, m, hisoka);
        } else {
            await Wily('❌ Gagal mengubah status auto online. Pastikan file config.json dapat ditulis.', m, hisoka);
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export untuk digunakan di message.js
export const onlineInfo = {
    command: ['online'],
    description: 'Mengatur auto online bot (on/off)'
};

// Export instance dan fungsi
export { autoOnlineInstance };
export const online = handleOnlineCommand;

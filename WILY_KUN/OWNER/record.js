
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

// Fungsi untuk mengubah status auto record
function changeAutoRecordStatus(enabled) {
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
                "autoRecord": {
                    "enabled": false,
                    "delay": 5
                }
            };
        } else {
            config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        }

        createBackup();

        if (!config.autoRecord) {
            config.autoRecord = {
                "enabled": false,
                "delay": 5
            };
        }

        config.autoRecord.enabled = enabled;

        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk mengubah delay auto record
function changeAutoRecordDelay(delay) {
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
                "autoRecord": {
                    "enabled": false,
                    "delay": 5
                }
            };
        } else {
            config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        }

        createBackup();

        if (!config.autoRecord) {
            config.autoRecord = {
                "enabled": false,
                "delay": 5
            };
        }

        config.autoRecord.delay = delay;

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
                "autoRecord": {
                    "enabled": false,
                    "delay": 5
                }
            };
        }
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        if (!config.autoRecord) {
            config.autoRecord = {
                "enabled": false,
                "delay": 5
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
            "autoRecord": {
                "enabled": false,
                "delay": 5
            }
        };
    }
}

// Class untuk mengelola auto record
class AutoRecord {
    constructor() {
        this.sock = null;
    }

    // Initialize auto record dengan socket
    initialize(sock) {
        this.sock = sock;
    }

    // Function untuk handle recording otomatis saat ada pesan baru
    async handleIncomingMessage(m) {
        const config = readConfig();
        
        if (!config.autoRecord.enabled || !this.sock) {
            return;
        }

        try {
            const chatId = m.key.remoteJid;
            const delay = config.autoRecord.delay * 1000;

            // Send recording indicator
            await this.sock.sendPresenceUpdate('recording', chatId);
            
            // Wait for delay then stop recording
            setTimeout(async () => {
                try {
                    await this.sock.sendPresenceUpdate('paused', chatId);
                } catch (error) {
                    // Silent error handling
                }
            }, delay);
        } catch (error) {
            // Silent error handling
        }
    }
}

// Instance global auto record
const autoRecordInstance = new AutoRecord();

// Handler untuk command record
export async function handleRecordCommand(m, { hisoka, text, command }) {
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
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Fitur Auto Record hanya dapat diakses oleh Owner\n\n🔒 Akses terbatas untuk menjaga keamanan dan privasi bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text ? text.trim().split(' ') : [];
        const action = args[0]?.toLowerCase();

        // Jika tidak ada argument, tampilkan status
        if (!action || !['on', 'off', 'delay'].includes(action)) {
            const currentStatus = config.autoRecord.enabled;
            const statusText = currentStatus ? 'AKTIF' : 'NONAKTIF';
            const statusEmoji = currentStatus ? '🎙️' : '🔇';
            const delay = config.autoRecord.delay;

            await Wily(`${statusEmoji} *AUTO RECORD STATUS*

🔹 Status saat ini: *${statusText}*
⏱️ Delay: ${delay} detik
📱 Mode: ${config.mode.toUpperCase()}

📋 *Cara penggunaan:*
• \`.record on\` - Aktifkan auto record
• \`.record off\` - Matikan auto record
• \`.record delay [1-10]\` - Atur delay record

💡 *Keterangan:*
• Auto record akan aktif saat ada pesan baru
• Bot akan terlihat sedang merekam audio
• Delay maksimal 10 detik
• Fitur khusus owner only

⚙️ Data tersimpan otomatis ke config.json`, m, hisoka);
            return;
        }

        // Handle delay command
        if (action === 'delay') {
            const delayValue = parseInt(args[1]);
            
            if (!delayValue || delayValue < 1 || delayValue > 10) {
                await Wily(`❌ *DELAY TIDAK VALID*

⚠️ *Delay harus antara 1-10 detik*

📋 *Contoh penggunaan:*
• \`.record delay 3\` - Set delay 3 detik
• \`.record delay 5\` - Set delay 5 detik
• \`.record delay 10\` - Set delay 10 detik (maksimal)

💡 *Delay saat ini: ${config.autoRecord.delay} detik*`, m, hisoka);
                return;
            }

            const currentDelay = config.autoRecord.delay;
            
            if (currentDelay === delayValue) {
                await Wily(`ℹ️ *DELAY SUDAH SAMA*

⏱️ *Delay saat ini sudah: ${delayValue} detik*

📊 Tidak ada perubahan yang diperlukan
✅ Setting delay tetap ${delayValue} detik`, m, hisoka);
                return;
            }

            const success = changeAutoRecordDelay(delayValue);

            if (success) {
                const newConfig = readConfig();
                const actualDelay = newConfig.autoRecord.delay;

                await Wily(`⏱️ *DELAY BERHASIL DIUBAH*

🔄 Delay: ${currentDelay} detik ➜ *${actualDelay} detik*
🎙️ Auto record: ${config.autoRecord.enabled ? 'AKTIF' : 'NONAKTIF'}

✅ Konfigurasi tersimpan ke config.json
💾 Backup dibuat di folder DATA
⚡ Delay berlaku untuk record selanjutnya

🔍 *Verifikasi:* Delay sekarang ${actualDelay} detik`, m, hisoka);
            } else {
                await Wily('❌ Gagal mengubah delay auto record. Pastikan file config.json dapat ditulis.', m, hisoka);
            }
            return;
        }

        const currentStatus = config.autoRecord.enabled;

        // Cek jika status sudah sama
        if ((action === 'on' && currentStatus) || (action === 'off' && !currentStatus)) {
            if (action === 'on') {
                await Wily(`ℹ️ *AUTO RECORD SUDAH AKTIF*

🎙️ *STATUS SAAT INI: AKTIF*
━━━━━━━━━━━━━━━━━━━
• Bot sudah dalam keadaan auto record
• Delay: ${config.autoRecord.delay} detik
• Bot akan recording saat ada pesan baru
• Terlihat lebih responsif dan hidup

🎯 *KEUNTUNGAN AUTO RECORD:*
━━━━━━━━━━━━━━━━━━━
✅ Bot terlihat sedang merekam audio
✅ Memberikan kesan responsif
✅ User merasa bot aktif merespon
✅ Meningkatkan kepercayaan user
✅ Professional appearance

💡 *SARAN:*
• Gunakan \`.record off\` untuk mode diam
• Atur delay dengan \`.record delay [1-10]\`
• Auto record cocok untuk bot aktif`, m, hisoka);
            } else {
                await Wily(`ℹ️ *AUTO RECORD SUDAH NONAKTIF*

🔇 *STATUS SAAT INI: NONAKTIF*
━━━━━━━━━━━━━━━━━━━
• Bot sudah dalam keadaan tidak recording
• Bot tidak menampilkan indikator merekam
• Mode stealth dan tidak menarik perhatian
• Hemat bandwidth dan resource

🎯 *KEUNTUNGAN MODE NONAKTIF:*
━━━━━━━━━━━━━━━━━━━
✅ Privasi tinggi, bot terlihat pasif
✅ Menghemat resource sistem
✅ Tidak menarik perhatian user
✅ Mode stealth untuk bot personal
✅ Menghindari spam respon

💡 *SARAN:*
• Gunakan \`.record on\` untuk mode aktif
• Mode nonaktif cocok untuk bot personal
• Owner tetap bisa akses penuh`, m, hisoka);
            }
            return;
        }

        // Update status auto record
        const success = changeAutoRecordStatus(action === 'on');

        if (success) {
            // Verifikasi perubahan
            const newConfig = readConfig();
            const newStatus = newConfig.autoRecord.enabled;
            const statusText = newStatus ? 'AKTIF' : 'NONAKTIF';
            const statusEmoji = newStatus ? '🎙️' : '🔇';

            await Wily(`${statusEmoji} *AUTO RECORD BERHASIL DIUBAH*

🔄 Status: ${currentStatus ? 'AKTIF' : 'NONAKTIF'} ➜ *${statusText}*
⏱️ Delay: ${newConfig.autoRecord.delay} detik
📱 Mode: ${config.mode.toUpperCase()}

✅ Konfigurasi tersimpan ke config.json
💾 Backup dibuat di folder DATA
⚡ ${newStatus ? 'Bot sekarang akan recording saat ada pesan' : 'Bot sekarang tidak akan recording'}

🔍 *Verifikasi:* Auto Record sekarang ${statusText}`, m, hisoka);
        } else {
            await Wily('❌ Gagal mengubah status auto record. Pastikan file config.json dapat ditulis.', m, hisoka);
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export instance dan handler
export { autoRecordInstance };
export const recordInfo = {
    command: ['record'],
    description: 'Mengontrol fitur auto record bot'
};
export const record = handleRecordCommand;

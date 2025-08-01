import fs from 'fs';
import path from 'path';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk membaca nomor bot dari creds.json (sama seperti di message.js)
function getBotNumber() {
    try {
        if (fs.existsSync('./sesi/creds.json')) {
            const creds = JSON.parse(fs.readFileSync('./sesi/creds.json', 'utf8'));
            if (creds.me?.id) {
                const botNumber = creds.me.id.split(':')[0];
                return botNumber;
            }
        }
        // Coba baca dari config.json juga
        const config = readConfig();
        const fallbackNumber = config.OWNER[0] || "6289681008411";
        return fallbackNumber;
    } catch (error) {
        return "6289681008411"; // fallback nomor bot
    }
}

// Fungsi untuk membuat backup
function createBackup() {
    try {
        if (fs.existsSync('./config.json')) {
            const config = fs.readFileSync('./config.json', 'utf8');
            const backupPath = `./DATA/config-backup.json`;

            // Pastikan folder DATA ada
            if (!fs.existsSync('./DATA')) {
                fs.mkdirSync('./DATA', { recursive: true });
            }

            // Hapus backup lama jika ada
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }

            fs.writeFileSync(backupPath, config);
        }
    } catch (error) {
        // Silent fail
    }
}

// Fungsi untuk mengubah mode
function changeMode(newMode) {
    try {
        let config;

        // Cek apakah config.json ada, jika tidak buat default
        if (!fs.existsSync('./config.json')) {
            config = {
                "OWNER": ["6289681008411"],
                "SELF": true,
                "mode": "self",
                "packName": "Sticker Dibuat Oleh : Wily",
                "packPublish": "Dika Ardnt.",
                "SESSION_NAME": "session"
            };
        } else {
            config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        }

        // Backup sebelum mengubah
        createBackup();

        // Update kedua field untuk konsistensi
        config.SELF = newMode === 'self';
        config.mode = newMode;

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
                "SESSION_NAME": "session"
            };
        }
        return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (error) {
        return {
            "OWNER": ["6289681008411"],
            "SELF": true,
            "mode": "self",
            "packName": "Sticker Dibuat Oleh : Wily",
            "packPublish": "Dika Ardnt.",
            "SESSION_NAME": "session"
        };
    }
}

export async function handleModeCommand(m, { hisoka, text, command }) {
    try {
        const config = readConfig();

        // Ekstraksi sender number yang lebih baik untuk grup dan chat pribadi
        let senderNumber = '';

        // Deteksi fromMe (pesan dari bot sendiri) dengan prioritas tertinggi
        const isFromMe = m.key?.fromMe === true;

        if (isFromMe) {
            // Ini pesan dari bot sendiri, ambil nomor bot
            senderNumber = getBotNumber();
        } else if (m.sender) {
            // Pesan dari user lain, gunakan m.sender
            senderNumber = m.sender.split('@')[0];
        } else if (m.key?.participant) {
            // Ini pesan dari grup, ambil participant (pengirim sebenarnya)
            senderNumber = m.key.participant.split('@')[0];
        } else if (m.key?.remoteJid && !m.key.remoteJid.includes('@g.us')) {
            // Ini pesan dari chat pribadi, ambil remoteJid (pastikan bukan grup)
            senderNumber = m.key.remoteJid.split('@')[0];
        }

        // Pastikan nomor valid
        if (!senderNumber || senderNumber === 'undefined' || senderNumber === '') {
            return;
        }

        // Cek apakah user adalah owner
        if (!config.OWNER.includes(senderNumber)) {
            // Selalu beri respon untuk non-owner jika mode public atau jika di grup
            const shouldReply = !config.SELF || config.mode === 'public' || m.key?.participant; // grup selalu reply
            if (shouldReply) {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat mengubah mode bot\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text ? text.trim().split(' ') : [];
        const modeArg = args[0]?.toLowerCase();

        // Jika tidak ada argument, tampilkan status
        if (!modeArg || !['self', 'public'].includes(modeArg)) {
            // Baca config terbaru lagi
            const latestConfig = readConfig();
            const currentMode = latestConfig.SELF ? 'self' : 'public';
            const modeField = latestConfig.mode || currentMode;

            await Wily(`📊 *MODE BOT*\n\n🔹 Mode saat ini: *${currentMode.toUpperCase()}*\n📋 Status config:\n• SELF: ${latestConfig.SELF}\n• mode: "${modeField}"\n\n📋 *Cara penggunaan:*\n• \`.mode self\` - Bot hanya respon owner\n• \`.mode public\` - Bot respon semua user\n\n💡 *Keterangan:*\n• Mode SELF: Bot hanya merespon owner dan prioritas utama\n• Mode PUBLIC: Bot merespon semua pengguna\n\n⚙️ Data tersimpan otomatis ke config.json\n📁 Backup dibuat di folder DATA`, m, hisoka);
            return;
        }

        const currentMode = config.SELF ? 'self' : 'public';

        // Cek jika mode sudah sama
        if ((modeArg === 'self' && config.SELF) || (modeArg === 'public' && !config.SELF)) {
            if (modeArg === 'self') {
                await Wily(`ℹ️ *MODE BOT SUDAH DALAM KEADAAN SELF*

🔒 *APA ITU MODE SELF?*
━━━━━━━━━━━━━━━━━━━
• Bot hanya merespon pesan dari Owner
• Mengutamakan privasi dan keamanan
• Cocok untuk penggunaan personal
• Menghemat resource bot
• Menghindari spam dari user lain

🎯 *KEUNTUNGAN MODE SELF:*
━━━━━━━━━━━━━━━━━━━
✅ Privasi terjaga maksimal
✅ Bot tidak diganggu user lain
✅ Performa lebih optimal
✅ Kontrol penuh oleh owner
✅ Keamanan tingkat tinggi

💡 *SARAN:*
• Gunakan \`.mode public\` untuk mode terbuka
• Mode SELF cocok untuk bot personal
• Owner tetap bisa akses semua fitur`, m, hisoka);
            } else {
                await Wily(`ℹ️ *MODE BOT SUDAH DALAM KEADAAN PUBLIC*

🌐 *APA ITU MODE PUBLIC?*
━━━━━━━━━━━━━━━━━━━
• Bot merespon pesan dari semua user
• Bersifat terbuka dan sosial
• Cocok untuk bot komunitas/grup
• Semua orang bisa akses fitur umum
• Owner tetap punya akses khusus

🎯 *KEUNTUNGAN MODE PUBLIC:*
━━━━━━━━━━━━━━━━━━━
✅ Interaksi dengan banyak user
✅ Cocok untuk komunitas
✅ Membantu banyak orang
✅ Bot lebih aktif dan berguna
✅ Fitur dapat dimanfaatkan semua

💡 *SARAN:*
• Gunakan \`.mode self\` untuk mode pribadi
• Mode PUBLIC cocok untuk bot grup
• Fitur owner tetap terlindungi`, m, hisoka);
            }
            return;
        }

        // Ubah mode
        const success = changeMode(modeArg);

        if (success) {
            // Verifikasi perubahan dengan membaca config lagi
            const newConfig = readConfig();
            const actualMode = newConfig.SELF ? 'self' : 'public';

            const emoji = modeArg === 'self' ? '🔒' : '🌐';
            const description = modeArg === 'self' 
                ? 'Bot hanya merespon owner dan prioritas utama'
                : 'Bot merespon semua pengguna';

            await Wily(`${emoji} *MODE BERHASIL DIUBAH*\n\n🔄 Mode: *${currentMode.toUpperCase()}* ➜ *${actualMode.toUpperCase()}*\n📝 Status: ${description}\n\n✅ Konfigurasi tersimpan ke config.json\n💾 Backup dibuat di folder DATA\n⚡ Bot terus berjalan tanpa restart\n\n🔍 *Verifikasi:* Mode sekarang ${actualMode.toUpperCase()}`, m, hisoka);
        } else {
            await Wily('❌ Gagal mengubah mode bot. Pastikan file config.json dapat ditulis.', m, hisoka);
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export untuk digunakan di message.js
export const modeInfo = {
    command: ['mode'],
    description: 'Mengubah mode bot antara self dan public'
};

// Export fungsi utama sebagai mode
export const mode = handleModeCommand;

import fs from 'fs';
import path from 'path';
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

// Fungsi untuk membaca config dengan fallback
function readConfig() {
    try {
        if (!fs.existsSync('./config.json')) {
            const defaultConfig = {
                "OWNER": ["6289681008411"],
                "SELF": true,
                "mode": "self",
                "packName": "Sticker Dibuat Oleh : Wily",
                "packPublish": "Dika Ardnt.",
                "SESSION_NAME": "sesi",
                "AUTO_BIO": false
            };
            fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Pastikan AUTO_BIO property ada
        if (config.AUTO_BIO === undefined) {
            config.AUTO_BIO = false;
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
            "AUTO_BIO": false
        };
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

// Fungsi untuk mengubah status auto bio
function changeAutoBioStatus(newStatus) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        
        createBackup();
        
        config.AUTO_BIO = newStatus;
        
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk format uptime
function formatUptime(uptimeMs) {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} hari, ${hours % 24} jam, ${minutes % 60} menit`;
    } else if (hours > 0) {
        return `${hours} jam, ${minutes % 60} menit`;
    } else if (minutes > 0) {
        return `${minutes} menit, ${seconds % 60} detik`;
    } else {
        return `${seconds} detik`;
    }
}

// Class untuk mengelola auto bio
class AutoBio {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.sock = null;
    }

    // Inisialisasi auto bio
    initialize(sock) {
        this.sock = sock;
        const config = readConfig();
        
        if (config.AUTO_BIO && !this.isRunning) {
            this.start();
        }
    }

    // Mulai auto bio
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.updateBio(); // Update langsung
        
        // Update setiap 60 detik (1 menit)
        this.intervalId = setInterval(() => {
            this.updateBio();
        }, 60000);
    }

    // Stop auto bio
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // Update bio dengan uptime
    async updateBio() {
        try {
            const config = readConfig();
            if (!config.AUTO_BIO || !this.sock) return;

            const uptime = process.uptime() * 1000;
            const formattedUptime = formatUptime(uptime);
            const timestamp = new Date().toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const bioText = `🤖 Bot Online\n⏰ Uptime: ${formattedUptime}\n📅 Update: ${timestamp}`;

            await this.sock.updateProfileStatus(bioText);
        } catch (error) {
            // Silent error handling
        }
    }

    // Refresh konfigurasi dari file
    refreshFromConfig() {
        const config = readConfig();
        
        if (config.AUTO_BIO && !this.isRunning) {
            this.start();
        } else if (!config.AUTO_BIO && this.isRunning) {
            this.stop();
        }
    }

    // Cek apakah sedang aktif
    isActive() {
        return this.isRunning;
    }
}

// Instance global auto bio
const autoBioInstance = new AutoBio();

// Handler untuk command autobio
export async function handleAutoBioCommand(m, { hisoka, text, command }) {
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
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat mengatur auto bio bot\n\n🔒 Akses terbatas untuk menjaga keamanan dan privasi bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text ? text.trim().split(' ') : [];
        const action = args[0]?.toLowerCase();

        // Validasi input - cek jika ada argument tambahan yang tidak valid
        if (args.length > 1) {
            const invalidArgs = args.slice(1).join(' ');
            await Wily(`❌ *COMMAND TIDAK VALID*\n\n🔍 *Yang Anda ketik:* \`.autobio ${text}\`\n\n⚠️ *Kesalahan:* Command memiliki argument tambahan "${invalidArgs}"\n\n✅ *FORMAT YANG BENAR:*\n• \`.autobio on\` - Aktifkan auto bio\n• \`.autobio off\` - Nonaktifkan auto bio\n• \`.autobio\` - Lihat status dan bantuan\n\n💡 *TIDAK BOLEH ADA TEKS TAMBAHAN SETELAH ON/OFF*\n\n📋 *Contoh yang SALAH:*\n❌ \`.autobio on jawjda\`\n❌ \`.autobio off xyz\`\n❌ \`.autobio on aktifkan\`\n\n📋 *Contoh yang BENAR:*\n✅ \`.autobio on\`\n✅ \`.autobio off\`\n\n🎯 Silakan coba lagi dengan format yang benar!`, m, hisoka);
            return;
        }

        // Command .autobio on/off
        if (action === 'on' || action === 'off') {
            const newStatus = action === 'on';
            const currentStatus = config.AUTO_BIO || false;

            if (currentStatus === newStatus) {
                const statusText = newStatus ? 'AKTIF' : 'NONAKTIF';
                const uptime = process.uptime() * 1000;
                const formattedUptime = formatUptime(uptime);

                await Wily(`ℹ️ *AUTO BIO SUDAH DALAM KEADAAN ${statusText}*\n\n📱 *APA ITU AUTO BIO?*\n━━━━━━━━━━━━━━━━━━━\n• Mengupdate bio WhatsApp secara otomatis\n• Menampilkan uptime bot real-time\n• Update setiap 1 menit\n• Menunjukkan status bot aktif\n• Timestamp update terakhir\n\n🎯 *FITUR AUTO BIO:*\n━━━━━━━━━━━━━━━━━━━\n✅ Uptime bot dalam hari, jam, menit\n✅ Timestamp update terakhir\n✅ Status "Bot Online" di bio\n✅ Format waktu Indonesia (WIB)\n✅ Update otomatis tanpa restart\n\n⏰ *UPTIME SAAT INI: ${formattedUptime}*\n\n💡 *STATUS SAAT INI: ${statusText}*`, m, hisoka);
                return;
            }

            const success = changeAutoBioStatus(newStatus);
            if (success) {
                const statusText = newStatus ? 'AKTIF' : 'NONAKTIF';
                const emoji = newStatus ? '✅' : '❌';
                const description = newStatus ? 'Auto bio diaktifkan - Bot akan mengupdate bio dengan uptime' : 'Auto bio dinonaktifkan - Bot tidak akan mengupdate bio lagi';

                // Update instance auto bio
                if (newStatus) {
                    autoBioInstance.initialize(hisoka);
                } else {
                    autoBioInstance.stop();
                }

                const uptime = process.uptime() * 1000;
                const formattedUptime = formatUptime(uptime);

                await Wily(`${emoji} *AUTO BIO BERHASIL DIUBAH*\n\n🔄 Status: *${statusText}*\n📱 ${description}\n\n💾 Konfigurasi tersimpan ke config.json\n📁 Backup dibuat di folder DATA\n\n💡 *CARA KERJA AUTO BIO:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Update bio setiap 1 menit otomatis\n• Menampilkan uptime bot real-time\n• Format: "🤖 Bot Online\\n⏰ Uptime: [waktu]\\n📅 Update: [timestamp]"\n• Menggunakan zona waktu Indonesia (WIB)\n• Tidak perlu restart bot\n\n⏰ *UPTIME SAAT INI:*\n${formattedUptime}\n\n🎯 *CONTOH BIO YANG AKAN MUNCUL:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 Bot Online\n⏰ Uptime: ${formattedUptime}\n📅 Update: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n⚡ Bot terus berjalan tanpa restart`, m, hisoka);
            } else {
                await Wily('❌ Gagal mengubah status auto bio. Pastikan file config.json dapat ditulis.', m, hisoka);
            }
            return;
        }

        // Jika tidak ada argument atau command salah - tampilkan help
        const currentStatus = config.AUTO_BIO || false;
        const statusText = currentStatus ? 'AKTIF ✅' : 'NONAKTIF ❌';
        const statusEmoji = currentStatus ? '🟢' : '🔴';
        const uptime = process.uptime() * 1000;
        const formattedUptime = formatUptime(uptime);

        // Cek jika user salah ketik command dengan pesan error yang jelas
        let helpMessage = '';
        if (action && !['on', 'off'].includes(action)) {
            helpMessage = `❌ *COMMAND TIDAK DIKENALI: "${action}"*\n\n🚫 *FITUR TIDAK DITEMUKAN*\n\n🔍 *COMMAND YANG VALID:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• \`.autobio on\` - Aktifkan auto bio\n• \`.autobio off\` - Nonaktifkan auto bio\n• \`.autobio\` - Lihat status dan bantuan\n\n❌ *COMMAND YANG ANDA KETIK SALAH:*\n\`\`.autobio ${text}\`\`\n\n💡 *MUNGKIN MAKSUD ANDA:*\n`;
            
            // Saran berdasarkan input yang mirip
            if (action.includes('on') || action.includes('aktif') || action.includes('enable') || action.includes('nyala') || action.includes('hidup')) {
                helpMessage += `• \`.autobio on\` ✅ (untuk mengaktifkan auto bio)\n`;
            } else if (action.includes('off') || action.includes('nonaktif') || action.includes('disable') || action.includes('mati') || action.includes('matikan')) {
                helpMessage += `• \`.autobio off\` ✅ (untuk menonaktifkan auto bio)\n`;
            } else if (action.includes('help') || action.includes('bantuan') || action.includes('info')) {
                helpMessage += `• \`.autobio\` ✅ (untuk melihat bantuan)\n`;
            } else {
                // Cek similarity dengan fuzzy matching
                const commands = ['on', 'off'];
                const similar = commands.filter(cmd => {
                    const distance = Math.abs(action.length - cmd.length);
                    const hasCommonChars = action.split('').some(char => cmd.includes(char));
                    return distance <= 2 && hasCommonChars;
                });
                
                if (similar.length > 0) {
                    similar.forEach(cmd => {
                        helpMessage += `• \`.autobio ${cmd}\` ✅ (${cmd === 'on' ? 'untuk mengaktifkan' : 'untuk menonaktifkan'})\n`;
                    });
                } else {
                    helpMessage += `• \`.autobio on\` ✅ - jika ingin mengaktifkan\n• \`.autobio off\` ✅ - jika ingin menonaktifkan\n• \`.autobio\` ✅ - jika ingin lihat bantuan\n`;
                }
            }
            
            helpMessage += `\n⚠️ *PERINGATAN:*\nBot tidak akan mengeksekusi command yang tidak valid!\nPastikan ketik dengan benar sesuai format.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }

        await Wily(`${helpMessage}📱 *AUTO BIO BOT*\n\n${statusEmoji} *Status Saat Ini:* ${statusText}\n⏰ *Uptime Bot:* ${formattedUptime}\n\n📋 *PENGATURAN AUTO BIO:*\n\n🔸 *UNTUK MENGAKTIFKAN:*\n• \`.autobio on\` - Aktifkan auto bio\n   📱 Bot akan update bio WhatsApp otomatis\n   ⏰ Menampilkan uptime real-time\n   🔄 Update setiap 1 menit\n\n🔸 *UNTUK MENONAKTIFKAN:*\n• \`.autobio off\` - Nonaktifkan auto bio\n   ❌ Bot tidak akan update bio lagi\n   🚫 Bio WhatsApp tetap seperti sebelumnya\n   📴 Sistem auto bio berhenti bekerja\n\n🎯 *APA ITU AUTO BIO?*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 📱 Mengupdate bio WhatsApp otomatis\n• ⏰ Menampilkan uptime bot real-time\n• 🕐 Update setiap 1 menit sekali\n• 📅 Timestamp update terakhir\n• 🤖 Status "Bot Online" di bio\n• 🇮🇩 Format waktu Indonesia (WIB)\n\n🔥 *CONTOH BIO YANG MUNCUL:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 Bot Online\n⏰ Uptime: ${formattedUptime}\n📅 Update: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n💡 *KEUNTUNGAN AUTO BIO:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ User tahu bot sedang online\n✅ Menampilkan profesionalitas\n✅ Monitoring uptime mudah\n✅ Update otomatis tanpa manual\n✅ Real-time status bot\n\n⚡ *STATUS SISTEM: ${statusText}*\n${currentStatus ? '🎉 Bio sedang diupdate otomatis!' : '💡 Aktifkan dengan: .autobio on'}`, m, hisoka);

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export instance untuk digunakan di index.js
export { autoBioInstance };

// Export untuk digunakan di message.js
export const autobioInfo = {
    command: ['autobio'],
    description: 'Mengatur auto bio uptime bot (khusus owner)'
};

export const autobio = handleAutoBioCommand;

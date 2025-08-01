
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
                "SESSION_NAME": "session",
                "LEVEL_SYSTEM": false
            };
            fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (error) {
        return {
            "OWNER": ["6289681008411"],
            "SELF": true,
            "mode": "self",
            "packName": "Sticker Dibuat Oleh : Wily",
            "packPublish": "Dika Ardnt.",
            "SESSION_NAME": "session",
            "LEVEL_SYSTEM": false
        };
    }
}

// Fungsi untuk membuat backup config
function createBackup() {
    try {
        const dataDir = './DATA';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const backupFile = path.join(dataDir, 'config-backup.json');
        const configData = fs.readFileSync('./config.json', 'utf8');

        fs.writeFileSync(backupFile, configData);
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk mengubah status level system
function changeLevelStatus(newStatus) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        
        createBackup();
        
        config.LEVEL_SYSTEM = newStatus;
        
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk mendapatkan nama level berdasarkan level number
function getLevelName(level) {
    const levelNames = {
        // Tingkat Pemula (1-10) - Awal Perjalanan
        1: "Newbie 🌱", 2: "Rookie 🔰", 3: "Beginner 📚", 4: "Learner 🎓", 5: "Student 📖",
        6: "Trainee 🎯", 7: "Cadet 🏃", 8: "Apprentice 🛠️", 9: "Novice ⭐", 10: "Regular 💪",
        
        // Tingkat Menengah (11-25) - Membangun Skill
        11: "Active 🔥", 12: "Dedicated 💎", 13: "Loyal 🤝", 14: "Committed 🎪", 15: "Enthusiast 🌟",
        16: "Productive 📈", 17: "Creative 🎨", 18: "Innovative 💡", 19: "Skilled 🏆", 20: "Talented 🌈",
        21: "Expert 🔬", 22: "Professional 💼", 23: "Specialist 🎖️", 24: "Veteran 🗡️", 25: "Master 👑",
        
        // Tingkat Lanjut (26-40) - Menuju Kehebatan
        26: "Elite 🏅", 27: "Champion 🏆", 28: "Hero 🦸", 29: "Legend 📜", 30: "Mythical 🔮",
        31: "Immortal ⚡", 32: "Divine 🕊️", 33: "Celestial ✨", 34: "Cosmic 🌌", 35: "Infinity ♾️",
        36: "Eternal 🌙", 37: "Supreme 👸", 38: "Ultimate 🔱", 39: "Transcendent 🎭", 40: "Omnipotent 🌀",
        
        // Tingkat Mahir (41-55) - Kekuatan Sejati
        41: "Overlord 👑", 42: "Emperor 🏛️", 43: "Sovereign 💫", 44: "Monarch 🗾", 45: "Ruler 🏺",
        46: "Conqueror ⚔️", 47: "Dominator 🛡️", 48: "Warlord 🗂️", 49: "Commander 📯", 50: "General 🎖️",
        51: "Admiral 🚢", 52: "Marshal 🎗️", 53: "Captain 🧭", 54: "Knight 🏰", 55: "Paladin ⚡",
        
        // Tingkat Jagoan (56-70) - Perlindungan dan Kekuatan
        56: "Guardian 🛡️", 57: "Protector 🔰", 58: "Defender 🏔️", 59: "Sentinel 🗼", 60: "Vanguard ⚡",
        61: "Warrior 🗡️", 62: "Gladiator 🏟️", 63: "Samurai 🇯🇵", 64: "Ninja 🥷", 65: "Assassin 🗡️",
        66: "Hunter 🏹", 67: "Ranger 🌲", 68: "Scout 🔍", 69: "Tracker 🐾", 70: "Predator 🦅",
        
        // Tingkat Fenomena (71-85) - Kesempurnaan
        71: "Alpha 🐺", 72: "Omega 🌕", 73: "Prime 💎", 74: "Apex 🔺", 75: "Zenith ⛰️",
        76: "Pinnacle 🏔️", 77: "Summit 🎯", 78: "Peak 🚀", 79: "Climax 💥", 80: "Maximum 📊",
        81: "Perfect 💯", 82: "Flawless 💎", 83: "Pristine ✨", 84: "Pure 🤍", 85: "Sacred 🕊️",
        
        // Tingkat Dewa (86-100) - Level Tertinggi
        86: "Holy 👼", 87: "Blessed 🙏", 88: "Enlightened 🧘", 89: "Ascended 🚀", 90: "Evolved 🧬",
        91: "Transformed 🦋", 92: "Reborn 🔄", 93: "Phoenix 🔥", 94: "Dragon 🐉", 95: "Titan ⚡",
        96: "Leviathan 🌊", 97: "Behemoth 🏔️", 98: "Colossus 🗿", 99: "Infinity God ♾️", 100: "ALMIGHTY GOD 👑"
    };
    return levelNames[level] || "Unknown Level";
}

// Fungsi untuk menghitung EXP yang dibutuhkan untuk level tertentu
function getExpForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Fungsi untuk menghitung level berdasarkan total EXP
function calculateLevel(totalExp) {
    if (totalExp < 0) return 1; // Pastikan EXP tidak negatif
    
    let level = 1;
    while (level < 100) {
        const expRequired = getExpForLevel(level + 1);
        if (totalExp < expRequired) break;
        level++;
    }
    return Math.max(1, level); // Pastikan level minimum 1
}

// Fungsi untuk load data level
function loadLevelData() {
    try {
        const levelPath = './DATA/infolevel.json';
        if (fs.existsSync(levelPath)) {
            const data = fs.readFileSync(levelPath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        return {};
    }
}

// Fungsi untuk save data level
function saveLevelData(data) {
    try {
        const dataDir = './DATA';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync('./DATA/infolevel.json', JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk update EXP user
export function updateUserExp(userId, groupId, groupName) {
    try {
        const config = readConfig();
        if (!config.LEVEL_SYSTEM) return null;

        const levelData = loadLevelData();
        
        if (!levelData[groupId]) {
            levelData[groupId] = {
                groupName: groupName || 'Unknown Group',
                users: {}
            };
        }

        if (!levelData[groupId].users[userId]) {
            levelData[groupId].users[userId] = {
                totalExp: 0,
                level: 1,
                levelName: getLevelName(1),
                messageCount: 0,
                lastActive: new Date().toISOString(),
                joinedAt: new Date().toISOString(),
                firstLevelUpAt: null,
                maxLevelReached: 1,
                totalLevelUps: 0
            };
        }

        const user = levelData[groupId].users[userId];
        const oldLevel = user.level;
        
        // Tambah EXP (5-15 per pesan)
        const expGain = Math.floor(Math.random() * 11) + 5;
        user.totalExp = Math.max(0, user.totalExp + expGain); // Pastikan totalExp tidak negatif
        user.messageCount++;
        user.lastActive = new Date().toISOString();
        
        // Hitung level baru
        const newLevel = calculateLevel(user.totalExp);
        const newLevelName = getLevelName(newLevel);
        
        // Update data user dengan validasi
        user.level = Math.max(1, newLevel); // Pastikan level minimal 1
        user.levelName = newLevelName;
        
        // Validasi ulang data untuk memastikan konsistensi
        if (user.totalExp < getExpForLevel(user.level)) {
            // Jika ada inkonsistensi, perbaiki totalExp
            user.totalExp = Math.max(user.totalExp, getExpForLevel(user.level));
        }
        
        // Jika level naik, update statistik
        if (newLevel > oldLevel) {
            user.totalLevelUps++;
            user.maxLevelReached = Math.max(user.maxLevelReached, newLevel);
            
            if (!user.firstLevelUpAt) {
                user.firstLevelUpAt = new Date().toISOString();
            }
        }
        
        saveLevelData(levelData);
        
        // Return info jika level naik
        if (newLevel > oldLevel) {
            return {
                levelUp: true,
                oldLevel: oldLevel,
                newLevel: newLevel,
                levelName: newLevelName,
                oldLevelName: getLevelName(oldLevel),
                totalExp: user.totalExp,
                expGain: expGain
            };
        }
        
        return { levelUp: false, expGain: expGain };
    } catch (error) {
        return null;
    }
}

// Handler untuk levelup command
export async function handleLevelupCommand(m, { hisoka, text, command }) {
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
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat mengatur sistem level\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text ? text.trim().split(' ') : [];
        const action = args[0]?.toLowerCase();

        // Validasi input - cek jika ada argument tambahan yang tidak valid
        if (args.length > 1) {
            const invalidArgs = args.slice(1).join(' ');
            await Wily(`❌ *COMMAND TIDAK VALID*\n\n🔍 *Yang Anda ketik:* \`.levelup ${text}\`\n\n⚠️ *Kesalahan:* Command memiliki argument tambahan "${invalidArgs}"\n\n✅ *FORMAT YANG BENAR:*\n• \`.levelup on\` - Aktifkan sistem level\n• \`.levelup off\` - Nonaktifkan sistem level\n• \`.levelup\` - Lihat status dan bantuan\n\n💡 *TIDAK BOLEH ADA TEKS TAMBAHAN SETELAH ON/OFF*\n\n📋 *Contoh yang SALAH:*\n❌ \`.levelup on xyz\`\n❌ \`.levelup off jawjda\`\n❌ \`.levelup on aktifkan\`\n\n📋 *Contoh yang BENAR:*\n✅ \`.levelup on\`\n✅ \`.levelup off\`\n\n🎯 Silakan coba lagi dengan format yang benar!`, m, hisoka);
            return;
        }

        // Command .levelup on/off
        if (action === 'on' || action === 'off') {
            const newStatus = action === 'on';
            const currentStatus = config.LEVEL_SYSTEM || false;

            if (currentStatus === newStatus) {
                const statusText = newStatus ? 'AKTIF' : 'NONAKTIF';
                await Wily(`ℹ️ *SISTEM LEVEL SUDAH DALAM KEADAAN ${statusText}*\n\n📊 *APA ITU SISTEM LEVEL?*\n━━━━━━━━━━━━━━━━━━━\n• Melacak aktivitas user di group\n• Memberikan EXP untuk setiap pesan\n• Level naik otomatis berdasarkan EXP\n• Ranking user berdasarkan level\n• 100 level dengan nama unik\n\n🎯 *FITUR TERSEDIA:*\n━━━━━━━━━━━━━━━━━━━\n✅ \`.level my\` - Cek level pribadi\n✅ \`.level all\` - Ranking group\n✅ \`.level allgc\` - Level semua group\n✅ \`.level syarat [range]\` - Info level\n\n💡 *STATUS SAAT INI: ${statusText}*`, m, hisoka);
                return;
            }

            const success = changeLevelStatus(newStatus);
            if (success) {
                const statusText = newStatus ? 'AKTIF' : 'NONAKTIF';
                const emoji = newStatus ? '✅' : '❌';
                const description = newStatus ? 'Sistem level diaktifkan - Bot akan melacak aktivitas user' : 'Sistem level dinonaktifkan - Bot tidak akan melacak aktivitas';

                await Wily(`${emoji} *SISTEM LEVEL BERHASIL DIUBAH*\n\n🔄 Status: *${statusText}*\n📝 ${description}\n\n💾 Konfigurasi tersimpan ke config.json\n📁 Backup dibuat di folder DATA\n\n💡 *Contoh penggunaan:*\n• \`.level my\` - Lihat level Anda\n• \`.level all\` - Lihat level semua user di group ini\n• \`.level allgc\` - Lihat level user semua group\n• \`.level syarat 1-100\` - Lihat syarat level\n\n🎯 *CARA KERJA:*\n━━━━━━━━━━━━━━━━━━━\n• Setiap pesan = 5-15 EXP random\n• Level naik otomatis dengan notifikasi\n• Data tersimpan di DATA/infolevel.json\n• 100 level dengan nama spesial\n\n⚡ Bot terus berjalan tanpa restart`, m, hisoka);
            } else {
                await Wily('❌ Gagal mengubah status sistem level. Pastikan file config.json dapat ditulis.', m, hisoka);
            }
            return;
        }

        // Jika tidak ada argument atau command salah - tampilkan help
        const currentStatus = config.LEVEL_SYSTEM || false;
        const statusText = currentStatus ? 'AKTIF ✅' : 'NONAKTIF ❌';
        const statusEmoji = currentStatus ? '🟢' : '🔴';

        // Cek jika user salah ketik command dengan pesan error yang jelas
        let helpMessage = '';
        if (action && !['on', 'off'].includes(action)) {
            helpMessage = `❌ *COMMAND TIDAK DIKENALI: "${action}"*\n\n🚫 *FITUR TIDAK DITEMUKAN*\n\n🔍 *COMMAND YANG VALID:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• \`.levelup on\` - Aktifkan sistem level\n• \`.levelup off\` - Nonaktifkan sistem level\n• \`.levelup\` - Lihat status dan bantuan\n\n❌ *COMMAND YANG ANDA KETIK SALAH:*\n\`\`.levelup ${text}\`\`\n\n💡 *MUNGKIN MAKSUD ANDA:*\n`;
            
            // Saran berdasarkan input yang mirip dengan analisis lebih detail
            if (action.includes('on') || action.includes('aktif') || action.includes('enable') || action.includes('nyala') || action.includes('hidup')) {
                helpMessage += `• \`.levelup on\` ✅ (untuk mengaktifkan sistem level)\n`;
            } else if (action.includes('off') || action.includes('nonaktif') || action.includes('disable') || action.includes('mati') || action.includes('matikan')) {
                helpMessage += `• \`.levelup off\` ✅ (untuk menonaktifkan sistem level)\n`;
            } else if (action.includes('help') || action.includes('bantuan') || action.includes('info')) {
                helpMessage += `• \`.levelup\` ✅ (untuk melihat bantuan)\n`;
            } else {
                // Cek similarity dengan fuzzy matching
                const commands = ['on', 'off'];
                const similar = commands.filter(cmd => {
                    // Cek jarak edit sederhana
                    const distance = Math.abs(action.length - cmd.length);
                    const hasCommonChars = action.split('').some(char => cmd.includes(char));
                    return distance <= 2 && hasCommonChars;
                });
                
                if (similar.length > 0) {
                    similar.forEach(cmd => {
                        helpMessage += `• \`.levelup ${cmd}\` ✅ (${cmd === 'on' ? 'untuk mengaktifkan' : 'untuk menonaktifkan'})\n`;
                    });
                } else {
                    helpMessage += `• \`.levelup on\` ✅ - jika ingin mengaktifkan\n• \`.levelup off\` ✅ - jika ingin menonaktifkan\n• \`.levelup\` ✅ - jika ingin lihat bantuan\n`;
                }
            }
            
            helpMessage += `\n⚠️ *PERINGATAN:*\nBot tidak akan mengeksekusi command yang tidak valid!\nPastikan ketik dengan benar sesuai format.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }

        await Wily(`${helpMessage}⚙️ *SISTEM LEVEL BOT*\n\n${statusEmoji} *Status Saat Ini:* ${statusText}\n\n📋 *PENGATURAN LEVEL SYSTEM:*\n\n🔸 *UNTUK MENGAKTIFKAN:*\n• \`.levelup on\` - Aktifkan sistem level\n   📊 Bot akan melacak aktivitas user\n   ⭐ Berikan EXP untuk setiap pesan\n   🏆 Level naik otomatis dengan notifikasi\n\n🔸 *UNTUK MENONAKTIFKAN:*\n• \`.levelup off\` - Nonaktifkan sistem level\n   ❌ Bot tidak akan melacak aktivitas\n   🚫 EXP tidak akan bertambah\n   📴 Sistem level berhenti bekerja\n\n🎯 *APA ITU SISTEM LEVEL?*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🌟 Melacak aktivitas user di group\n• ⭐ Setiap pesan = 5-15 EXP random\n• 🏆 100 level dengan nama unik\n• 📈 Ranking berdasarkan EXP tertinggi\n• 🎉 Notifikasi otomatis saat level naik\n• 💾 Data tersimpan di DATA/infolevel.json\n\n🔥 *FITUR YANG TERSEDIA:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• \`.level my\` - Cek level & statistik Anda\n• \`.level all\` - Ranking top 10 group ini\n• \`.level allgc\` - Top user semua group\n• \`.level syarat [range]\` - Info syarat level\n• \`.level\` - Menu bantuan sistem level\n\n💡 *CONTOH NAMA LEVEL:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🌱 Level 1: "Newbie 🌱"\n🔰 Level 10: "Regular 💪"\n👑 Level 25: "Master 👑"\n🦸 Level 50: "General 🎖️"\n🐉 Level 100: "ALMIGHTY GOD 👑"\n\n⚡ *STATUS SISTEM: ${statusText}*\n${currentStatus ? '🎉 Sistem siap digunakan!' : '💡 Aktifkan dengan: .levelup on'}`, m, hisoka);

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Handler untuk level command
export async function handleLevelCommand(m, { hisoka, text, command }) {
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

        // Cek mode bot dan akses
        let hasAccess = false;
        if (config.SELF && config.mode === 'self') {
            hasAccess = config.OWNER.includes(senderNumber);
        } else if (!config.SELF || config.mode === 'public') {
            hasAccess = true;
        }

        if (!hasAccess) {
            return;
        }

        const args = text ? text.trim().split(' ') : [];
        const subCommand = args[0]?.toLowerCase();

        // Validasi khusus untuk subcommand yang memerlukan format tertentu
        if (subCommand === 'syarat') {
            if (args.length !== 2) {
                await Wily(`❌ *FORMAT COMMAND SALAH*\n\n🔍 *Yang Anda ketik:* \`.level ${text || ''}\`\n\n⚠️ *Kesalahan:* Command "syarat" memerlukan format khusus\n\n✅ *FORMAT YANG BENAR:*\n• \`.level syarat [level_awal]-[level_akhir]\`\n\n📋 *Contoh yang BENAR:*\n✅ \`.level syarat 1-10\`\n✅ \`.level syarat 20-30\`\n✅ \`.level syarat 50-100\`\n\n📋 *Contoh yang SALAH:*\n❌ \`.level syarat\` (kurang parameter)\n❌ \`.level syarat 1\` (kurang tanda -)\n❌ \`.level syarat 1-10 extra\` (kelebihan parameter)\n\n🎯 Silakan coba lagi dengan format yang benar!`, m, hisoka);
                return;
            }
        } else if (subCommand && !['my', 'all', 'allgc', 'syarat'].includes(subCommand)) {
            // Jika subcommand tidak valid, langsung beri error tanpa eksekusi
            await Wily(`❌ *SUBCOMMAND TIDAK DIKENALI: "${subCommand}"*\n\n🚫 *FITUR TIDAK DITEMUKAN*\n\n🔍 *SUBCOMMAND YANG VALID:*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• \`.level my\` - Lihat level & statistik Anda\n• \`.level all\` - Ranking level group ini\n• \`.level allgc\` - Level user semua group\n• \`.level syarat [range]\` - Info syarat level\n• \`.level\` - Menu bantuan sistem level\n\n❌ *COMMAND YANG ANDA KETIK SALAH:*\n\`\`.level ${text || ''}\`\`\n\n💡 *MUNGKIN MAKSUD ANDA:*\n${getSuggestionForLevel(subCommand)}\n\n⚠️ *PERINGATAN:*\nBot tidak akan mengeksekusi command yang tidak valid!\nPastikan ketik dengan benar sesuai format.\n\n🎯 Silakan coba lagi dengan subcommand yang benar!`, m, hisoka);
            return;
        }

        // Cek apakah sistem level aktif
        if (!config.LEVEL_SYSTEM) {
            await Wily('❌ *Sistem level tidak aktif*\n\n⚙️ Minta owner untuk mengaktifkan dengan: `.levelup on`', m, hisoka);
            return;
        }

        const levelData = loadLevelData();
        const groupId = m.key?.remoteJid?.endsWith('@g.us') ? m.key.remoteJid : 'private';

        // Command .level my
        if (subCommand === 'my') {
            const userId = senderNumber;
            
            if (!levelData[groupId] || !levelData[groupId].users[userId]) {
                await Wily('📊 *LEVEL ANDA*\n\n🆕 Anda belum memiliki data level\n💬 Mulai berinteraksi untuk mendapatkan EXP!\n\n🎯 *Tips:* Kirim pesan di group untuk mendapatkan 5-15 EXP per pesan', m, hisoka);
                return;
            }

            const user = levelData[groupId].users[userId];
            const currentExpForLevel = getExpForLevel(user.level);
            const nextExpForLevel = user.level < 100 ? getExpForLevel(user.level + 1) : 0;
            const expProgress = user.level < 100 ? Math.max(0, user.totalExp - currentExpForLevel) : 0;
            const expNeeded = user.level < 100 ? Math.max(0, nextExpForLevel - user.totalExp) : 0;

            const levelName = getLevelName(user.level);
            
            // Fix progress bar calculation
            let progressBar = '▓▓▓▓▓▓▓▓▓▓'; // Default untuk level 100
            if (user.level < 100) {
                const totalExpForCurrentLevel = nextExpForLevel - currentExpForLevel;
                const progressRatio = totalExpForCurrentLevel > 0 ? Math.min(1, Math.max(0, expProgress / totalExpForCurrentLevel)) : 0;
                const filledBars = Math.floor(progressRatio * 10);
                const emptyBars = 10 - filledBars;
                progressBar = '▓'.repeat(filledBars) + '░'.repeat(emptyBars);
            }

            // Hitung berapa hari aktif (lebih akurat)
            const joinDate = new Date(user.joinedAt);
            const now = new Date();
            const timeDiff = now.getTime() - joinDate.getTime();
            const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
            
            // Jika kurang dari 1 hari tapi sudah ada aktivitas, tampilkan sebagai hari pertama
            const displayDays = daysDiff === 0 ? 'hari pertama' : `${daysDiff} hari yang lalu`;

            let statistikMessage = `📊 *LEVEL ANDA*\n\n👤 User: @${userId}\n🏆 Level: ${user.level} (${levelName})\n⭐ Total EXP: ${user.totalExp.toLocaleString()}\n💬 Pesan: ${user.messageCount.toLocaleString()}\n\n📈 *Progress:*\n${progressBar}\n${user.level < 100 ? `🎯 EXP untuk level ${user.level + 1}: ${expNeeded.toLocaleString()}` : '🎉 MAX LEVEL TERCAPAI!'}\n\n📊 *Statistik:*\n🚀 Total Level Up: ${user.totalLevelUps || 0}\n🏔️ Level Tertinggi: ${user.maxLevelReached || user.level}\n📅 Bergabung: ${displayDays}\n⏰ Terakhir aktif: ${new Date(user.lastActive).toLocaleString('id-ID')}`;

            if (user.firstLevelUpAt) {
                const firstLevelUpDate = new Date(user.firstLevelUpAt);
                const levelUpTimeDiff = now.getTime() - firstLevelUpDate.getTime();
                const levelUpDays = Math.max(0, Math.floor(levelUpTimeDiff / (1000 * 60 * 60 * 24)));
                const displayLevelUpDays = levelUpDays === 0 ? 'hari ini' : `${levelUpDays} hari yang lalu`;
                statistikMessage += `\n🎉 Level up pertama: ${displayLevelUpDays}`;
            }

            await Wily(statistikMessage, m, hisoka);
            return;
        }

        // Command .level all
        if (subCommand === 'all') {
            if (!levelData[groupId]) {
                await Wily('📊 *LEVEL SEMUA USER*\n\n🆕 Belum ada data level di group ini\n💬 Mulai berinteraksi untuk mendapatkan EXP!', m, hisoka);
                return;
            }

            const users = Object.entries(levelData[groupId].users)
                .sort((a, b) => b[1].totalExp - a[1].totalExp)
                .slice(0, 10);

            let message = `📊 *LEVEL SEMUA USER*\n\n🏠 Group: ${levelData[groupId].groupName}\n👥 Total User: ${Object.keys(levelData[groupId].users).length}\n\n🏆 *TOP 10 RANKING:*\n\n`;

            users.forEach((user, index) => {
                const [userId, userData] = user;
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
                const levelName = getLevelName(userData.level);
                
                message += `${medal} ${rank}. @${userId}\n`;
                message += `   🏆 Level ${userData.level} (${levelName})\n`;
                message += `   ⭐ ${userData.totalExp.toLocaleString()} EXP\n`;
                message += `   💬 ${userData.messageCount.toLocaleString()} pesan\n\n`;
            });

            message += `💡 *Gunakan:* \`.level my\` untuk melihat level Anda`;

            await Wily(message, m, hisoka);
            return;
        }

        // Command .level allgc
        if (subCommand === 'allgc') {
            if (Object.keys(levelData).length === 0) {
                await Wily('📊 *LEVEL USER SEMUA GROUP*\n\n🆕 Belum ada data level di semua group\n💬 Mulai berinteraksi untuk mendapatkan EXP!', m, hisoka);
                return;
            }

            let message = `📊 *LEVEL USER SEMUA GROUP*\n\n🌐 Total Group: ${Object.keys(levelData).length}\n\n`;

            Object.entries(levelData).forEach(([groupId, groupData]) => {
                const topUser = Object.entries(groupData.users)
                    .sort((a, b) => b[1].totalExp - a[1].totalExp)[0];

                if (topUser) {
                    const [userId, userData] = topUser;
                    const levelName = getLevelName(userData.level);
                    
                    message += `🏠 *${groupData.groupName}*\n`;
                    message += `👥 ${Object.keys(groupData.users).length} user\n`;
                    message += `🏆 Top: @${userId}\n`;
                    message += `   Level ${userData.level} (${levelName})\n`;
                    message += `   ⭐ ${userData.totalExp.toLocaleString()} EXP\n\n`;
                }
            });

            message += `💡 *Gunakan:* \`.level all\` untuk melihat ranking group ini`;

            await Wily(message, m, hisoka);
            return;
        }

        // Command .level syarat
        if (subCommand === 'syarat') {
            const userId = senderNumber;
            const userLevel = levelData[groupId]?.users[userId] || null;
            
            const levelRange = args[1];
            
            if (!levelRange || !levelRange.includes('-')) {
                let helpMessage = '❌ *Format salah!*\n\n💡 *Contoh:* `.level syarat 1-10`\n📋 *Format:* `.level syarat [level_awal]-[level_akhir]`\n\n🎯 *Contoh lain:*\n• `.level syarat 1-5`\n• `.level syarat 10-20`\n• `.level syarat 50-100`';
                
                if (userLevel) {
                    const currentLevel = userLevel.level;
                    const suggestedStart = Math.max(1, currentLevel - 2);
                    const suggestedEnd = Math.min(100, currentLevel + 5);
                    helpMessage += `\n\n👤 *Level Anda saat ini: ${currentLevel}*\n💡 *Saran:* \`.level syarat ${suggestedStart}-${suggestedEnd}\``;
                }
                
                await Wily(helpMessage, m, hisoka);
                return;
            }

            const [startLevel, endLevel] = levelRange.split('-').map(Number);
            
            if (isNaN(startLevel) || isNaN(endLevel) || startLevel < 1 || endLevel > 100 || startLevel > endLevel) {
                await Wily('❌ *Range level tidak valid!*\n\n📋 *Syarat:*\n• Level awal: 1-100\n• Level akhir: 1-100\n• Level awal harus ≤ level akhir\n\n💡 *Contoh:* `.level syarat 1-10`', m, hisoka);
                return;
            }

            let message = `📋 *SYARAT LEVEL ${startLevel}-${endLevel}*\n\n`;
            
            // Tampilkan info level user saat ini jika ada
            if (userLevel) {
                const currentLevel = userLevel.level;
                const currentLevelName = getLevelName(currentLevel);
                const currentExp = userLevel.totalExp;
                message += `👤 *Level Anda: ${currentLevel} (${currentLevelName})*\n⭐ *EXP Anda: ${currentExp.toLocaleString()}*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            }

            for (let level = startLevel; level <= endLevel; level++) {
                const expRequired = getExpForLevel(level);
                const levelName = getLevelName(level);
                
                // Tandai level user saat ini
                const isCurrentLevel = userLevel && userLevel.level === level;
                const levelIcon = isCurrentLevel ? '🎯' : '🏆';
                const levelText = isCurrentLevel ? `${levelIcon} Level ${level} (${levelName}) ⬅️ *ANDA DISINI*` : `${levelIcon} Level ${level} (${levelName})`;
                
                message += `${levelText}\n`;
                message += `   ⭐ EXP: ${expRequired.toLocaleString()}`;
                
                if (userLevel && level === userLevel.level) {
                    message += ` ✅ *TERCAPAI*`;
                } else if (userLevel && level < userLevel.level) {
                    message += ` ✅ *SELESAI*`;
                } else if (userLevel && level > userLevel.level) {
                    const expNeeded = expRequired - userLevel.totalExp;
                    message += ` (Butuh ${expNeeded.toLocaleString()} EXP lagi)`;
                }
                
                message += `\n`;
                
                if (level < 100) {
                    const nextExpRequired = getExpForLevel(level + 1);
                    const expDifference = nextExpRequired - expRequired;
                    message += `   📈 EXP untuk naik: ${expDifference.toLocaleString()}\n`;
                }
                
                message += `\n`;
            }

            message += `💡 *Tips:* Setiap pesan memberikan 5-15 EXP random\n🎯 Tetap aktif di group untuk naik level!`;
            
            if (userLevel) {
                const currentLevel = userLevel.level;
                if (currentLevel < 100) {
                    const nextLevel = currentLevel + 1;
                    const nextExpRequired = getExpForLevel(nextLevel);
                    const expNeeded = nextExpRequired - userLevel.totalExp;
                    message += `\n\n🚀 *Target selanjutnya:*\n• Level ${nextLevel} (${getLevelName(nextLevel)})\n• Butuh ${expNeeded.toLocaleString()} EXP lagi`;
                } else {
                    message += `\n\n🎉 *Selamat! Anda sudah mencapai MAX LEVEL!*`;
                }
            }

            await Wily(message, m, hisoka);
            return;
        }

        // Jika tidak ada subcommand - tampilkan help menu
        const userId = senderNumber;
        const userLevel = levelData[groupId]?.users[userId] || null;
        
        let menuMessage = `📊 *SISTEM LEVEL BOT*\n\n🎯 *Status:* ${config.LEVEL_SYSTEM ? 'AKTIF ✅' : 'NONAKTIF ❌'}\n\n`;
        
        // Tampilkan info user jika ada data
        if (userLevel && config.LEVEL_SYSTEM) {
            const levelName = getLevelName(userLevel.level);
            menuMessage += `👤 *Info Anda:*\n🏆 Level: ${userLevel.level} (${levelName})\n⭐ EXP: ${userLevel.totalExp.toLocaleString()}\n💬 Pesan: ${userLevel.messageCount.toLocaleString()}\n\n`;
        }
        
        menuMessage += `📋 *DAFTAR FITUR LEVEL:*\n\n`;
        
        menuMessage += `👤 *FITUR USER:*\n`;
        menuMessage += `• \`.level my\` - Lihat level & EXP Anda\n`;
        menuMessage += `   📊 Menampilkan statistik personal lengkap\n`;
        menuMessage += `   📈 Progress bar menuju level berikutnya\n\n`;
        
        menuMessage += `• \`.level all\` - Ranking level group ini\n`;
        menuMessage += `   🏆 Top 10 user dengan EXP tertinggi\n`;
        menuMessage += `   🥇 Medal untuk posisi 1, 2, 3\n\n`;
        
        menuMessage += `• \`.level allgc\` - Level user semua group\n`;
        menuMessage += `   🌐 Lihat top user di setiap group\n`;
        menuMessage += `   📊 Total statistik semua group\n\n`;
        
        menuMessage += `• \`.level syarat [range]\` - Syarat naik level\n`;
        menuMessage += `   📋 Info EXP yang dibutuhkan per level\n`;
        menuMessage += `   🎯 Menampilkan posisi level Anda\n`;
        menuMessage += `   💡 *Contoh:* \`.level syarat 1-10\`\n\n`;
        
        menuMessage += `⚙️ *FITUR OWNER:*\n`;
        menuMessage += `• \`.levelup on\` - Aktifkan sistem level\n`;
        menuMessage += `• \`.levelup off\` - Nonaktifkan sistem level\n\n`;
        
        menuMessage += `💡 *CARA KERJA SISTEM:*\n`;
        menuMessage += `🔸 Setiap pesan di group = 5-15 EXP random\n`;
        menuMessage += `🔸 Total 100 level dengan nama unik\n`;
        menuMessage += `🔸 Data tersimpan di DATA/infolevel.json\n`;
        menuMessage += `🔸 Level up otomatis dengan notifikasi\n\n`;
        
        menuMessage += `🏆 *CONTOH PENGGUNAAN YANG BENAR:*\n`;
        menuMessage += `• \`.level my\` - Cek statistik Anda\n`;
        menuMessage += `• \`.level syarat 1-10\` - Lihat syarat level 1-10\n`;
        
        if (userLevel && config.LEVEL_SYSTEM) {
            const currentLevel = userLevel.level;
            const suggestedStart = Math.max(1, currentLevel - 2);
            const suggestedEnd = Math.min(100, currentLevel + 5);
            menuMessage += `• \`.level syarat ${suggestedStart}-${suggestedEnd}\` - Range sesuai level Anda\n`;
        }
        
        menuMessage += `• \`.level all\` - Lihat ranking group\n`;
        
        if (!config.LEVEL_SYSTEM) {
            menuMessage += `\n⚠️ *SISTEM LEVEL NONAKTIF*\n💡 Minta owner untuk aktifkan: \`.levelup on\``;
        }

        await Wily(menuMessage, m, hisoka);

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Fungsi helper untuk memberikan saran command level
function getSuggestionForLevel(invalidSubCommand) {
    let suggestions = '';
    
    if (invalidSubCommand.includes('my') || invalidSubCommand.includes('me') || invalidSubCommand.includes('saya') || invalidSubCommand.includes('ku') || invalidSubCommand.includes('i')) {
        suggestions += `• \`.level my\` ✅ (untuk melihat level Anda)\n`;
    } else if (invalidSubCommand.includes('all') || invalidSubCommand.includes('semua') || invalidSubCommand.includes('rank') || invalidSubCommand.includes('top') || invalidSubCommand.includes('leaderboard')) {
        suggestions += `• \`.level all\` ✅ (untuk ranking group ini)\n`;
        if (invalidSubCommand.includes('gc') || invalidSubCommand.includes('group')) {
            suggestions += `• \`.level allgc\` ✅ (untuk ranking semua group)\n`;
        }
    } else if (invalidSubCommand.includes('gc') || invalidSubCommand.includes('group') || invalidSubCommand.includes('grup')) {
        suggestions += `• \`.level allgc\` ✅ (untuk level semua group)\n`;
    } else if (invalidSubCommand.includes('syarat') || invalidSubCommand.includes('req') || invalidSubCommand.includes('requirement') || invalidSubCommand.includes('info') || invalidSubCommand.includes('help')) {
        suggestions += `• \`.level syarat 1-10\` ✅ (untuk info syarat level)\n`;
    } else {
        // Cek similarity dengan fuzzy matching sederhana
        const commands = ['my', 'all', 'allgc', 'syarat'];
        const similar = commands.filter(cmd => {
            const distance = Math.abs(invalidSubCommand.length - cmd.length);
            const hasCommonChars = invalidSubCommand.split('').some(char => cmd.includes(char));
            return distance <= 3 && hasCommonChars;
        });
        
        if (similar.length > 0) {
            similar.forEach(cmd => {
                if (cmd === 'my') suggestions += `• \`.level my\` ✅ (melihat level Anda)\n`;
                if (cmd === 'all') suggestions += `• \`.level all\` ✅ (ranking group ini)\n`;
                if (cmd === 'allgc') suggestions += `• \`.level allgc\` ✅ (ranking semua group)\n`;
                if (cmd === 'syarat') suggestions += `• \`.level syarat 1-10\` ✅ (info syarat level)\n`;
            });
        } else {
            suggestions += `• \`.level my\` ✅ - jika ingin lihat level Anda\n• \`.level all\` ✅ - jika ingin lihat ranking\n• \`.level syarat 1-10\` ✅ - jika ingin info syarat\n• \`.level\` ✅ - jika ingin lihat bantuan\n`;
        }
    }
    
    return suggestions;
}

// Fungsi untuk mengintegrasikan sistem level ke message handler
export async function integrateLevelSystem(m, hisoka) {
    try {
        const config = readConfig();
        
        // Hanya proses jika sistem level aktif dan pesan dari group
        if (!config.LEVEL_SYSTEM || !m.key?.remoteJid?.endsWith('@g.us') || m.key?.fromMe) {
            return;
        }

        const groupMeta = await hisoka.groupMetadata(m.key.remoteJid);
        const groupName = groupMeta.subject;
        const userId = m.sender ? m.sender.split('@')[0] : (m.key?.participant ? m.key.participant.split('@')[0] : null);
        
        if (!userId) return;
        
        const levelResult = updateUserExp(userId, m.key.remoteJid, groupName);
        
        if (levelResult && levelResult.levelUp) {
            const levelUpMessage = `🎉 *LEVEL UP ACHIEVEMENT!*\n\n👤 @${userId}\n🏆 Level: ${levelResult.oldLevel} ➜ ${levelResult.newLevel}\n\n🌟 *TINGKATAN BARU:*\n✨ ${levelResult.levelName}\n\n⭐ Total EXP: ${levelResult.totalExp.toLocaleString()}\n📈 EXP Gain: +${levelResult.expGain}\n\n🎯 Selamat atas pencapaian luar biasa!\n💪 Terus berinteraksi untuk mencapai tingkatan yang lebih tinggi!\n\n🏆 *"${levelResult.oldLevelName}"* ➜ *"${levelResult.levelName}"*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📋 *FITUR LEVEL TERSEDIA:*\n• \`.level my\` - Lihat statistik level Anda\n• \`.level all\` - Ranking level group ini\n• \`.level syarat\` - Info syarat naik level\n\n💡 *Coba sekarang untuk melihat progress Anda!*`;
            
            await Wily(levelUpMessage, m, hisoka);
        }
    } catch (error) {
        // Silent error handling untuk sistem level
    }
}

// Export untuk digunakan di message.js
export const levelupInfo = {
    command: ['levelup'],
    description: 'Mengatur sistem level on/off (khusus owner)'
};

export const levelInfo = {
    command: ['level'],
    description: 'Sistem level berdasarkan aktivitas user di group'
};

export const levelup = handleLevelupCommand;
export const level = handleLevelCommand;

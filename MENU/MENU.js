
import fs from 'fs';
import { Wily } from '../CODE_REPLY/reply.js';
import { createMenuTemplate } from '../CODE_REPLY/tamplan_menu.js';

// Fungsi untuk membaca config
function readConfig() {
    try {
        if (!fs.existsSync('./config.json')) {
            const defaultConfig = {
                "OWNER": ["6289681008411"],
                "SELF": true,
                "mode": "self",
                "packName": "Sticker Dibuat Oleh : Wily",
                "packPublish": "Dika Ardnt.",
                "SESSION_NAME": "session"
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
            "SESSION_NAME": "session"
        };
    }
}

// Fungsi untuk mendapatkan nomor bot
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

// Fungsi untuk cek apakah user adalah owner
function isOwner(senderNumber, config) {
    return config.OWNER.includes(senderNumber);
}

// Fungsi untuk cek apakah bot harus respon
function shouldRespond(senderNumber, config, isGroup = false, fromMe = false) {
    if (isOwner(senderNumber, config)) {
        return true;
    }

    if (fromMe) {
        return false;
    }

    if (config.SELF || config.mode === 'self') {
        return false;
    }
    
    return true;
}

// Fungsi untuk mendapatkan runtime
function getRuntime() {
    const uptimeMs = process.uptime() * 1000;
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Fungsi untuk mendapatkan nama pengirim
function getSenderName(m) {
    if (m.pushName) return m.pushName;
    if (m.verifiedBizName) return m.verifiedBizName;
    if (m.sender) {
        const number = m.sender.split('@')[0];
        return `+${number}`;
    }
    return 'User';
}

// Handler untuk command menu
export async function handleMenuCommand(m, { hisoka, text, command }) {
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

        // Cek apakah bot harus respon
        const isGroup = !!m.key?.participant;
        if (!shouldRespond(senderNumber, config, isGroup, isFromMe)) {
            return;
        }

        // Get sender info
        const senderName = getSenderName(m);
        const runtime = getRuntime();
        const botNumber = getBotNumber();
        const isOwnerUser = isOwner(senderNumber, config);

        // Create thumbnail menggunakan gambar dari DATA/MEDIA/Tradz.jpg
        let thumbImage;
        try {
            if (fs.existsSync('./DATA/MEDIA/Tradz.jpg')) {
                thumbImage = fs.readFileSync('./DATA/MEDIA/Tradz.jpg');
            } else if (fs.existsSync('./generated-icon.png')) {
                thumbImage = fs.readFileSync('./generated-icon.png');
            } else {
                thumbImage = Buffer.alloc(0);
            }
        } catch (error) {
            thumbImage = Buffer.alloc(0);
        }

        // Buat caption menu berdasarkan kategori
        const args = text ? text.trim().split(' ') : [];
        const category = args[0]?.toLowerCase();

        // Validasi jika ada argument tambahan yang tidak valid
        if (args.length > 1) {
            const invalidArgs = args.slice(1).join(' ');
            await Wily(`❌ *Command Tidak Valid*

🚫 *Error:* Argument tidak dikenali: "${invalidArgs}"

📋 *Format yang benar:*
├ \`.menu\` - Menu utama
├ \`.menu owner\` - Menu owner
├ \`.menu public\` - Menu public  
├ \`.menu group\` - Menu group
├ \`.menu reaction\` - Menu reaction
├ \`.menu all\` - Semua fitur

💡 *Contoh penggunaan yang benar:*
├ \`.menu\`
├ \`.menu owner\`
├ \`.menu public\`

⚠️ *Catatan:* Tidak boleh ada spasi atau kata tambahan setelah kategori

🌟 *Developer:* Bang Wily`, m, hisoka);
            return;
        }

        // Validasi kategori yang valid
        const validCategories = ['owner', 'public', 'group', 'reaction', 'all'];
        if (category && !validCategories.includes(category)) {
            await Wily(`❌ *Kategori Tidak Valid*

🚫 *Error:* Kategori "${category}" tidak ditemukan

📋 *Kategori yang tersedia:*
├ 🛡️ \`.menu owner\` - Fitur khusus owner
├ 👥 \`.menu public\` - Fitur untuk semua
├ 🏘️ \`.menu group\` - Fitur grup
├ 🎯 \`.menu reaction\` - Manual reaction control
├ ⚙️ \`.menu all\` - Semua fitur

💡 *Contoh penggunaan yang benar:*
├ \`.menu owner\`
├ \`.menu public\`
├ \`.menu group\`
├ \`.menu reaction\`
├ \`.menu all\`
├ \`.menu\` (menu utama)

⚠️ *Tips:* Pastikan penulisan kategori sesuai dengan yang tersedia

🌟 *Developer:* Bang Wily`, m, hisoka);
            return;
        }

        let caption = '';
        const namaBot = "Auto Read Story WhatsApp Bot";
        const ucapanWaktu = `🕰️ ${new Date().toLocaleString('id-ID')}`;
        const linkSaluran = "https://whatsapp.com/channel/0029VaaqaSp0LKZDuJMU6d1L";

        if (!category) {
            // Menu utama - hanya tampilkan kategori
            caption = `╭═══════════════════╮
║  🤖 *WILY KUN BOT* 🤖  ║
╰═══════════════════╯

👋 *Halo ${senderName}!*
⏱️ *Runtime:* ${runtime}
🔰 *Mode:* ${config.mode?.toUpperCase() || 'SELF'}
📱 *Bot:* ${botNumber}

╭─── 📋 *KATEGORI MENU* ───╮
│
├ 🛡️ *.menu owner* - Menu Owner
├ 👥 *.menu public* - Menu Public
├ 🏘️ *.menu group* - Menu Group
├ 🎯 *.menu reaction* - Menu Reaction
├ ⚙️ *.menu all* - Semua Fitur
│
╰────────────────────────╯

🌟 *Developer:* Bang Wily
📢 *Channel:* ${linkSaluran}`;

        } else if (category === 'all') {
            // Menu all - tampilkan semua fitur dengan status
            const reactionStatus = config.reaction?.enabled ? 'ON' : 'OFF';
            const reactionMode = config.reaction?.mode?.toUpperCase() || 'AUTO';
            const reactionDelay = config.reaction?.delay || 1;
            const onlineStatus = config.autoOnline?.enabled ? 'ON' : 'OFF';
            const typingStatus = config.autoTyping?.enabled ? 'ON' : 'OFF';
            const recordStatus = config.autoRecord?.enabled ? 'ON' : 'OFF';
            const autobioStatus = config.autoBio?.enabled ? 'ON' : 'OFF';
            const welcomeStatus = config.WELCOME_ENABLED ? 'ON' : 'OFF';
            const goodbyeStatus = config.GOODBYE_ENABLED ? 'ON' : 'OFF';
            const listchatStatus = config.listchat?.enabled ? 'ON' : 'OFF';
            const levelupStatus = config.levelup?.enabled ? 'ON' : 'OFF';
            const notifgcStatus = config.notifgc?.enabled ? 'ON' : 'OFF';

            caption = `╭═══════════════════╮
║ ⚙️ *SEMUA FITUR BOT* ⚙️ ║
╰═══════════════════╯

🛡️ *OWNER AUTO FEATURES*
├ *.reaction* - ${reactionStatus} (${reactionMode})
├ *.online* - ${onlineStatus}
├ *.typing* - ${typingStatus}
├ *.record* - ${recordStatus}
├ *.autobio* - ${autobioStatus}
├ *.mode* - ${config.mode?.toUpperCase()}

📦 *BACKUP & MAINTENANCE*
├ *.backupsc* - Backup Source Code
├ *.backupsesi* - Backup Session Data
├ *.clearsesi* - Clear Session Data

🎯 *REACTION CONTROL SYSTEM*
├ *.reaction* - Status & control panel
├ *.reaction on* - Mode selalu reaksi
├ *.reaction off* - Mode tanpa reaksi  
├ *.reaction random* - Mode random (50%)
├ *.reaction delay [1-10]* - Set kecepatan (${reactionDelay}s)
├ *.reaction set* - Pilih kategori emoji
├ *.reaction matikan* - Nonaktifkan sistem

🎉 *WELCOME SYSTEM*
├ *.welcome* - ${welcomeStatus}
├ *.welcome on/off* - Toggle welcome
├ *.welcome add* - Add grup welcome
├ *.welcome addlink* - Add via link
├ *.welcome list* - List grup welcome
├ *.welcome del* - Delete grup welcome
├ *.welcome all* - All groups mode

👋 *GOODBYE SYSTEM*  
├ *.goodbye* - ${goodbyeStatus}
├ *.goodbye on/off* - Toggle goodbye
├ *.goodbye add* - Add grup goodbye
├ *.goodbye addlink* - Add via link
├ *.goodbye list* - List grup goodbye
├ *.goodbye del* - Delete grup goodbye
├ *.goodbye all* - All groups mode

📊 *TRACKING & LEVEL SYSTEM*
├ *.listchat* - ${listchatStatus}
├ *.listchat on/off* - Toggle chat tracking
├ *.listchat add* - Add grup tracking
├ *.listchat del* - Delete grup tracking
├ *.listchat all* - Track all groups
├ *.levelup* - ${levelupStatus}
├ *.levelup on/off* - Toggle level system
├ *.level* - Check level user

🔔 *NOTIFICATION SYSTEM*
├ *.notifgc* - ${notifgcStatus}
├ *.notifgc on/off* - Toggle notifikasi grup

👥 *PUBLIC FEATURES*
├ *.menu* - Menu utama
├ *.menu owner* - Menu owner (Owner only)
├ *.menu public* - Menu public
├ *.menu group* - Menu group
├ *.menu reaction* - Menu reaction
├ *.menu all* - Menu semua fitur

🌟 *Developer:* Bang Wily`;

        } else if (category === 'owner') {
            // Menu khusus owner
            if (!isOwnerUser) {
                await Wily('🚫 *Maaf, menu ini khusus untuk Owner Bot*\n\n💡 Gunakan *.menu public* untuk melihat fitur yang tersedia\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
                return;
            }

            caption = `╭═══════════════════╮
║ 👑 *OWNER FEATURES* 👑 ║
╰═══════════════════╯

🛡️ *FITUR KHUSUS OWNER*
┌────────────────────────┐

🎯 *AUTO FEATURES*
├ *.reaction* {OWNER} - Kelola Auto Reaction Story
├ *.online* {OWNER} - Kelola Auto Online Status  
├ *.typing* {OWNER} - Kelola Auto Typing
├ *.record* {OWNER} - Kelola Auto Record
├ *.autobio* {OWNER} - Kelola Auto Bio

⚙️ *BOT MANAGEMENT*
├ *.mode* {OWNER} - Ubah Mode Bot (Self/Public)
├ *.backupsc* {OWNER} - Backup Source Code
├ *.backupsesi* {OWNER} - Backup Session Data
├ *.clearsesi* {OWNER} - Clear Session Data

🏘️ *GROUP MANAGEMENT*
├ *.welcome* {OWNER} - Kelola Welcome Message
├ *.goodbye* {OWNER} - Kelola Goodbye Message
├ *.notifgc* {OWNER} - Kelola Notifikasi Grup

📊 *TRACKING & LEVEL*
├ *.listchat* {OWNER} - Tracking Chat Anggota
├ *.levelup* {OWNER} - Kelola Level System

└────────────────────────┘

╭─── 📝 *CARA PENGGUNAAN* ───╮
│
├ 🔸 *.reaction on/off* - Aktifkan/Nonaktifkan
├ 🔸 *.online on/off* - Aktifkan/Nonaktifkan  
├ 🔸 *.typing on/off* - Aktifkan/Nonaktifkan
├ 🔸 *.record on/off* - Aktifkan/Nonaktifkan
├ 🔸 *.autobio on/off* - Aktifkan/Nonaktifkan
├ 🔸 *.mode self/public* - Ubah Mode
├ 🔸 *.welcome on/off* - Aktifkan/Nonaktifkan
├ 🔸 *.goodbye on/off* - Aktifkan/Nonaktifkan
├ 🔸 *.listchat on/off* - Aktifkan/Nonaktifkan
├ 🔸 *.levelup on/off* - Aktifkan/Nonaktifkan
├ 🔸 *.backupsc* - Backup Script
├ 🔸 *.backupsesi* - Backup Session
├ 🔸 *.clearsesi* - Clear Session
├ 🔸 *.notifgc on/off* - Notifikasi Grup
│
╰─────────────────────────╯

⚡ *Status:* Owner Access Granted
👑 *Developer:* Bang Wily`;

        } else if (category === 'public') {
            // Menu untuk public (semua user)
            caption = `╭═══════════════════╮
║ 👥 *PUBLIC FEATURES* 👥 ║
╰═══════════════════╯

🌐 *FITUR UNTUK SEMUA*
┌────────────────────────┐

📱 *INFO BOT*
├ *.menu* - Tampilkan Menu Utama
├ *.menu owner* - Menu Owner (Owner Only)
├ *.menu public* - Menu Public (This Menu)
├ *.menu all* - Semua Fitur

💬 *INTERAKSI*
├ *Auto Read Story* - Bot otomatis baca story
├ *Auto Reaction* - Bot beri reaksi story
${config.mode === 'public' ? '├ *Chat Response* - Bot respon chat\n' : ''}
└────────────────────────┘

╭─── ℹ️ *INFORMASI BOT* ───╮
│
├ 🤖 *Nama:* ${namaBot}
├ ⏱️ *Runtime:* ${runtime}
├ 🔰 *Mode:* ${config.mode?.toUpperCase() || 'SELF'}
├ 📱 *Bot Number:* ${botNumber}
${isOwnerUser ? '├ 👑 *Status:* Owner\n' : '├ 👤 *Status:* User\n'}
╰─────────────────────────╯

${config.mode === 'self' ? '⚠️ *Note:* Bot dalam mode SELF\n📝 Hanya Owner yang bisa gunakan fitur command\n\n' : ''}💡 *Tip:* Bot ini otomatis membaca dan bereaksi pada story WhatsApp
🌟 *Developer:* Bang Wily`;

        } else if (category === 'group') {
            // Menu untuk fitur grup
            const welcomeStatus = config.WELCOME_ENABLED ? 'ON' : 'OFF';
            const goodbyeStatus = config.GOODBYE_ENABLED ? 'ON' : 'OFF';
            const notifgcStatus = config.notifGroupChange?.enabled ? 'ON' : 'OFF';
            
            caption = `╭═══════════════════╮
║ 🏘️ *GROUP FEATURES* 🏘️ ║
╰═══════════════════╯

🏘️ *FITUR GRUP CHAT*
┌────────────────────────┐

📱 *MANAGEMENT*
├ *.menu* - Menu utama
├ *.menu owner* - Menu owner (Owner only)
├ *.menu public* - Menu public
├ *.menu group* - Menu group (This menu)

🎉 *WELCOME SYSTEM*
├ *.welcome* {OWNER} - Kelola Welcome Message
├ *.welcome on/off* - Aktifkan/Nonaktifkan
├ *.welcome add* - Tambah grup ke welcome list
├ *.welcome list* - Lihat daftar grup welcome
├ *.welcome del* - Hapus grup dari welcome

👋 *GOODBYE SYSTEM*
├ *.goodbye* {OWNER} - Kelola Goodbye Message  
├ *.goodbye on/off* - Aktifkan/Nonaktifkan
├ *.goodbye add* - Tambah grup ke goodbye list
├ *.goodbye list* - Lihat daftar grup goodbye
├ *.goodbye del* - Hapus grup dari goodbye

🔔 *NOTIFICATION SYSTEM*
├ *.notifgc* {OWNER} - Kelola Notifikasi Grup
├ *.notifgc on/off* - Aktifkan/Nonaktifkan notif perubahan

💬 *GROUP INTERACTION*
├ *Auto Read Story* - Bot baca story member
├ *Auto Reaction* - Bot reaksi story member
${config.mode === 'public' ? '├ *Group Response* - Bot respon di grup\n' : ''}
└────────────────────────┘

╭─── 📊 *STATUS FITUR GRUP* ───╮
│
├ 🎉 *Welcome:* ${welcomeStatus} ${config.WELCOME_ENABLED ? '✅' : '❌'}
├ 👋 *Goodbye:* ${goodbyeStatus} ${config.GOODBYE_ENABLED ? '✅' : '❌'}
├ 🔔 *Notif Grup:* ${notifgcStatus} ${config.notifGroupChange?.enabled ? '✅' : '❌'}
├ 🤖 *Bot:* ${namaBot}
├ ⏱️ *Runtime:* ${runtime}
├ 🔰 *Mode:* ${config.mode?.toUpperCase() || 'SELF'}
├ 📱 *Bot Number:* ${botNumber}
${isOwnerUser ? '├ 👑 *Status:* Owner Access\n' : '├ 👤 *Status:* Member\n'}
╰─────────────────────────╯

${config.mode === 'self' ? '⚠️ *Note:* Bot dalam mode SELF\n📝 Hanya Owner yang bisa gunakan command welcome/goodbye\n\n' : ''}💡 *Tip:* Welcome/Goodbye otomatis untuk member join/leave
🌟 *Developer:* Bang Wily`;

        } else if (category === 'reaction') {
            // Menu untuk reaction control
            caption = `╭═══════════════════╮
║ 🎯 *REACTION MENU* 🎯 ║
╰═══════════════════╯

🎯 *REACTION CONTROL*
┌────────────────────────┐

⚡ *QUICK COMMANDS*
${isOwnerUser ? '├ *.reaction on* - Aktifkan auto reaction\n├ *.reaction off* - Nonaktifkan auto reaction\n├ *.reaction random* - Mode random reaction\n├ *.reaction delay [1-10]* - Set delay reaction\n' : '├ *Auto Reaction* - Otomatis memberikan reaksi\n├ *Smart Timing* - Waktu reaksi yang natural\n'}
└────────────────────────┘

╭─── 📋 *INFO REACTION* ───╮
│
├ 🎭 *Mode:* ${config.reaction?.mode?.toUpperCase() || 'AUTO'}
├ ⏱️ *Delay:* ${config.reaction?.delay || 10} detik
├ 🎯 *Status:* ${config.reaction?.enabled ? 'AKTIF' : 'NONAKTIF'}
${isOwnerUser ? '├ 👑 *Control:* Full Access\n' : '├ 👤 *Control:* View Only\n'}
╰─────────────────────────╯

${!isOwnerUser ? '🔒 *Note:* Control reaction hanya untuk Owner\n📝 User hanya dapat melihat status reaction\n\n' : ''}💡 *Tip:* Reaction otomatis untuk story WhatsApp
🌟 *Developer:* Bang Wily`;
        }

        // Buat template message
        const menuTemplate = createMenuTemplate({
            caption: caption,
            ucapanWaktu: ucapanWaktu,
            namaBot: namaBot,
            namabot: "Auto Read Story WhatsApp Bot by Bang Wily",
            linkSaluran: linkSaluran,
            thumbImage: thumbImage,
            senderName: senderName,
            runtime: runtime
        });

        // Kirim message
        await hisoka.sendMessage(m.key.remoteJid, menuTemplate, { 
            quoted: m,
            contextInfo: menuTemplate.contextInfo
        });

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export default
export default handleMenuCommand;

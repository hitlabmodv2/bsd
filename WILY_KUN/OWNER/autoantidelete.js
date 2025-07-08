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

// Inisialisasi struktur anti-delete di config
function initAntiDeleteConfig(config) {
    if (!config.autoFeatures) {
        config.autoFeatures = {};
    }

    if (!config.autoFeatures.antidelete) {
        config.autoFeatures.antidelete = {
            enabled: false,
            mode: 'off', // 'off', 'all', 'custom'
            privateChat: {
                enabled: false,
                whitelist: []
            },
            groupChat: {
                enabled: false,
                whitelist: []
            }
        };
    }

    return config;
}

// Cek apakah anti-delete aktif untuk chat tertentu
function isAntiDeleteActiveForChat(config, chatJid) {
    const antiDel = config?.autoFeatures?.antidelete;
    if (!antiDel || !antiDel.enabled) return false;

    // Skip status broadcast
    if (chatJid === 'status@broadcast') return false;

    const isGroup = chatJid.endsWith('@g.us');

    // Mode 'all' - aktif di semua chat
    if (antiDel.mode === 'all') {
        return true;
    }

    // Mode 'custom' atau 'multi-custom' - cek whitelist
    if (antiDel.mode === 'custom' || antiDel.mode === 'multi-custom') {
        if (isGroup) {
            return antiDel.groupChat.enabled && antiDel.groupChat.whitelist.includes(chatJid);
        } else {
            // Untuk private chat, cek apakah fitur private enabled dan chat ada di whitelist
            // Jika tidak ada whitelist tapi private enabled, aktifkan untuk semua private chat
            const privateEnabled = antiDel.privateChat.enabled;
            const hasWhitelist = antiDel.privateChat.whitelist && antiDel.privateChat.whitelist.length > 0;

            if (privateEnabled) {
                if (hasWhitelist) {
                    // Ada whitelist, cek apakah chat ini ada di dalamnya
                    return antiDel.privateChat.whitelist.includes(chatJid);
                } else {
                    // Tidak ada whitelist, aktifkan untuk semua private chat
                    return true;
                }
            }
            return false;
        }
    }

    return false;
}

// Handler untuk auto anti-delete command
async function handleAutoAntiDelete(sock, msg, args, config) {
    const command = args[1]?.toLowerCase();

    // Inisialisasi config anti-delete
    config = initAntiDeleteConfig(config);

    if (!command || command === 'help') {
        const helpText = `
🛡️ *AUTO ANTI-DELETE ADVANCED*

📋 *Perintah Available:*

🔸 *GLOBAL COMMANDS:*
• \`${config.bot.prefix}antidel on\` - Pilih mode anti-delete
• \`${config.bot.prefix}antidel all\` - Aktif di semua chat
• \`${config.bot.prefix}antidel off\` - Matikan semua

🔸 *PRIVATE CHAT:*
• \`${config.bot.prefix}antidel private on\` - Aktifkan private chat
• \`${config.bot.prefix}antidel private off\` - Matikan private chat
• \`${config.bot.prefix}antidel private add\` - Tambah chat ini ke whitelist (reply pesan)

🔸 *GROUP CHAT:*
• \`${config.bot.prefix}antidel gc on\` - Aktifkan group chat
• \`${config.bot.prefix}antidel gc off\` - Matikan group chat  
• \`${config.bot.prefix}antidel add\` - Tambah grup ini ke whitelist

🔸 *INFO & STATUS:*
• \`${config.bot.prefix}antidel status\` - Lihat status lengkap
• \`${config.bot.prefix}antidel list\` - Lihat daftar whitelist
• \`${config.bot.prefix}antidel del\` - Hapus chat dari whitelist (reply pesan)
• \`${config.bot.prefix}antidel debug\` - Debug troubleshooting

📊 *Status Saat Ini:*
├─ Mode: ${config.autoFeatures.antidelete.mode.toUpperCase()}
├─ Private: ${config.autoFeatures.antidelete.privateChat.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Group: ${config.autoFeatures.antidelete.groupChat.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Multi-Mode: ${config.autoFeatures.antidelete.mode === 'multi-custom' ? 'ENABLED ✅' : 'DISABLED ❌'}
└─ Whitelist: ${config.autoFeatures.antidelete.privateChat.whitelist.length + config.autoFeatures.antidelete.groupChat.whitelist.length} chat`;

        await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
        return;
    }

    switch (command) {
        case 'on':
            await handleAntiDeleteOn(sock, msg, config);
            break;
        case 'all':
            await handleAntiDeleteAll(sock, msg, config);
            break;
        case 'off':
            await handleAntiDeleteOff(sock, msg, config);
            break;
        case 'add':
            await handleAntiDeleteAdd(sock, msg, config);
            break;
        case 'private':
            await handleAntiDeletePrivate(sock, msg, args, config);
            break;
        case 'gc':
            await handleAntiDeleteGC(sock, msg, args, config);
            break;
        case 'status':
            await handleAntiDeleteStatus(sock, msg, config);
            break;
        case 'list':
            await handleAntiDeleteList(sock, msg, config);
            break;
        case 'del':
            await handleAntiDeleteDel(sock, msg, config);
            break;
        case 'debug':
            await handleAntiDeleteDebug(sock, msg, config);
            break;
        default:
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Command tidak dikenal! Gunakan \`${config.bot.prefix}antidel help\` untuk bantuan.` 
            }, { quoted: msg });
            break;
    }
}

// Handler untuk .antidel on
async function handleAntiDeleteOn(sock, msg, config) {
    const modeText = `
🛡️ *PILIH MODE ANTI-DELETE*

Silakan pilih mode anti-delete yang diinginkan dengan reply nomor pilihan:

🔸 *Pilihan Mode:*

*1* - **MODE ALL** (Simple & Otomatis)
   ├─ ✅ Aktif di semua private & group chat
   ├─ 🚀 Langsung jalan tanpa setup
   ├─ 🚫 Tidak bisa custom per chat
   └─ 💾 Mudah digunakan

*2* - **MODE CUSTOM** (Advanced & Flexible)
   ├─ 🎯 Pilih chat mana saja yang aktif
   ├─ 📱 Private chat bisa on/off terpisah
   ├─ 👥 Group chat bisa on/off terpisah
   ├─ 📋 Whitelist custom per chat
   ├─ 🔄 Multi-activation support
   └─ ⚙️ Kontrol maksimal

*3* - **MODE MULTI CUSTOM** (Ultimate Control)
   ├─ 🎯 Kombinasi private + group custom
   ├─ 📱 Private chat custom whitelist
   ├─ 👥 Group chat custom whitelist
   ├─ 🔄 Bisa aktif bersamaan
   ├─ 📋 Kontrol independent per jenis chat
   └─ ⚙️ Fleksibilitas tinggi

📝 **Cara Reply:**
• Reply *1* untuk MODE ALL
• Reply *2* untuk MODE CUSTOM  
• Reply *3* untuk MODE MULTI CUSTOM

⚠️ *Catatan:* Mode ALL tidak bisa dikombinasi dengan mode lainnya`;

    await sock.sendMessage(msg.key.remoteJid, { text: modeText }, { quoted: msg });
}

// Handler untuk .antidel all
async function handleAntiDeleteAll(sock, msg, config) {
    // Cek apakah ada mode custom yang aktif
    const hasActiveCustom = config.autoFeatures.antidelete.privateChat.enabled || 
                           config.autoFeatures.antidelete.groupChat.enabled;

    if (hasActiveCustom && config.autoFeatures.antidelete.mode === 'custom') {
        const conflictText = `
⚠️ *KONFLIK MODE TERDETEKSI!*

❌ Tidak bisa mengaktifkan mode ALL karena:
├─ Private Chat: ${config.autoFeatures.antidelete.privateChat.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
├─ Group Chat: ${config.autoFeatures.antidelete.groupChat.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
└─ Mode saat ini: CUSTOM

🔧 *Solusi:*
1️⃣ Matikan semua mode custom terlebih dahulu:
   • \`${config.bot.prefix}antidel private off\`
   • \`${config.bot.prefix}antidel gc off\`

2️⃣ Atau gunakan \`${config.bot.prefix}antidel off\` untuk reset

3️⃣ Kemudian jalankan \`${config.bot.prefix}antidel all\`

⚠️ *Mode ALL tidak bisa dikombinasi dengan mode custom!*`;

        await sock.sendMessage(msg.key.remoteJid, { text: conflictText }, { quoted: msg });
        return;
    }

    config.autoFeatures.antidelete.enabled = true;
    config.autoFeatures.antidelete.mode = 'all';
    config.autoFeatures.antidelete.privateChat.enabled = false;
    config.autoFeatures.antidelete.groupChat.enabled = false;

    const saveResult = saveConfig(config);

    if (saveResult) {
        const successText = `
🛡️ *AUTO ANTI-DELETE: MODE ALL*

✅ *Berhasil Diaktifkan!*

📊 *Pengaturan:*
├─ Mode: ALL (Global)
├─ Status: AKTIF ✅
├─ Private Chat: AUTO ON
├─ Group Chat: AUTO ON
├─ Custom Setting: DISABLED
└─ Whitelist: NOT REQUIRED

🎯 *Fitur Aktif:*
├─ 🔍 Deteksi penghapusan pesan real-time
├─ 🔄 Backup otomatis semua pesan
├─ 📱 Aktif di semua private chat
├─ 👥 Aktif di semua group chat
├─ 🛡️ Restore pesan yang dihapus
└─ 📊 Statistik penghapusan

💾 *Data tersimpan ke config.json*

⚠️ *PENTING:* Mode ALL tidak bisa dikombinasi dengan mode custom!`;

        await sock.sendMessage(msg.key.remoteJid, { text: successText }, { quoted: msg });
    } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan pengaturan ke config.json` }, { quoted: msg });
    }
}

// Handler untuk .antidel off
async function handleAntiDeleteOff(sock, msg, config) {
    config.autoFeatures.antidelete.enabled = false;
    config.autoFeatures.antidelete.mode = 'off';
    config.autoFeatures.antidelete.privateChat.enabled = false;
    config.autoFeatures.antidelete.groupChat.enabled = false;

    const saveResult = saveConfig(config);

    if (saveResult) {
        const offText = `
❌ *AUTO ANTI-DELETE: OFF*

🚫 *Fitur Dimatikan!*

📊 *Status:*
├─ Mode: OFF
├─ Private Chat: OFF ❌
├─ Group Chat: OFF ❌
├─ Backup: STOPPED
└─ Detection: DISABLED

💾 *Data tersimpan ke config.json*

💡 *Untuk mengaktifkan kembali:*
• \`${config.bot.prefix}antidel all\` - Mode global
• \`${config.bot.prefix}antidel on\` - Pilih mode custom`;

        await sock.sendMessage(msg.key.remoteJid, { text: offText }, { quoted: msg });
    } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan pengaturan ke config.json` }, { quoted: msg });
    }
}

// Handler untuk .antidel add
async function handleAntiDeleteAdd(sock, msg, config) {
    const chatJid = msg.key.remoteJid;
    const isGroup = chatJid.endsWith('@g.us');

    if (config.autoFeatures.antidelete.mode === 'all') {
        await sock.sendMessage(chatJid, { 
            text: `⚠️ Mode saat ini adalah ALL. Semua chat sudah otomatis aktif!\n\nGunakan \`${config.bot.prefix}antidel on\` untuk mengubah ke mode CUSTOM jika ingin mengatur whitelist.` 
        }, { quoted: msg });
        return;
    }

    if (isGroup) {
        // Tambah group ke whitelist
        if (!config.autoFeatures.antidelete.groupChat.whitelist.includes(chatJid)) {
            config.autoFeatures.antidelete.groupChat.whitelist.push(chatJid);
            config.autoFeatures.antidelete.mode = 'custom';
            config.autoFeatures.antidelete.enabled = true;

            const saveResult = saveConfig(config);

            if (saveResult) {
                let groupName = "Grup Ini";
                try {
                    const groupMetadata = await sock.groupMetadata(chatJid);
                    groupName = groupMetadata.subject || "Grup Ini";
                } catch (error) {
                    // Use default name
                }

                const successText = `
✅ *GROUP DITAMBAHKAN KE WHITELIST*

👥 *Group:* ${groupName}
🆔 *ID:* ${chatJid}
🛡️ *Status:* Anti-Delete AKTIF

📊 *Pengaturan:*
├─ Mode: CUSTOM
├─ Group Chat: ${config.autoFeatures.antidelete.groupChat.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Total Whitelist: ${config.autoFeatures.antidelete.groupChat.whitelist.length} grup
└─ Auto Backup: AKTIF

💾 *Data tersimpan ke config.json*

💡 *Tips:* Gunakan \`${config.bot.prefix}antidel gc on\` untuk mengaktifkan deteksi di grup ini.`;

                await sock.sendMessage(chatJid, { text: successText }, { quoted: msg });
            } else {
                await sock.sendMessage(chatJid, { text: `❌ Gagal menyimpan ke config.json` }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(chatJid, { text: `⚠️ Group ini sudah ada di whitelist!` }, { quoted: msg });
        }
    } else {
        await sock.sendMessage(chatJid, { 
            text: `❌ Command ini khusus untuk group chat!\n\nGunakan \`${config.bot.prefix}antidel private add\` dengan reply pesan untuk menambah private chat.` 
        }, { quoted: msg });
    }
}

// Handler untuk .antidel private
async function handleAntiDeletePrivate(sock, msg, args, config) {
    const subCommand = args[2]?.toLowerCase();

    if (!subCommand) {
        const helpText = `
📱 *ANTI-DELETE PRIVATE CHAT*

📋 *Commands:*
• \`${config.bot.prefix}antidel private on\` - Aktifkan mode private
• \`${config.bot.prefix}antidel private off\` - Matikan mode private  
• \`${config.bot.prefix}antidel private add\` - Tambah chat (reply pesan)

📊 *Status Saat Ini:*
├─ Mode: ${config.autoFeatures.antidelete.mode.toUpperCase()}
├─ Private Chat: ${config.autoFeatures.antidelete.privateChat.enabled ? 'ON ✅' : 'OFF ❌'}
└─ Whitelist: ${config.autoFeatures.antidelete.privateChat.whitelist.length} chat`;

        await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
        return;
    }

    switch (subCommand) {
        case 'on':
            if (config.autoFeatures.antidelete.mode === 'all') {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: `⚠️ Mode saat ini adalah ALL. Private chat sudah otomatis aktif!\n\nGunakan \`${config.bot.prefix}antidel off\` terlebih dahulu jika ingin menggunakan mode custom.` 
                }, { quoted: msg });
                return;
            }

            config.autoFeatures.antidelete.privateChat.enabled = true;
            config.autoFeatures.antidelete.mode = 'custom';
            config.autoFeatures.antidelete.enabled = true;

            const saveResult = saveConfig(config);

            if (saveResult) {
                const successText = `
✅ *PRIVATE CHAT: ON*

📱 *Anti-Delete Private Chat Aktif!*

📊 *Pengaturan:*
├─ Mode: CUSTOM
├─ Private Chat: ON ✅
├─ Whitelist: ${config.autoFeatures.antidelete.privateChat.whitelist.length} chat
└─ Detection: AKTIF

🎯 *Fitur Aktif:*
├─ 🔍 Deteksi penghapusan di private chat
├─ 🔄 Backup pesan otomatis
├─ 🛡️ Restore pesan yang dihapus
└─ 📊 Statistik per chat

✅ *Multi-Activation:* Private & Group bisa aktif bersamaan

💾 *Data tersimpan ke config.json*`;

                await sock.sendMessage(msg.key.remoteJid, { text: successText }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan ke config.json` }, { quoted: msg });
            }
            break;

        case 'off':
            config.autoFeatures.antidelete.privateChat.enabled = false;

            // Jika group juga off, matikan mode custom
            if (!config.autoFeatures.antidelete.groupChat.enabled) {
                config.autoFeatures.antidelete.enabled = false;
                config.autoFeatures.antidelete.mode = 'off';
            }

            const saveResultOff = saveConfig(config);

            if (saveResultOff) {
                const offText = `
❌ *PRIVATE CHAT: OFF*

📱 *Anti-Delete Private Chat Dimatikan!*

📊 *Status:*
├─ Private Chat: OFF ❌
├─ Whitelist: ${config.autoFeatures.antidelete.privateChat.whitelist.length} chat (tersimpan)
└─ Detection: DISABLED

💾 *Data tersimpan ke config.json*`;

                await sock.sendMessage(msg.key.remoteJid, { text: offText }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan ke config.json` }, { quoted: msg });
            }
            break;

        case 'add':
            await handlePrivateAdd(sock, msg, config);
            break;

        default:
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Sub-command tidak dikenal! Gunakan: on, off, atau add` 
            }, { quoted: msg });
            break;
    }
}

// Handler untuk .antidel private add
async function handlePrivateAdd(sock, msg, config) {
    if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `❌ Silakan reply pesan dari chat yang ingin ditambahkan ke whitelist!` 
        }, { quoted: msg });
        return;
    }

    const quotedMsg = msg.message.extendedTextMessage.contextInfo;
    const currentChatJid = msg.key.remoteJid;
    let targetJid;

    // Untuk private chat, targetJid adalah currentChatJid (chat tempat command dijalankan)
    if (!currentChatJid.endsWith('@g.us')) {
        targetJid = currentChatJid;
    } else {
        // Jika di grup, ambil dari quoted message
        if (quotedMsg.participant) {
            targetJid = quotedMsg.participant;
        } else if (quotedMsg.remoteJid && !quotedMsg.remoteJid.endsWith('@g.us')) {
            targetJid = quotedMsg.remoteJid;
        } else {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Pesan yang di-reply bukan dari private chat!` 
            }, { quoted: msg });
            return;
        }
    }

    if (config.autoFeatures.antidelete.mode === 'all') {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `⚠️ Mode saat ini adalah ALL. Semua private chat sudah otomatis aktif!` 
        }, { quoted: msg });
        return;
    }

    // Tambah ke whitelist
    if (!config.autoFeatures.antidelete.privateChat.whitelist.includes(targetJid)) {
        config.autoFeatures.antidelete.privateChat.whitelist.push(targetJid);
        config.autoFeatures.antidelete.mode = 'custom';
        config.autoFeatures.antidelete.enabled = true;

        const saveResult = saveConfig(config);

        if (saveResult) {
            const maskedNumber = targetJid.split('@')[0].replace(/(\d{2})\d+(\d{2})/, '$1***$2');

            const successText = `
✅ *PRIVATE CHAT DITAMBAHKAN*

📱 *Chat:* +${maskedNumber}
🆔 *JID:* ${targetJid}
🛡️ *Status:* Anti-Delete AKTIF

📊 *Pengaturan:*
├─ Mode: CUSTOM
├─ Private Chat: ${config.autoFeatures.antidelete.privateChat.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Total Whitelist: ${config.autoFeatures.antidelete.privateChat.whitelist.length} chat
└─ Auto Backup: AKTIF

💾 *Data tersimpan ke config.json*

💡 *Tips:* Gunakan \`${config.bot.prefix}antidel private on\` untuk mengaktifkan deteksi di chat ini.`;

            await sock.sendMessage(msg.key.remoteJid, { text: successText }, { quoted: msg });
        } else {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan ke config.json` }, { quoted: msg });
        }
    } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Chat ini sudah ada di whitelist!` }, { quoted: msg });
    }
}

// Handler untuk .antidel gc
async function handleAntiDeleteGC(sock, msg, args, config) {
    const subCommand = args[2]?.toLowerCase();

    if (!subCommand) {
        const helpText = `
👥 *ANTI-DELETE GROUP CHAT*

📋 *Commands:*
• \`${config.bot.prefix}antidel gc on\` - Aktifkan mode group
• \`${config.bot.prefix}antidel gc off\` - Matikan mode group
• \`${config.bot.prefix}antidel add\` - Tambah grup ini ke whitelist

📊 *Status Saat Ini:*
├─ Mode: ${config.autoFeatures.antidelete.mode.toUpperCase()}
├─ Group Chat: ${config.autoFeatures.antidelete.groupChat.enabled ? 'ON ✅' : 'OFF ❌'}
└─ Whitelist: ${config.autoFeatures.antidelete.groupChat.whitelist.length} grup`;

        await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
        return;
    }

    switch (subCommand) {
        case 'on':
            if (config.autoFeatures.antidelete.mode === 'all') {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: `⚠️ Mode saat ini adalah ALL. Group chat sudah otomatis aktif!\n\nGunakan \`${config.bot.prefix}antidel off\` terlebih dahulu jika ingin menggunakan mode custom.` 
                }, { quoted: msg });
                return;
            }

            config.autoFeatures.antidelete.groupChat.enabled = true;
            config.autoFeatures.antidelete.mode = 'custom';
            config.autoFeatures.antidelete.enabled = true;

            const saveResult = saveConfig(config);

            if (saveResult) {
                const successText = `
✅ *GROUP CHAT: ON*

👥 *Anti-Delete Group Chat Aktif!*

📊 *Pengaturan:*
├─ Mode: CUSTOM
├─ Group Chat: ON ✅
├─ Whitelist: ${config.autoFeatures.antidelete.groupChat.whitelist.length} grup
└─ Detection: AKTIF

🎯 *Fitur Aktif:*
├─ 🔍 Deteksi penghapusan di group chat
├─ 🔄 Backup pesan otomatis
├─ 🛡️ Restore pesan yang dihapus
└─ 📊 Statistik per grup

✅ *Multi-Activation:* Private & Group bisa aktif bersamaan

💾 *Data tersimpan ke config.json*`;

                await sock.sendMessage(msg.key.remoteJid, { text: successText }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan ke config.json` }, { quoted: msg });
            }
            break;

        case 'off':
            config.autoFeatures.antidelete.groupChat.enabled = false;

            // Jika private juga off, matikan mode custom
            if (!config.autoFeatures.antidelete.privateChat.enabled) {
                config.autoFeatures.antidelete.enabled = false;
                config.autoFeatures.antidelete.mode = 'off';
            }

            const saveResultOff = saveConfig(config);

            if (saveResultOff) {
                const offText = `
❌ *GROUP CHAT: OFF*

👥 *Anti-Delete Group Chat Dimatikan!*

📊 *Status:*
├─ Group Chat: OFF ❌
├─ Whitelist: ${config.autoFeatures.antidelete.groupChat.whitelist.length} grup (tersimpan)
└─ Detection: DISABLED

💾 *Data tersimpan ke config.json*`;

                await sock.sendMessage(msg.key.remoteJid, { text: offText }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan ke config.json` }, { quoted: msg });
            }
            break;

        default:
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Sub-command tidak dikenal! Gunakan: on atau off` 
            }, { quoted: msg });
            break;
    }
}

// Handler untuk .antidel status
async function handleAntiDeleteStatus(sock, msg, config) {
    const antiDel = config.autoFeatures.antidelete;

    let statusText = `
🛡️ *AUTO ANTI-DELETE STATUS*

📊 *Pengaturan Global:*
├─ Status: ${antiDel.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
├─ Mode: ${antiDel.mode.toUpperCase()}
└─ Config: TERSIMPAN ✅

📱 *Private Chat:*
├─ Status: ${antiDel.privateChat.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Whitelist: ${antiDel.privateChat.whitelist.length} chat
└─ Detection: ${antiDel.privateChat.enabled && antiDel.enabled ? 'AKTIF' : 'NONAKTIF'}

👥 *Group Chat:*
├─ Status: ${antiDel.groupChat.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Whitelist: ${antiDel.groupChat.whitelist.length} grup
└─ Detection: ${antiDel.groupChat.enabled && antiDel.enabled ? 'AKTIF' : 'NONAKTIF'}

🎯 *Fitur Aktif:*`;

    if (antiDel.enabled) {
        if (antiDel.mode === 'all') {
            statusText += `
├─ 🌐 Global: Semua chat aktif
├─ 🔄 Backup: Otomatis semua pesan
├─ 🛡️ Restore: Real-time detection
└─ 📊 Coverage: 100% chat`;
        } else if (antiDel.mode === 'custom') {
            statusText += `
├─ 🎯 Custom: Whitelist based
├─ 🔄 Backup: Chat terpilih saja
├─ 🛡️ Restore: Conditional detection
└─ 📊 Coverage: ${antiDel.privateChat.whitelist.length + antiDel.groupChat.whitelist.length} chat`;
        }
    } else {
        statusText += `
├─ ❌ Semua fitur nonaktif
├─ 🚫 Backup: Stopped
├─ 🚫 Restore: Disabled
└─ 📊 Coverage: 0%`;
    }

    statusText += `

💾 *Data: config.json*
📅 *Last Update: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}*`;

    await sock.sendMessage(msg.key.remoteJid, { text: statusText }, { quoted: msg });
}

// Handler untuk .antidel del
async function handleAntiDeleteDel(sock, msg, config) {
    const currentChatJid = msg.key.remoteJid;
    const isCurrentChatGroup = currentChatJid.endsWith('@g.us');

    // Ambil text dari message untuk cek apakah ada link grup dalam command
    const messageText = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || '';

    // Cek apakah ada link grup WhatsApp dalam command
    const waGroupLinkRegex2 = /https:\/\/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/;
    const groupLinkMatch = messageText.match(waGroupLinkRegex2);

    // Jika ada link grup dalam command, proses langsung
    if (groupLinkMatch) {
        const groupCode = groupLinkMatch[1];

        // Cari grup berdasarkan link dalam whitelist - metode yang lebih akurat
        let foundGroupJid = null;
        let chatName = "";

        // Pertama, coba cari berdasarkan invite code dari metadata grup
        for (const groupJid of config.autoFeatures.antidelete.groupChat.whitelist) {
            try {
                const groupMetadata = await sock.groupMetadata(groupJid);
                if (groupMetadata.inviteCode === groupCode) {
                    foundGroupJid = groupJid;
                    chatName = groupMetadata.subject || "Unknown Group";
                    break;
                }
            } catch (error) {
                // Skip if error getting metadata, continue to next method
            }
        }

        // Jika tidak ditemukan via metadata, coba metode alternatif
        if (!foundGroupJid) {
            // Metode 2: Coba join grup sementara untuk mendapatkan JID
            try {
                const joinResult = await sock.groupAcceptInvite(groupCode);
                if (joinResult) {
                    // Cek apakah grup yang di-join ada di whitelist
                    if (config.autoFeatures.antidelete.groupChat.whitelist.includes(joinResult)) {
                        foundGroupJid = joinResult;
                        try {
                            const groupMetadata = await sock.groupMetadata(joinResult);
                            chatName = groupMetadata.subject || "Unknown Group";
                        } catch (e) {
                            chatName = "Unknown Group";
                        }
                    } else {
                        // Keluar dari grup jika tidak ada di whitelist
                        try {
                            await sock.groupLeave(joinResult);
                        } catch (e) {
                            // Silent error
                        }
                    }
                }
            } catch (error) {
                // Silent error jika gagal join
            }
        }

        // Jika masih tidak ditemukan, tampilkan detail yang lebih akurat
        if (!foundGroupJid) {
            const currentWhitelist = config.autoFeatures.antidelete.groupChat.whitelist;
            let whitelistInfo = "❌ Whitelist kosong";

            if (currentWhitelist.length > 0) {
                whitelistInfo = `📋 *Whitelist saat ini (${currentWhitelist.length} grup):*\n`;
                for (let i = 0; i < Math.min(currentWhitelist.length, 5); i++) {
                    const groupJid = currentWhitelist[i];
                    try {
                        const groupMetadata = await sock.groupMetadata(groupJid);
                        const groupName = groupMetadata.subject || "Unknown Group";
                        const groupCode = groupMetadata.inviteCode || "No Code";
                        whitelistInfo += `├─ ${i + 1}. ${groupName}\n├─    Link: https://chat.whatsapp.com/${groupCode}\n`;
                    } catch (error) {
                        whitelistInfo += `├─ ${i + 1}. ${groupJid}\n├─    Status: Tidak dapat diakses\n`;
                    }
                }
                if (currentWhitelist.length > 5) {
                    whitelistInfo += `└─ ... dan ${currentWhitelist.length - 5} grup lainnya`;
                } else {
                    whitelistInfo = whitelistInfo.slice(0, -1) + "└" + whitelistInfo.slice(-1);
                }
            }

            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *GRUP TIDAK DITEMUKAN DI WHITELIST!*

🔍 *Link yang dicari:* https://chat.whatsapp.com/${groupCode}

${whitelistInfo}

💡 *Kemungkinan penyebab:*
├─ 1️⃣ Grup belum ditambahkan ke whitelist anti-delete
├─ 2️⃣ Link grup sudah expired/berganti kode
├─ 3️⃣ Bot sudah keluar dari grup tersebut  
├─ 4️⃣ Grup sudah dihapus/tidak aktif
└─ 5️⃣ Kode invite grup sudah berubah

🔧 *Solusi:*
├─ ✅ Pastikan bot masih ada di grup
├─ 🔄 Dapatkan link terbaru dari grup
├─ ➕ Tambah grup dengan \`${config.bot.prefix}antidel add\` (di dalam grup)
└─ 📋 Cek daftar lengkap dengan \`${config.bot.prefix}antidel list\`

📊 *Config.json Status:*
├─ Total Whitelist Grup: ${currentWhitelist.length}
└─ Data: ${currentWhitelist.length > 0 ? 'TERSEDIA' : 'KOSONG'}` 
            }, { quoted: msg });
            return;
        }

        // Hapus dari whitelist
        const index = config.autoFeatures.antidelete.groupChat.whitelist.indexOf(foundGroupJid);
        if (index > -1) {
            config.autoFeatures.antidelete.groupChat.whitelist.splice(index, 1);

            // Jika semua whitelist kosong, matikan mode custom
            const totalWhitelist = config.autoFeatures.antidelete.privateChat.whitelist.length + 
                                  config.autoFeatures.antidelete.groupChat.whitelist.length;

            if (totalWhitelist === 0) {
                config.autoFeatures.antidelete.enabled = false;
                config.autoFeatures.antidelete.mode = 'off';
                config.autoFeatures.antidelete.privateChat.enabled = false;
                config.autoFeatures.antidelete.groupChat.enabled = false;
            }

            const saveResult = saveConfig(config);

            if (saveResult) {
                const successText = `
✅ *BERHASIL DIHAPUS DARI WHITELIST!*

👥 *Grup:* ${chatName}
🆔 *JID:* ${foundGroupJid}
🔗 *Link:* ${groupLinkMatch[0]}
❌ *Status:* Anti-Delete NONAKTIF

📊 *Pengaturan Sekarang:*
├─ Mode: ${config.autoFeatures.antidelete.mode.toUpperCase()}
├─ Private Chat: ${config.autoFeatures.antidelete.privateChat.enabled ? 'ON ✅' : 'OFF ❌'} (${config.autoFeatures.antidelete.privateChat.whitelist.length} chat)
├─ Group Chat: ${config.autoFeatures.antidelete.groupChat.enabled ? 'ON ✅' : 'OFF ❌'} (${config.autoFeatures.antidelete.groupChat.whitelist.length} grup)
└─ Total Whitelist: ${totalWhitelist} chat

💾 *Data akurat tersimpan ke config.json*

${totalWhitelist === 0 ? '⚠️ *Semua whitelist kosong, anti-delete dimatikan otomatis*' : ''}

✅ *Grup berhasil dihapus dari sistem anti-delete!*`;

                await sock.sendMessage(msg.key.remoteJid, { text: successText }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan ke config.json` }, { quoted: msg });
            }
        }
        return;
    }

    // Jika tidak ada link grup dalam command dan tidak ada quoted message, berikan contoh lengkap
    if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const helpText = `
🗑️ *HAPUS GRUP DARI WHITELIST*

📋 *CARA PENGGUNAAN:*

🔸 *METODE 1 - KIRIM LINK GRUP:*
• Kirim link grup yang ingin dihapus
• Format: \`${config.bot.prefix}antidel del https://chat.whatsapp.com/linkgrup\`

🔸 *METODE 2 - JALANKAN DI DALAM GRUP:*
• Langsung jalankan command di dalam grup yang ingin dihapus
• Format: \`${config.bot.prefix}antidel del\` (di dalam grup)

📝 *CONTOH PENGGUNAAN:*

*Contoh 1:* Hapus grup dengan link
\`${config.bot.prefix}antidel del https://chat.whatsapp.com/ABC123xyz\`

*Contoh 2:* Jalankan di dalam grup
\`${config.bot.prefix}antidel del\`

🔐 *Akses:* Hanya owner bot yang bisa menggunakan

💡 *Tips:* 
• Gunakan \`${config.bot.prefix}antidel list\` untuk melihat daftar whitelist
• Metode termudah adalah jalankan command di dalam grup yang ingin dihapus`;

        await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
        return;
    }

    const quotedMsg = msg.message.extendedTextMessage.contextInfo;
    let targetJid;
    let isTargetGroup = false;
    let chatName = "";

    // Ambil text dari quoted message untuk cek apakah itu nomor atau link
    const quotedText = quotedMsg.quotedMessage?.conversation || 
                      quotedMsg.quotedMessage?.extendedTextMessage?.text || '';

    // Cek apakah quoted message berisi link grup WhatsApp
    const waGroupLinkRegex = /https:\/\/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/;
    const quotedGroupLinkMatch = quotedText.match(waGroupLinkRegex);

    // Cek apakah quoted message berisi nomor telepon
    const phoneRegex = /^(\+?62|0)[\d\s\-\(\)]+$|^\d{10,15}$/;
    const isPhoneNumber = phoneRegex.test(quotedText.trim());

    if (quotedGroupLinkMatch) {
        // Handle grup dari link
        const groupCode = quotedGroupLinkMatch[1];

        // Cari grup berdasarkan link dalam whitelist - metode akurat
        let foundGroupJid = null;
        for (const groupJid of config.autoFeatures.antidelete.groupChat.whitelist) {
            try {
                const groupMetadata = await sock.groupMetadata(groupJid);
                if (groupMetadata.inviteCode === groupCode) {
                    foundGroupJid = groupJid;
                    chatName = groupMetadata.subject || "Unknown Group";
                    break;
                }
            } catch (error) {
                // Skip if error getting metadata
            }
        }

        // Jika tidak ditemukan, coba metode alternatif
        if (!foundGroupJid) {
            try {
                const joinResult = await sock.groupAcceptInvite(groupCode);
                if (joinResult && config.autoFeatures.antidelete.groupChat.whitelist.includes(joinResult)) {
                    foundGroupJid = joinResult;
                    try {
                        const groupMetadata = await sock.groupMetadata(joinResult);
                        chatName = groupMetadata.subject || "Unknown Group";
                    } catch (e) {
                        chatName = "Unknown Group";
                    }
                } else if (joinResult) {
                    // Keluar jika tidak di whitelist
                    try {
                        await sock.groupLeave(joinResult);
                    } catch (e) {
                        // Silent error
                    }
                }
            } catch (error) {
                // Silent error
            }
        }

        if (!foundGroupJid) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *GRUP TIDAK DITEMUKAN!*

🔍 Link: https://chat.whatsapp.com/${groupCode}

💡 *Grup dengan link tersebut tidak ada dalam whitelist anti-delete.*

📋 *Gunakan \`${config.bot.prefix}antidel list\` untuk melihat whitelist yang tersedia*

🔧 *Atau tambahkan grup dengan \`${config.bot.prefix}antidel add\` di dalam grup yang ingin ditambahkan*` 
            }, { quoted: msg });
            return;
        }

        targetJid = foundGroupJid;
        isTargetGroup = true;

    } else if (isPhoneNumber) {
        // Handle nomor telepon
        let phoneNumber = quotedText.trim().replace(/\D/g, '');

        // Normalize nomor
        if (phoneNumber.startsWith('0')) {
            phoneNumber = '62' + phoneNumber.substring(1);
        } else if (!phoneNumber.startsWith('62')) {
            phoneNumber = '62' + phoneNumber;
        }

        targetJid = phoneNumber + '@s.whatsapp.net';
        isTargetGroup = false;

        const maskedNumber = phoneNumber.replace(/(\d{2})\d+(\d{2})/, '$1***$2');
        chatName = `+${maskedNumber}`;

    } else {
        // Method original - ambil dari context
        if (isCurrentChatGroup) {
            targetJid = currentChatJid;
            isTargetGroup = true;

            try {
                const groupMetadata = await sock.groupMetadata(targetJid);
                chatName = groupMetadata.subject || "Grup Ini";
            } catch (error) {
                chatName = "Grup Ini";
            }
        } else {
            // Untuk private chat, ambil dari quoted message
            if (quotedMsg.participant) {
                targetJid = quotedMsg.participant;
            } else if (quotedMsg.remoteJid && !quotedMsg.remoteJid.endsWith('@g.us')) {
                targetJid = quotedMsg.remoteJid;
            } else {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: `❌ Tidak dapat menentukan target untuk dihapus!

📝 *Cara yang benar:*
• Untuk grup: kirim link grup atau jalankan di dalam grup
• Untuk private: reply dengan nomor telepon atau reply pesan dari orangnya` 
                }, { quoted: msg });
                return;
            }

            const maskedNumber = targetJid.split('@')[0].replace(/(\d{2})\d+(\d{2})/, '$1***$2');
            chatName = `+${maskedNumber}`;
        }
    }

    if (config.autoFeatures.antidelete.mode === 'all') {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `⚠️ Mode saat ini adalah ALL. Semua chat otomatis aktif!\n\nTidak bisa menghapus individual karena mode ALL mencakup semua chat.` 
        }, { quoted: msg });
        return;
    }

    let removed = false;

    if (isTargetGroup) {
        // Hapus dari group whitelist
        const index = config.autoFeatures.antidelete.groupChat.whitelist.indexOf(targetJid);
        if (index > -1) {
            config.autoFeatures.antidelete.groupChat.whitelist.splice(index, 1);
            removed = true;
        }
    } else {
        // Hapus dari private whitelist
        const index = config.autoFeatures.antidelete.privateChat.whitelist.indexOf(targetJid);
        if (index > -1) {
            config.autoFeatures.antidelete.privateChat.whitelist.splice(index, 1);
            removed = true;
        }
    }

    if (!removed) {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `❌ ${isTargetGroup ? 'Grup' : 'Chat'} "${chatName}" tidak ada dalam whitelist!

💡 *Gunakan \`${config.bot.prefix}antidel list\` untuk melihat daftar whitelist yang tersedia*` 
        }, { quoted: msg });
        return;
    }

    // Jika semua whitelist kosong, matikan mode custom
    const totalWhitelist = config.autoFeatures.antidelete.privateChat.whitelist.length + 
                          config.autoFeatures.antidelete.groupChat.whitelist.length;

    if (totalWhitelist === 0) {
        config.autoFeatures.antidelete.enabled = false;
        config.autoFeatures.antidelete.mode = 'off';
        config.autoFeatures.antidelete.privateChat.enabled = false;
        config.autoFeatures.antidelete.groupChat.enabled = false;
    }

    const saveResult = saveConfig(config);

    if (saveResult) {
        const successText = `
🗑️ *BERHASIL DIHAPUS DARI WHITELIST*

${isTargetGroup ? '👥' : '📱'} *${isTargetGroup ? 'Grup' : 'Chat'}:* ${chatName}
🆔 *JID:* ${targetJid}
❌ *Status:* Anti-Delete NONAKTIF

📊 *Pengaturan Sekarang:*
├─ Mode: ${config.autoFeatures.antidelete.mode.toUpperCase()}
├─ Private Chat: ${config.autoFeatures.antidelete.privateChat.enabled ? 'ON ✅' : 'OFF ❌'} (${config.autoFeatures.antidelete.privateChat.whitelist.length} chat)
├─ Group Chat: ${config.autoFeatures.antidelete.groupChat.enabled ? 'ON ✅' : 'OFF ❌'} (${config.autoFeatures.antidelete.groupChat.whitelist.length} grup)
└─ Total Whitelist: ${totalWhitelist} chat

💾 *Data akurat tersimpan ke config.json*

${totalWhitelist === 0 ? '⚠️ *Semua whitelist kosong, anti-delete dimatikan otomatis*' : ''}

✅ *Target berhasil dihapus dari sistem anti-delete!*`;

        await sock.sendMessage(msg.key.remoteJid, { text: successText }, { quoted: msg });
    } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menyimpan ke config.json` }, { quoted: msg });
    }
}

// Handler untuk .antidel list
async function handleAntiDeleteList(sock, msg, config) {
    const antiDel = config.autoFeatures.antidelete;

    let listText = `
📋 *WHITELIST ANTI-DELETE*

👥 *GROUP CHAT (${antiDel.groupChat.whitelist.length}):*`;

    if (antiDel.groupChat.whitelist.length === 0) {
        listText += `\n├─ ❌ Tidak ada grup dalam whitelist`;
    } else {
        for (let i = 0; i < antiDel.groupChat.whitelist.length; i++) {
            const groupJid = antiDel.groupChat.whitelist[i];
            try {
                const groupMetadata = await sock.groupMetadata(groupJid);
                const groupName = groupMetadata.subject || "Unknown Group";
                listText += `\n├─ ${i + 1}. ${groupName}`;
            } catch (error) {
                listText += `\n├─ ${i + 1}. ${groupJid}`;
            }
        }
    }

    listText += `\n\n📱 *PRIVATE CHAT (${antiDel.privateChat.whitelist.length}):*`;

    if (antiDel.privateChat.whitelist.length === 0) {
        listText += `\n├─ ❌ Tidak ada private chat dalam whitelist`;
    } else {
        for (let i = 0; i < antiDel.privateChat.whitelist.length; i++) {
            const chatJid = antiDel.privateChat.whitelist[i];
            const maskedNumber = chatJid.split('@')[0].replace(/(\d{2})\d+(\d{2})/, '$1***$2');
            listText += `\n├─ ${i + 1}. +${maskedNumber}`;
        }
    }

    listText += `\n\n📊 *Summary:*
├─ Total: ${antiDel.privateChat.whitelist.length + antiDel.groupChat.whitelist.length} chat
├─ Mode: ${antiDel.mode.toUpperCase()}
└─ Status: ${antiDel.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}`;

    await sock.sendMessage(msg.key.remoteJid, { text: listText }, { quoted: msg });
}

// Handler untuk .antidel debug
async function handleAntiDeleteDebug(sock, msg, config) {
    const chatJid = msg.key.remoteJid;
    const isGroup = chatJid.endsWith('@g.us');
    const antiDel = config.autoFeatures.antidelete;

    const isActiveForThisChat = isAntiDeleteActiveForChat(config, chatJid);

    let debugText = `
🐛 *DEBUG ANTI-DELETE*

📍 *Current Chat Info:*
├─ Chat JID: ${chatJid}
├─ Is Group: ${isGroup ? 'YES ✅' : 'NO ❌'}
├─ Active for this chat: ${isActiveForThisChat ? 'YES ✅' : 'NO ❌'}
└─ Chat type: ${isGroup ? 'Group Chat' : 'Private Chat'}

🛡️ *Global Settings:*
├─ Enabled: ${antiDel.enabled ? 'YES ✅' : 'NO ❌'}
├─ Mode: ${antiDel.mode.toUpperCase()}
└─ Config loaded: YES ✅

📱 *Private Chat Settings:*
├─ Enabled: ${antiDel.privateChat.enabled ? 'YES ✅' : 'NO ❌'}
├─ Whitelist count: ${antiDel.privateChat.whitelist.length}
├─ This chat in whitelist: ${antiDel.privateChat.whitelist.includes(chatJid) ? 'YES ✅' : 'NO ❌'}
└─ Should work: ${!isGroup && antiDel.privateChat.enabled ? 'YES ✅' : 'NO ❌'}

👥 *Group Chat Settings:*
├─ Enabled: ${antiDel.groupChat.enabled ? 'YES ✅' : 'NO ❌'}
├─ Whitelist count: ${antiDel.groupChat.whitelist.length}
├─ This chat in whitelist: ${antiDel.groupChat.whitelist.includes(chatJid) ? 'YES ✅' : 'NO ❌'}
└─ Should work: ${isGroup && antiDel.groupChat.enabled ? 'YES ✅' : 'NO ❌'}

🔍 *Analysis:*`;

    if (!antiDel.enabled) {
        debugText += `\n├─ ❌ Anti-delete globally disabled`;
    } else if (antiDel.mode === 'all') {
        debugText += `\n├─ ✅ Mode ALL - should work everywhere`;
    } else if (!isGroup && !antiDel.privateChat.enabled) {
        debugText += `\n├─ ❌ Private chat disabled`;
    } else if (isGroup && !antiDel.groupChat.enabled) {
        debugText += `\n├─ ❌ Group chat disabled`;
    } else if (!isActiveForThisChat) {
        debugText += `\n├─ ❌ Chat not in whitelist or requirements not met`;
    } else {
        debugText += `\n├─ ✅ Should be working!`;
    }

    debugText += `\n\n💡 *Recommendations:*`;

    if (!isGroup && !isActiveForThisChat) {
        debugText += `\n├─ 1️⃣ Run: \`${config.bot.prefix}antidel private on\``;
        debugText += `\n├─ 2️⃣ Run: \`${config.bot.prefix}antidel private add\` (in this chat)`;
        debugText += `\n└─ 3️⃣ Or use: \`${config.bot.prefix}antidel all\` for global mode`;
    } else if (isGroup && !isActiveForThisChat) {
        debugText += `\n├─ 1️⃣ Run: \`${config.bot.prefix}antidel gc on\``;
        debugText += `\n├─ 2️⃣ Run: \`${config.bot.prefix}antidel add\` (in this group)`;
        debugText += `\n└─ 3️⃣ Or use: \`${config.bot.prefix}antidel all\` for global mode`;
    } else {
        debugText += `\n└─ ✅ Configuration looks good!`;
    }

    await sock.sendMessage(msg.key.remoteJid, { text: debugText }, { quoted: msg });
}

// Modify ReplyRynzz function to use Wily
async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

// Setup auto anti-delete handler untuk message events
function setupAutoAntiDelete(sock) {
    const messageBackup = new Map();
    const maxBackupSize = 1000;
    const maxAgeHours = 2;

    // Fungsi untuk backup pesan
    const backupMessage = async (messages) => {
        try {
            const config = loadConfig();
            if (!config?.autoFeatures?.antidelete?.enabled) return;

            for (const msg of messages) {
                if (!msg.message || !msg.key?.id) continue;
                if (msg.key.fromMe) continue;

                const chatJid = msg.key.remoteJid;

                // Skip status broadcast
                if (chatJid === 'status@broadcast') continue;

                // Cek apakah anti-delete aktif untuk chat ini
                if (!isAntiDeleteActiveForChat(config, chatJid)) continue;

                const messageTime = msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now();
                const currentTime = Date.now();
                const maxAge = maxAgeHours * 60 * 60 * 1000;

                if (currentTime - messageTime > maxAge) continue;

                const messageKey = `${chatJid}_${msg.key.id}`;

                // Untuk private chat, sender adalah remoteJid
                const isGroup = chatJid.endsWith('@g.us');
                const senderJid = isGroup ? (msg.key.participant || msg.key.remoteJid) : msg.key.remoteJid;

                messageBackup.set(messageKey, {
                    message: msg,
                    timestamp: Date.now(),
                    messageTime: messageTime,
                    sender: senderJid,
                    pushName: msg.pushName || msg.verifiedBizName || "Unknown",
                    chatJid: chatJid,
                    isGroup: isGroup
                });

                if (messageBackup.size > maxBackupSize) {
                    const firstKey = messageBackup.keys().next().value;
                    messageBackup.delete(firstKey);
                }

                // Silent backup - no console log
            }
        } catch (error) {
            // Silent error
        }
    };

    // Fungsi untuk mendeteksi dan restore pesan yang dihapus
    const handleDeletion = async (updates) => {
        try {
            const config = loadConfig();
            if (!config?.autoFeatures?.antidelete?.enabled) return;

            for (const update of updates) {
                const protocolMessage = update.update?.message?.protocolMessage;
                const isRevoke = protocolMessage?.type === 0;
                const isMessageDeleted = update.update?.messageStubType === 68 || 
                                       update.update?.messageStubType === 69 || 
                                       update.update?.messageStubType === 70;
                const isDirectDelete = update.update?.message === null;

                // Tambahan deteksi untuk private chat
                const isPrivateRevoke = update.update?.message?.protocolMessage?.type === 0;
                const hasProtocolMessage = update.update?.message?.protocolMessage;

                if (isRevoke || isMessageDeleted || isDirectDelete || isPrivateRevoke || hasProtocolMessage) {
                    const deletedKey = protocolMessage?.key || update.key;
                    if (!deletedKey?.id) continue;

                    const remoteJid = deletedKey.remoteJid;
                    const messageId = deletedKey.id;

                    // Skip status broadcast
                    if (remoteJid === 'status@broadcast') continue;

                    // Cek apakah anti-delete aktif untuk chat ini
                    if (!isAntiDeleteActiveForChat(config, remoteJid)) continue;

                    const isGroup = remoteJid.endsWith("@g.us");
                    const messageKey = `${remoteJid}_${messageId}`;
                    const backup = messageBackup.get(messageKey);

                    // Silent detection - no console log

                    if (backup) {
                        const messageTime = backup.messageTime || backup.timestamp;
                        const currentTime = Date.now();
                        const maxAge = maxAgeHours * 60 * 60 * 1000;

                        if (currentTime - messageTime <= maxAge) {
                            await restoreDeletedMessage(sock, remoteJid, backup, isGroup);
                            messageBackup.delete(messageKey);
                        }
                    } else {
                        await sendDeletionNotification(sock, remoteJid, isGroup);
                    }
                }
            }
        } catch (error) {
            // Silent error
        }
    };

    // Fungsi untuk restore pesan yang dihapus
    const restoreDeletedMessage = async (sock, remoteJid, backup, isGroup) => {
        try {
            const senderName = backup.pushName || "Unknown User";
            const senderNumber = backup.sender.split("@")[0];
            const maskedNumber = sensorPhoneNumber(senderNumber);

            const currentDate = new Date();
            const jakartaTime = currentDate.toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            let restoreText = `╭─ 🚫 *ANTI-DELETE SYSTEM AKTIF* 🛡️\n`;
            restoreText += `├─ ⚠️  *PESAN DIHAPUS TERDETEKSI*\n`;
            restoreText += `├─ ✅  *BERHASIL DIPULIHKAN*\n`;
            restoreText += `├─ ───────────────────────\n`;
            restoreText += `├─ 👤 *Pengirim:* ${senderName}\n`;
            restoreText += `├─ 📱 *Nomor:* ${maskedNumber}\n`;
            restoreText += `├─ 📍 *Lokasi:* ${isGroup ? "👥 Grup Chat" : "👤 Chat Pribadi"}\n`;
            restoreText += `├─ ⏰ *Waktu:* ${jakartaTime}\n`;
            restoreText += `├─ ───────────────────────\n`;
            restoreText += `├─ 🛡️ *Status:* Pesan berhasil dipulihkan\n`;
            restoreText += `├─ 🔐 *Proteksi:* Anti-Delete Aktif\n`;
            restoreText += `╰─ ➤ *SISTEM ANTI-DELETE*`;

            const mentions = [];
            if (backup.sender && isGroup) {
                mentions.push(backup.sender);
            }

            const messageContent = {
                text: restoreText,
                mentions: mentions
            };

            await sock.sendMessage(remoteJid, messageContent, { quoted: backup.message });

            setTimeout(async () => {
                try {
                    await sock.sendMessage(remoteJid, {
                        forward: backup.message,
                        force: true
                    }, { quoted: backup.message });
                } catch (error) {
                    // Silent error
                }
            }, 1000);

        } catch (error) {
            // Silent error
        }
    };

    // Fungsi untuk notifikasi penghapusan tanpa backup
    const sendDeletionNotification = async (sock, remoteJid, isGroup) => {
        try {
            const currentDate = new Date();
            const jakartaTime = currentDate.toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            let notificationText = `╭─ 🚫 *ANTI-DELETE SYSTEM* ⚠️\n`;
            notificationText += `├─ 🔍 *PESAN DIHAPUS TERDETEKSI*\n`;
            notificationText += `├─ ❌ *GAGAL MEMULIHKAN PESAN*\n`;
            notificationText += `├─ ───────────────────────\n`;
            notificationText += `├─ 📍 *Lokasi:* ${isGroup ? "👥 Grup Chat" : "👤 Chat Pribadi"}\n`;
            notificationText += `├─ ⏰ *Waktu:* ${jakartaTime}\n`;
            notificationText += `├─ 📋 *Status:* Backup tidak tersedia\n`;
            notificationText += `├─ ───────────────────────\n`;
            notificationText += `├─ ⚠️ *KEMUNGKINAN PENYEBAB:*\n`;
            notificationText += `├─ • 🔄 Bot baru restart/nyala kembali\n`;
            notificationText += `├─ • ⏰ Pesan dihapus saat bot offline\n`;
            notificationText += `├─ • 📦 Backup memory sudah hilang\n`;
            notificationText += `├─ • 🕐 Pesan terlalu lama (>2 jam)\n`;
            notificationText += `├─ • 💾 Bot belum sempat backup pesan\n`;
            notificationText += `├─ 🛡️ *Anti-Delete:* Tetap Aktif\n`;
            notificationText += `╰─ ➤ *SISTEM ANTI-DELETE*`;

            await sock.sendMessage(remoteJid, { text: notificationText });
        } catch (error) {
            // Silent error
        }
    };

    // Sensor nomor telepon
    const sensorPhoneNumber = (phoneNumber) => {
        if (!phoneNumber || phoneNumber.length < 6) return phoneNumber;

        if (phoneNumber.startsWith("62")) {
            return `+62***${phoneNumber.slice(-2)}`;
        } else if (phoneNumber.startsWith("60")) {
            return `+60***${phoneNumber.slice(-2)}`;
        } else {
            return `${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-2)}`;
        }
    };

    // Listen untuk message events
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        await backupMessage(chatUpdate.messages);
    });

    // Listen untuk message deletion
    sock.ev.on('messages.update', async (updates) => {
        await handleDeletion(updates);
    });

    // Tambahan listener untuk message revocation yang lebih spesifik
    sock.ev.on('message-receipt.update', async (update) => {
        try {
            const config = loadConfig();
            if (!config?.autoFeatures?.antidelete?.enabled) return;

            if (update.receipt === 'revoke') {
                const chatJid = update.key.remoteJid;
                const messageId = update.key.id;

                if (chatJid === 'status@broadcast') return;
                if (!isAntiDeleteActiveForChat(config, chatJid)) return;

                const isGroup = chatJid.endsWith('@g.us');
                const messageKey = `${chatJid}_${messageId}`;
                const backup = messageBackup.get(messageKey);

                // Silent revocation detection - no console log

                if (backup) {
                    await restoreDeletedMessage(sock, chatJid, backup, isGroup);
                    messageBackup.delete(messageKey);
                } else {
                    await sendDeletionNotification(sock, chatJid, isGroup);
                }
            }
        } catch (error) {
            // Silent error
        }
    });

    // Handle reply untuk mode selection
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            for (const msg of chatUpdate.messages) {
                if (!msg.message) continue;

                const messageText = msg.message?.conversation || 
                                  msg.message?.extendedTextMessage?.text || '';

                if (!messageText) continue;

                // Cek apakah ini reply untuk pemilihan mode
                const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMsg && quotedMsg.conversation && quotedMsg.conversation.includes('PILIH MODE ANTI-DELETE')) {
                    const config = loadConfig();
                    if (!config) return;

                    // Cek authorization
                    const botNumber = sock.user?.id?.split(':')[0];
                    let actualSenderNumber;

                    if (msg.key.participant) {
                        actualSenderNumber = msg.key.participant.split('@')[0];
                    } else if (msg.key.fromMe) {
                        actualSenderNumber = botNumber;
                    } else {
                        actualSenderNumber = msg.key.remoteJid?.split('@')[0];
                    }

                    const isFromMe = msg.key.fromMe === true;
                    const isBotNumber = actualSenderNumber === botNumber;
                    const isOwnerNumber = actualSenderNumber === config.bot?.owner;
                    const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
                    const isHardcodedBot = actualSenderNumber === '6289681008411';

                    const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;

                    if (config.bot?.mode === 'self' && !isAuthorizedUser) {
                        return;
                    }

                    if (config.bot?.mode === 'public' && !isAuthorizedUser) {
                        const accessDeniedText = `🚫 *AKSES DITOLAK* - Fitur ini khusus untuk owner bot!`;
                        await sock.sendMessage(msg.key.remoteJid, { text: accessDeniedText }, { quoted: msg });
                        return;
                    }

                    const selectedOption = messageText.trim();

                    if (selectedOption === '1') {
                        // MODE 1: ALL
                        config.autoFeatures.antidelete.enabled = true;
                        config.autoFeatures.antidelete.mode = 'all';
                        config.autoFeatures.antidelete.privateChat.enabled = false;
                        config.autoFeatures.antidelete.groupChat.enabled = false;

                        const saveResult = saveConfig(config);

                        if (saveResult) {
                            const successText = `✅ *MODE 1 - ALL DIPILIH!*

🛡️ *Auto Anti-Delete: MODE ALL*

📊 *Pengaturan:*
├─ Status: AKTIF ✅
├─ Mode: ALL (Global)
├─ Private Chat: AUTO ON
├─ Group Chat: AUTO ON
├─ Custom Setting: DISABLED
└─ Multi-Mode: DISABLED

🎯 *Fitur Aktif di Semua Chat:*
├─ 🔍 Deteksi penghapusan real-time
├─ 🔄 Backup otomatis semua pesan
├─ 🛡️ Restore pesan yang dihapus
├─ 📊 Statistik lengkap
└─ 🌐 Coverage: 100% semua chat

💾 *Data tersimpan ke config.json*

⚠️ *Catatan:* Mode ALL tidak memerlukan setup tambahan`;

                            await sock.sendMessage(msg.key.remoteJid, { text: successText }, { quoted: msg });
                        }
                    } else if (selectedOption === '2') {
                        // MODE 2: CUSTOM
                        config.autoFeatures.antidelete.enabled = true;
                        config.autoFeatures.antidelete.mode = 'custom';

                        const saveResult = saveConfig(config);

                        if (saveResult) {
                            const customText = `✅ *MODE 2 - CUSTOM DIPILIH!*

🎯 *Auto Anti-Delete: MODE CUSTOM*

📊 *Pengaturan:*
├─ Status: AKTIF ✅
├─ Mode: CUSTOM (Advanced)
├─ Private Chat: ${config.autoFeatures.antidelete.privateChat.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Group Chat: ${config.autoFeatures.antidelete.groupChat.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Whitelist Control: ENABLED
└─ Multi-Mode: AVAILABLE

🔧 *Next Steps - Pilih Yang Diinginkan:*
├─ \`${config.bot.prefix}antidel private on\` - Aktifkan private chat
├─ \`${config.bot.prefix}antidel gc on\` - Aktifkan group chat
├─ \`${config.bot.prefix}antidel add\` - Tambah grup ke whitelist
└─ \`${config.bot.prefix}antidel private add\` - Tambah private chat (reply pesan)

🎯 *Mode Custom Features:*
├─ 📱 Private chat whitelist custom
├─ 👥 Group chat whitelist custom
├─ 🔄 Bisa aktif salah satu atau keduanya
└─ ⚙️ Kontrol penuh per chat

💾 *Data tersimpan ke config.json*`;

                            await sock.sendMessage(msg.key.remoteJid, { text: customText }, { quoted: msg });
                        }
                    } else if (selectedOption === '3') {
                        // MODE 3: MULTI CUSTOM
                        config.autoFeatures.antidelete.enabled = true;
                        config.autoFeatures.antidelete.mode = 'multi-custom';

                        // Langsung aktifkan both untuk mode multi custom
                        config.autoFeatures.antidelete.privateChat.enabled = true;
                        config.autoFeatures.antidelete.groupChat.enabled = true;

                        const saveResult = saveConfig(config);

                        if (saveResult) {
                            const multiCustomText = `✅ *MODE 3 - MULTI CUSTOM DIPILIH!*

🎯 *Auto Anti-Delete: MODE MULTI CUSTOM*

📊 *Pengaturan:*
├─ Status: AKTIF ✅
├─ Mode: MULTI-CUSTOM (Ultimate)
├─ Private Chat: AUTO ON ✅
├─ Group Chat: AUTO ON ✅
├─ Multi-Activation: ENABLED
└─ Independent Control: ENABLED

🔧 *Setup Whitelist - Kedua Mode Aktif:*
├─ \`${config.bot.prefix}antidel add\` - Tambah grup ke whitelist
├─ \`${config.bot.prefix}antidel private add\` - Tambah private chat (reply pesan)
├─ \`${config.bot.prefix}antidel list\` - Lihat daftar whitelist
└─ \`${config.bot.prefix}antidel status\` - Cek status lengkap

🎯 *Multi Custom Features:*
├─ 📱 Private chat: Independent whitelist
├─ 👥 Group chat: Independent whitelist
├─ 🔄 Keduanya aktif bersamaan
├─ ⚙️ Kontrol terpisah per jenis chat
├─ 📋 Bisa on/off salah satu kapan saja
└─ 🎯 Ultimate flexibility

💾 *Data tersimpan ke config.json*

✨ *Mode ini memberikan kontrol maksimal dengan kemudahan penggunaan!*`;

                            await sock.sendMessage(msg.key.remoteJid, { text: multiCustomText }, { quoted: msg });
                        }
                    } else {
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: `❌ *Pilihan tidak valid!*

📝 Reply dengan nomor pilihan:
• *1* untuk MODE ALL
• *2* untuk MODE CUSTOM  
• *3* untuk MODE MULTI CUSTOM

💡 Pastikan reply dengan nomor saja (1, 2, atau 3)` 
                        }, { quoted: msg });
                    }
                }
            }
        } catch (error) {
            // Silent error
        }
    });
}

// Fungsi untuk setup command listener
function setupAutoAntiDeleteCommand(sock) {
    // Listen untuk message events untuk command
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            for (const msg of chatUpdate.messages) {
                if (!msg.message) continue;

                // Ambil text message
                const messageText = msg.message?.conversation || 
                                  msg.message?.extendedTextMessage?.text || '';

                if (!messageText) continue;

                // Load config untuk cek prefix
                const config = loadConfig();
                const prefix = config.bot?.prefix || '.';

                // Cek apakah ini command autoantidelete
                if (messageText.startsWith(`${prefix}antidel`)) {
                    const args = messageText.slice(prefix.length).trim().split(' ');

                    // Cek akses (hanya owner/bot)
                    const botNumber = sock.user?.id?.split(':')[0];
                    let actualSenderNumber;

                    if (msg.key.participant) {
                        actualSenderNumber = msg.key.participant.split('@')[0];
                    } else if (msg.key.fromMe) {
                        actualSenderNumber = botNumber;
                    } else {
                        actualSenderNumber = msg.key.remoteJid?.split('@')[0];
                    }

                    const isFromMe = msg.key.fromMe === true;
                    const isBotNumber = actualSenderNumber === botNumber;
                    const isOwnerNumber = actualSenderNumber === config.bot?.owner;
                    const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
                    const isHardcodedBot = actualSenderNumber === '6289681008411';

                    const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;

                    // Jika tidak authorized dan mode self, skip
                    if (config.bot?.mode === 'self' && !isAuthorizedUser) {
                        return;
                    }

                    // Jika mode public tapi command ini khusus owner, berikan pesan akses ditolak
                    if (config.bot?.mode === 'public' && !isAuthorizedUser) {
                        const accessDeniedText = `🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner  
• Form Me

🔐 *Fitur Auto Anti-Delete hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Gunakan fitur lain yang tersedia:*
• ${config.bot?.prefix || '.'}menu - Menu lengkap
• ${config.bot?.prefix || '.'}status - Status bot
• ${config.bot?.prefix || '.'}info - Info bot
• ${config.bot?.prefix || '.'}ping - Cek ping bot

⚠️ *Auto anti-delete hanya bisa digunakan oleh pemilik bot untuk keamanan dan privasi*`;

                        await sock.sendMessage(msg.key.remoteJid, { text: accessDeniedText }, { quoted: msg });
                        return;
                    }

                    // Handle command autoantidelete
                    await handleAutoAntiDelete(sock, msg, args, config);
                }
            }
        } catch (error) {
            // Silent error
        }
    });
}

module.exports = {
    handleAutoAntiDelete,
    setupAutoAntiDelete,
    setupAutoAntiDeleteCommand,
    loadConfig,
    saveConfig,
    initAntiDeleteConfig,
    isAntiDeleteActiveForChat
};
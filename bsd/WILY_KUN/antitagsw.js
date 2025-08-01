
const fs = require('fs');
const path = require('path');
const { Wily } = require('../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            delete require.cache[require.resolve('../config.json')];
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        antitagsw: {
            enabled: [],
            warns: {},
            settings: {
                maxWarns: 5,
                autoKick: true,
                deleteMessage: true
            }
        }
    };
}

// Save config function
function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'config.json');

        // Backup config lama jika ada
        if (fs.existsSync(configPath)) {
            const backupPath = path.join(process.cwd(), 'DATA', 'config.backup.json');
            const dataDir = path.join(process.cwd(), 'DATA');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            const currentConfig = fs.readFileSync(configPath, 'utf8');
            fs.writeFileSync(backupPath, currentConfig);
        }

        // Clean duplikasi data sebelum save
        config = cleanConfigStructure(config);

        // Simpan config baru
        const configString = JSON.stringify(config, null, 2);
        fs.writeFileSync(configPath, configString, 'utf8');

        return fs.existsSync(configPath);
    } catch (error) {
        
        return false;
    }
}

// Clean config structure untuk menghindari duplikasi
function cleanConfigStructure(config) {
    // Inisialisasi struktur antitagsw yang bersih
    if (!config.antitagsw) {
        config.antitagsw = {
            enabled: [],
            warns: {},
            settings: {
                maxWarns: 5,
                autoKick: true,
                deleteMessage: true
            }
        };
    }

    // Hapus antitagswData yang menyebabkan duplikasi
    if (config.antitagswData) {
        // Migrate data dari antitagswData ke antitagsw jika ada
        if (config.antitagswData.warns && Object.keys(config.antitagswData.warns).length > 0) {
            config.antitagsw.warns = { ...config.antitagsw.warns, ...config.antitagswData.warns };
        }
        delete config.antitagswData;
    }

    // Ensure struktur yang benar
    if (!config.antitagsw.enabled) config.antitagsw.enabled = [];
    if (!config.antitagsw.warns) config.antitagsw.warns = {};
    if (!config.antitagsw.settings) {
        config.antitagsw.settings = {
            maxWarns: 5,
            autoKick: true,
            deleteMessage: true
        };
    }

    // Remove duplicates from enabled array
    config.antitagsw.enabled = [...new Set(config.antitagsw.enabled)];

    return config;
}

// Check if group is enabled for antitagsw
function isGroupEnabled(config, groupJid) {
    if (!config.antitagsw || !config.antitagsw.enabled) return false;
    return config.antitagsw.enabled.includes(groupJid);
}

// Add group to enabled list
function addGroupToEnabled(config, groupJid) {
    config = cleanConfigStructure(config);
    if (!config.antitagsw.enabled.includes(groupJid)) {
        config.antitagsw.enabled.push(groupJid);
    }
    return config;
}

// Remove group from enabled list
function removeGroupFromEnabled(config, groupJid) {
    config = cleanConfigStructure(config);
    const index = config.antitagsw.enabled.indexOf(groupJid);
    if (index > -1) {
        config.antitagsw.enabled.splice(index, 1);
    }
    return config;
}

// Get warns for specific user in specific group
function getUserWarns(config, groupJid, userJid) {
    config = cleanConfigStructure(config);

    if (!config.antitagsw.warns[groupJid]) {
        config.antitagsw.warns[groupJid] = {};
    }

    if (!config.antitagsw.warns[groupJid][userJid]) {
        config.antitagsw.warns[groupJid][userJid] = {
            warns: 0,
            lastWarn: null,
            history: []
        };
    }

    return config.antitagsw.warns[groupJid][userJid];
}

// Add warn for specific user in specific group
function addUserWarn(config, groupJid, userJid, reason = 'Tag grup di status WA') {
    config = cleanConfigStructure(config);

    if (!config.antitagsw.warns[groupJid]) {
        config.antitagsw.warns[groupJid] = {};
    }

    if (!config.antitagsw.warns[groupJid][userJid]) {
        config.antitagsw.warns[groupJid][userJid] = {
            warns: 0,
            lastWarn: null,
            history: []
        };
    }

    config.antitagsw.warns[groupJid][userJid].warns += 1;
    config.antitagsw.warns[groupJid][userJid].lastWarn = new Date().toISOString();

    if (!config.antitagsw.warns[groupJid][userJid].history) {
        config.antitagsw.warns[groupJid][userJid].history = [];
    }

    config.antitagsw.warns[groupJid][userJid].history.push({
        timestamp: new Date().toISOString(),
        reason: reason,
        warnNumber: config.antitagsw.warns[groupJid][userJid].warns
    });

    saveConfig(config);
    return config.antitagsw.warns[groupJid][userJid].warns;
}

// Reset warns for specific user in specific group
function resetUserWarns(config, groupJid, userJid, reason = 'Dikick dari grup') {
    config = cleanConfigStructure(config);
    
    if (config.antitagsw.warns[groupJid] && config.antitagsw.warns[groupJid][userJid]) {
        const oldData = { ...config.antitagsw.warns[groupJid][userJid] };

        config.antitagsw.warns[groupJid][userJid] = {
            warns: 0,
            lastWarn: null,
            history: [{
                timestamp: new Date().toISOString(),
                reason: reason,
                resetFrom: oldData.warns,
                previousHistory: oldData.history || []
            }]
        };

        saveConfig(config);
        return true;
    }

    return false;
}

// Check access permission
function checkAccess(senderNumber, config, fromMe = false) {
    if (!config || !config.bot) return false;

    const botMode = config.bot.mode || 'self';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';

    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');

    if (botMode === 'self') {
        return fromMe || cleanSender === cleanOwner || cleanSender === cleanBot;
    } else if (botMode === 'public') {
        return true;
    }

    return false;
}

// Check if user is admin in group
async function isAdmin(sock, groupJid, userJid) {
    try {
        const groupMetadata = await sock.groupMetadata(groupJid);
        const participant = groupMetadata.participants.find(p => p.id === userJid);

        if (!participant) {
            return false;
        }

        return participant.admin === 'admin' || participant.admin === 'superadmin';
    } catch (error) {
        
        return false;
    }
}

// Check if bot is admin in group
async function isBotAdmin(sock, groupJid) {
    try {
        const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        return await isAdmin(sock, groupJid, botJid);
    } catch (error) {
        
        return false;
    }
}

// Main handler untuk command antitagsw
async function handleAntitagswCommand(sock, msg, config, args) {
    try {
        const senderJid = msg.key.remoteJid;
        const isGroupChat = senderJid.endsWith('@g.us');
        const fromMe = msg.key.fromMe;

        let senderNumber;
        if (msg.key.participant) {
            senderNumber = msg.key.participant.split('@')[0];
        } else if (fromMe) {
            senderNumber = sock.user?.id?.split(':')[0];
        } else {
            senderNumber = senderJid?.split('@')[0];
        }

        const actualSenderNumber = msg.key.participant ? msg.key.participant.split('@')[0] : senderJid?.split('@')[0];
        if (!checkAccess(actualSenderNumber + '@s.whatsapp.net', config, fromMe)) {
            if (config.bot?.mode === 'self') {
                return;
            }
        }

        config = cleanConfigStructure(config);
        const currentStatus = isGroupEnabled(config, senderJid);

        const groupWarns = config.antitagsw.warns[senderJid] || {};
        const totalUsers = Object.keys(groupWarns).length;
        const activeWarns = Object.values(groupWarns).reduce((sum, user) => sum + user.warns, 0);

        if (!args || args.length === 0 || args[0] === 'help') {
            const helpText = `🛡️ *ANTI TAG STATUS WHATSAPP*

📊 *Status Saat Ini:* ${currentStatus ? 'AKTIF ✅' : 'NONAKTIF ❌'}
📱 *Grup Terdaftar:* ${config.antitagsw.enabled.length} grup
📁 *Data Tersimpan:* config.json (struktur bersih) ✅

💡 *Cara Penggunaan:*
${config.bot.prefix}antitagsw on → Aktifkan
${config.bot.prefix}antitagsw off → Matikan
${config.bot.prefix}antitagsw status → Lihat stats
${config.bot.prefix}antitagsw warns → Lihat semua pelanggaran
${config.bot.prefix}antitagsw add → Daftarkan grup
${config.bot.prefix}antitagsw del → Hapus grup
${config.bot.prefix}antitagsw info → Info lengkap
${config.bot.prefix}antitagsw help → Bantuan ini

🔧 *Pengaturan Lanjutan:*
${config.bot.prefix}antitagsw set [angka] → Atur max warns (1-10)
${config.bot.prefix}antitagsw reset → Reset warns grup ini
${config.bot.prefix}antitagsw all → Reset semua grup (owner only)

🔰 *Sistem Kerja:*
• Hanya grup terdaftar yang dipantau
• Data tersimpan di struktur tunggal (tidak duplikat)
• Auto reset warns saat user dikick
• Bot harus admin untuk kick otomatis
• Admin tidak terkena sanksi

⚠️ *Syarat:*
• Admin grup & owner bot bisa mengatur
• Bot harus admin untuk fitur kick`;

            await Wily(helpText, msg, sock);
            return;
        }

        const command = args[0].toLowerCase();

        if (command === 'on') {
            if (!isGroupChat) {
                await Wily('❌ *HANYA UNTUK GRUP*\n\nCommand ini hanya bisa digunakan di grup!', msg, sock);
                return;
            }

            const participantJid = msg.key.participant || msg.key.remoteJid;
            const userIsAdmin = await isAdmin(sock, senderJid, participantJid);
            const userIsOwner = actualSenderNumber === config.bot.owner || actualSenderNumber === config.bot.botNumber || fromMe;

            if (!userIsAdmin && !userIsOwner) {
                await Wily('🚫 *AKSES DITOLAK*\n\nFitur ini hanya bisa digunakan oleh:\n• Admin Grup\n• Owner Bot\n• Bot Number', msg, sock);
                return;
            }

            if (!isGroupEnabled(config, senderJid)) {
                await Wily('❌ *GRUP BELUM TERDAFTAR*\n\nGrup ini belum terdaftar dalam sistem antitagsw.\n\nGunakan:\n' + config.bot.prefix + 'antitagsw add', msg, sock);
                return;
            }

            // Check if bot is admin
            const botIsAdmin = await isBotAdmin(sock, senderJid);
            const adminWarning = botIsAdmin ? '' : '\n\n⚠️ *PERINGATAN:* Bot bukan admin, fitur kick otomatis tidak akan bekerja!';

            if (currentStatus) {
                await Wily('⚠️ *SUDAH AKTIF*\n\nAnti Tag Status WhatsApp sudah dalam keadaan aktif di grup ini!' + adminWarning, msg, sock);
                return;
            }

            let groupName = 'Unknown Group';
            try {
                const groupMetadata = await sock.groupMetadata(senderJid);
                groupName = groupMetadata.subject;
            } catch (error) {
                // Fallback
            }

            const successText = `✅ *ANTI TAG SW DIAKTIFKAN*

🛡️ *Status:* AKTIF
📱 *Grup:* ${groupName}
🆔 *ID Grup:* ${senderJid}
🤖 *Bot Status:* ${botIsAdmin ? 'Admin ✅' : 'Bukan Admin ⚠️'}

🔰 *Fitur yang Aktif:*
• ✅ Deteksi tag grup di status WA
• ${botIsAdmin ? '✅' : '❌'} Hapus pesan tag otomatis
• ✅ Sistem peringatan (1-5) persistent
• ${botIsAdmin ? '✅' : '❌'} Kick otomatis setelah 5 warn
• ✅ Data tersimpan di config.json

💾 *Sistem Penyimpanan:*
• Struktur data bersih (tanpa duplikasi)
• Data warns per grup terpisah
• Persistent saat bot restart
• Auto backup sebelum update${adminWarning}`;

            await Wily(successText, msg, sock);

        } else if (command === 'off') {
            if (!isGroupChat) {
                await Wily('❌ *HANYA UNTUK GRUP*\n\nCommand ini hanya bisa digunakan di grup!', msg, sock);
                return;
            }

            const participantJid = msg.key.participant || msg.key.remoteJid;
            const userIsAdmin = await isAdmin(sock, senderJid, participantJid);
            const userIsOwner = actualSenderNumber === config.bot.owner || actualSenderNumber === config.bot.botNumber || fromMe;

            if (!userIsAdmin && !userIsOwner) {
                await Wily('🚫 *AKSES DITOLAK*\n\nFitur ini hanya bisa digunakan oleh:\n• Admin Grup\n• Owner Bot\n• Bot Number', msg, sock);
                return;
            }

            if (!currentStatus) {
                await Wily('⚠️ *SUDAH NONAKTIF*\n\nAnti Tag Status WhatsApp sudah dalam keadaan nonaktif di grup ini!', msg, sock);
                return;
            }

            config = removeGroupFromEnabled(config, senderJid);

            if (saveConfig(config)) {
                let groupName = 'Unknown Group';
                try {
                    const groupMetadata = await sock.groupMetadata(senderJid);
                    groupName = groupMetadata.subject;
                } catch (error) {
                    // Fallback
                }

                const deactivateText = `✅ *ANTI TAG SW DINONAKTIFKAN*

🛡️ *Status:* NONAKTIF
📱 *Grup:* ${groupName}
🆔 *ID Grup:* ${senderJid}

🔄 *Perubahan:*
• ❌ Deteksi tag grup dimatikan
• ❌ Auto delete dimatikan
• ❌ Sistem peringatan dimatikan
• ❌ Auto kick dimatikan
• 🗑️ Grup dihapus dari daftar aktif

💾 *Data Pelanggaran:*
• Data warns tetap tersimpan (struktur bersih)
• Tidak akan dihapus otomatis
• Bisa diaktifkan kembali dengan add + on`;

                await Wily(deactivateText, msg, sock);
            } else {
                await Wily('❌ *GAGAL MENYIMPAN*\n\nTerjadi error saat menyimpan pengaturan ke config.json', msg, sock);
            }

        } else if (command === 'add') {
            if (!isGroupChat) {
                await Wily('❌ *HANYA UNTUK GRUP*\n\nCommand ini hanya bisa digunakan di grup!', msg, sock);
                return;
            }

            const participantJid = msg.key.participant || msg.key.remoteJid;
            const userIsAdmin = await isAdmin(sock, senderJid, participantJid);
            const userIsOwner = actualSenderNumber === config.bot.owner || actualSenderNumber === config.bot.botNumber || fromMe;

            if (!userIsAdmin && !userIsOwner) {
                await Wily('🚫 *AKSES DITOLAK*\n\nFitur ini hanya bisa digunakan oleh:\n• Admin Grup\n• Owner Bot\n• Bot Number', msg, sock);
                return;
            }

            if (isGroupEnabled(config, senderJid)) {
                await Wily('⚠️ *SUDAH TERDAFTAR*\n\nGrup ini sudah terdaftar dalam sistem antitagsw!\n\nGunakan:\n' + config.bot.prefix + 'antitagsw on', msg, sock);
                return;
            }

            config = addGroupToEnabled(config, senderJid);

            if (saveConfig(config)) {
                let groupName = 'Unknown Group';
                try {
                    const groupMetadata = await sock.groupMetadata(senderJid);
                    groupName = groupMetadata.subject;
                } catch (error) {
                    // Fallback
                }

                const botIsAdmin = await isBotAdmin(sock, senderJid);
                const addText = `✅ *GRUP BERHASIL DIDAFTARKAN*

📱 *Grup:* ${groupName}
🆔 *ID Grup:* ${senderJid}
📁 *Tersimpan di:* config.json (struktur bersih)
🤖 *Bot Status:* ${botIsAdmin ? 'Admin ✅' : 'Bukan Admin ⚠️'}

🔰 *Langkah Selanjutnya:*
Gunakan command berikut untuk mengaktifkan:
${config.bot.prefix}antitagsw on

📊 *Info Sistem:*
• Total grup terdaftar: ${config.antitagsw.enabled.length}
• Status grup ini: TERDAFTAR tapi BELUM AKTIF
• Data persistent saat bot restart

${!botIsAdmin ? '⚠️ *Catatan:* Bot bukan admin, jadikan bot admin untuk fitur kick otomatis!' : '✅ *Siap:* Bot sudah admin, semua fitur akan bekerja!'}`;

                await Wily(addText, msg, sock);
            } else {
                await Wily('❌ *GAGAL MENYIMPAN*\n\nTerjadi error saat menyimpan pengaturan ke config.json', msg, sock);
            }

        } else if (command === 'del') {
            if (!isGroupChat) {
                await Wily('❌ *HANYA UNTUK GRUP*\n\nCommand ini hanya bisa digunakan di grup!', msg, sock);
                return;
            }

            const participantJid = msg.key.participant || msg.key.remoteJid;
            const userIsAdmin = await isAdmin(sock, senderJid, participantJid);
            const userIsOwner = actualSenderNumber === config.bot.owner || actualSenderNumber === config.bot.botNumber || fromMe;

            if (!userIsAdmin && !userIsOwner) {
                await Wily('🚫 *AKSES DITOLAK*\n\nFitur ini hanya bisa digunakan oleh:\n• Admin Grup\n• Owner Bot\n• Bot Number', msg, sock);
                return;
            }

            if (!isGroupEnabled(config, senderJid)) {
                await Wily('⚠️ *BELUM TERDAFTAR*\n\nGrup ini belum terdaftar dalam sistem antitagsw!', msg, sock);
                return;
            }

            config = removeGroupFromEnabled(config, senderJid);
            
            if (config.antitagsw.warns[senderJid]) {
                delete config.antitagsw.warns[senderJid];
            }

            if (saveConfig(config)) {
                let groupName = 'Unknown Group';
                try {
                    const groupMetadata = await sock.groupMetadata(senderJid);
                    groupName = groupMetadata.subject;
                } catch (error) {
                    // Fallback
                }

                const delText = `✅ *GRUP BERHASIL DIHAPUS*

📱 *Grup:* ${groupName}
🆔 *ID Grup:* ${senderJid}
📁 *Dihapus dari:* config.json

🗑️ *Yang Dihapus:*
• ❌ Grup dari daftar aktif
• ❌ Data warns grup (${totalUsers} user)
• ❌ History pelanggaran
• ❌ Semua pengaturan grup

📊 *Info Sistem:*
• Total grup terdaftar: ${config.antitagsw.enabled.length}
• Status grup ini: TIDAK TERDAFTAR
• Struktur data tetap bersih`;

                await Wily(delText, msg, sock);
            } else {
                await Wily('❌ *GAGAL MENYIMPAN*\n\nTerjadi error saat menyimpan pengaturan ke config.json', msg, sock);
            }

        } else if (command === 'status') {
            let groupName = 'Unknown Group';
            let groupStatus = 'TIDAK TERDAFTAR';
            
            if (isGroupChat) {
                try {
                    const groupMetadata = await sock.groupMetadata(senderJid);
                    groupName = groupMetadata.subject;
                    groupStatus = isGroupEnabled(config, senderJid) ? 'TERDAFTAR & AKTIF' : 'TIDAK TERDAFTAR';
                } catch (error) {
                    // Fallback
                }
            }

            const groupData = config.antitagsw.warns[senderJid] || {};
            const userList = Object.entries(groupData)
                .filter(([userJid, userData]) => userData.warns > 0)
                .sort(([, a], [, b]) => b.warns - a.warns)
                .slice(0, 10);

            let userStats = '';
            if (userList.length === 0) {
                userStats = '• Tidak ada data pelanggaran 🎉';
            } else {
                userStats = userList.map(([userJid, userData], index) => {
                    const userNumber = userJid.split('@')[0];
                    const lastWarn = userData.lastWarn ? new Date(userData.lastWarn).toLocaleDateString('id-ID') : 'Unknown';
                    return `${index + 1}. @${userNumber}\n   📊 ${userData.warns}/5 warns • 📅 ${lastWarn}`;
                }).join('\n');
            }

            const statsText = `📊 *STATISTIK ANTI TAG SW*

📱 *Grup:* ${groupName}
🛡️ *Status:* ${groupStatus}
🆔 *ID Grup:* ${senderJid}

📈 *Ringkasan Grup Ini:*
• 👥 Total User Warned: ${totalUsers}
• ⚠️ Total Active Warns: ${activeWarns}

📋 *Sistem Global:*
• 🌐 Total Grup Terdaftar: ${config.antitagsw.enabled.length}
• 📁 File Data: config.json (struktur bersih)

🏆 *Top Pelanggar Grup Ini:*
${userStats}

💾 *Info Data:*
• Data tersimpan dalam satu struktur
• Tidak ada duplikasi data
• Terpisah per grup
• Auto backup saat update`;

            await Wily(statsText, msg, sock);

        } else if (command === 'warns') {
            // Show all violations from all groups
            const allGroupWarns = config.antitagsw.warns || {};
            const enabledGroups = config.antitagsw.enabled || [];
            
            if (Object.keys(allGroupWarns).length === 0) {
                await Wily('⚠️ *TIDAK ADA DATA PELANGGARAN*\n\nBelum ada data pelanggaran di semua grup yang terdaftar! 🎉', msg, sock);
                return;
            }

            let totalUsers = 0;
            let totalWarns = 0;
            let warnsText = '';

            for (const [groupId, groupData] of Object.entries(allGroupWarns)) {
                if (Object.keys(groupData).length === 0) continue;

                let groupName = 'Unknown Group';
                try {
                    const groupMetadata = await sock.groupMetadata(groupId);
                    groupName = groupMetadata.subject;
                } catch (error) {
                    groupName = groupId.split('@')[0];
                }

                const groupUsers = Object.keys(groupData).length;
                const groupWarnsTotal = Object.values(groupData).reduce((sum, user) => sum + user.warns, 0);
                
                totalUsers += groupUsers;
                totalWarns += groupWarnsTotal;

                warnsText += `\n📱 *${groupName}*\n`;
                warnsText += `🆔 ${groupId.split('@')[0]}\n`;
                warnsText += `👥 ${groupUsers} users • ⚠️ ${groupWarnsTotal} warns\n`;
                
                // Show top 3 violators in this group
                const topViolators = Object.entries(groupData)
                    .filter(([userJid, userData]) => userData.warns > 0)
                    .sort(([, a], [, b]) => b.warns - a.warns)
                    .slice(0, 3);

                if (topViolators.length > 0) {
                    warnsText += `🏆 *Top Pelanggar:*\n`;
                    topViolators.forEach(([userJid, userData], index) => {
                        const userNumber = userJid.split('@')[0];
                        const lastWarn = userData.lastWarn ? new Date(userData.lastWarn).toLocaleDateString('id-ID') : 'Unknown';
                        warnsText += `${index + 1}. @${userNumber} (${userData.warns}/${config.antitagsw.settings?.maxWarns || 5}) • ${lastWarn}\n`;
                    });
                }
                warnsText += `━━━━━━━━━━━━━━━\n`;
            }

            const warnsDisplay = `📊 *DAFTAR SEMUA PELANGGARAN*

🌐 *Ringkasan Global:*
• 📱 Total Grup: ${enabledGroups.length} terdaftar
• 👥 Total User Warned: ${totalUsers}
• ⚠️ Total Active Warns: ${totalWarns}
• 📁 Data File: config.json

📋 *Detail Per Grup:*${warnsText}

💡 *Catatan:*
• Data diurutkan berdasarkan jumlah warns tertinggi
• Hanya menampilkan 3 pelanggar teratas per grup
• Admin grup tidak terkena sanksi
• Data tersimpan permanent sampai direset`;

            await Wily(warnsDisplay, msg, sock);

        } else if (command === 'set') {
            const userIsOwner = actualSenderNumber === config.bot.owner || actualSenderNumber === config.bot.botNumber || fromMe;

            if (!userIsOwner) {
                await Wily('🚫 *AKSES DITOLAK*\n\nFitur ini hanya bisa digunakan oleh:\n• Owner Bot\n• Bot Number', msg, sock);
                return;
            }

            if (!args[1] || isNaN(args[1])) {
                await Wily(`❌ *FORMAT SALAH*\n\nGunakan: ${config.bot.prefix}antitagsw set [angka]\n\nContoh: ${config.bot.prefix}antitagsw set 3\n\nRange: 1-10 warns`, msg, sock);
                return;
            }

            const newMaxWarns = parseInt(args[1]);
            if (newMaxWarns < 1 || newMaxWarns > 10) {
                await Wily('❌ *ANGKA TIDAK VALID*\n\nMax warns harus antara 1-10!\n\nContoh:\n• 1 = Langsung kick\n• 5 = 5 peringatan (default)\n• 10 = 10 peringatan', msg, sock);
                return;
            }

            config.antitagsw.settings.maxWarns = newMaxWarns;

            if (saveConfig(config)) {
                const setText = `✅ *PENGATURAN BERHASIL DIUBAH*

🔧 *Max Warns Baru:* ${newMaxWarns}
📊 *Sebelumnya:* ${config.antitagsw.settings?.maxWarns || 5}

🌐 *Berlaku Untuk:*
• Semua grup terdaftar (${config.antitagsw.enabled.length} grup)
• User baru maupun yang sudah ada
• Efektif segera setelah perubahan

📋 *Info Sistem:*
• Setting tersimpan di config.json
• Warns lama tetap valid
• User yang sudah melebihi batas baru akan dikick saat melanggar lagi
• Admin tetap tidak terkena sanksi

💡 *Catatan:*
Pengaturan ini akan mempengaruhi semua grup yang menggunakan fitur antitagsw!`;

                await Wily(setText, msg, sock);
            } else {
                await Wily('❌ *GAGAL MENYIMPAN*\n\nTerjadi error saat menyimpan pengaturan baru ke config.json', msg, sock);
            }

        } else if (command === 'reset') {
            if (!isGroupChat) {
                await Wily('❌ *HANYA UNTUK GRUP*\n\nCommand ini hanya bisa digunakan di grup!', msg, sock);
                return;
            }

            const participantJid = msg.key.participant || msg.key.remoteJid;
            const userIsAdmin = await isAdmin(sock, senderJid, participantJid);
            const userIsOwner = actualSenderNumber === config.bot.owner || actualSenderNumber === config.bot.botNumber || fromMe;

            if (!userIsAdmin && !userIsOwner) {
                await Wily('🚫 *AKSES DITOLAK*\n\nFitur ini hanya bisa digunakan oleh:\n• Admin Grup\n• Owner Bot\n• Bot Number', msg, sock);
                return;
            }

            const groupDataBefore = config.antitagsw.warns[senderJid] || {};
            const totalUsersBefore = Object.keys(groupDataBefore).length;
            const totalWarnsBefore = Object.values(groupDataBefore).reduce((sum, user) => sum + user.warns, 0);

            if (totalUsersBefore === 0) {
                await Wily('⚠️ *TIDAK ADA DATA*\n\nTidak ada data pelanggaran untuk direset di grup ini! 🎉', msg, sock);
                return;
            }

            delete config.antitagsw.warns[senderJid];

            if (saveConfig(config)) {
                let groupName = 'Unknown Group';
                try {
                    const groupMetadata = await sock.groupMetadata(senderJid);
                    groupName = groupMetadata.subject;
                } catch (error) {
                    // Fallback
                }

                const resetText = `✅ *RESET WARNS GRUP BERHASIL*

📱 *Grup:* ${groupName}
🆔 *ID:* ${senderJid.split('@')[0]}
🔄 *Aksi:* Reset pelanggaran grup ini

📊 *Yang Direset:*
• 👥 ${totalUsersBefore} user
• ⚠️ ${totalWarnsBefore} total warns
• 📁 Data warns grup dihapus dari config.json

💾 *Info:*
• Data lama dibackup otomatis
• Struktur tetap bersih
• Grup siap mulai dari 0
• Sistem tetap aktif untuk grup ini`;

                await Wily(resetText, msg, sock);
            } else {
                await Wily('❌ *GAGAL RESET*\n\nTerjadi error saat mereset data pelanggaran.', msg, sock);
            }

        } else if (command === 'all') {
            const userIsOwner = actualSenderNumber === config.bot.owner || actualSenderNumber === config.bot.botNumber || fromMe;

            if (!userIsOwner) {
                await Wily('🚫 *AKSES DITOLAK*\n\nFitur ini hanya bisa digunakan oleh:\n• Owner Bot\n• Bot Number\n\n⚠️ *Peringatan:* Command ini akan mereset SEMUA grup!', msg, sock);
                return;
            }

            const allGroupWarns = config.antitagsw.warns || {};
            const totalGroupsWithWarns = Object.keys(allGroupWarns).length;
            
            if (totalGroupsWithWarns === 0) {
                await Wily('⚠️ *TIDAK ADA DATA*\n\nTidak ada data pelanggaran di semua grup untuk direset! 🎉', msg, sock);
                return;
            }

            let totalUsersReset = 0;
            let totalWarnsReset = 0;

            // Calculate totals before reset
            for (const groupData of Object.values(allGroupWarns)) {
                totalUsersReset += Object.keys(groupData).length;
                totalWarnsReset += Object.values(groupData).reduce((sum, user) => sum + user.warns, 0);
            }

            // Reset all warns
            config.antitagsw.warns = {};

            if (saveConfig(config)) {
                const allResetText = `✅ *RESET SEMUA GRUP BERHASIL*

🌐 *Scope:* Reset Global Semua Grup
🔄 *Aksi:* Hapus semua data pelanggaran

📊 *Yang Direset:*
• 📱 ${totalGroupsWithWarns} grup
• 👥 ${totalUsersReset} total user
• ⚠️ ${totalWarnsReset} total warns
• 📁 Semua data warns dihapus dari config.json

💾 *Info:*
• Data lama dibackup otomatis
• Struktur config tetap bersih  
• Semua grup mulai dari 0
• Sistem tetap aktif di ${config.antitagsw.enabled.length} grup terdaftar

⚠️ *Catatan:*
Reset ini mempengaruhi SEMUA grup yang terdaftar dalam sistem antitagsw!`;

                await Wily(allResetText, msg, sock);
            } else {
                await Wily('❌ *GAGAL RESET*\n\nTerjadi error saat mereset semua data pelanggaran.', msg, sock);
            }

        } else if (command === 'info') {
            const enabledGroups = config.antitagsw.enabled || [];
            const totalWarnsGlobal = Object.values(config.antitagsw.warns || {})
                .reduce((total, groupData) => {
                    return total + Object.values(groupData).reduce((sum, user) => sum + user.warns, 0);
                }, 0);

            const totalUsersGlobal = Object.values(config.antitagsw.warns || {})
                .reduce((total, groupData) => total + Object.keys(groupData).length, 0);

            let groupList = '';
            if (enabledGroups.length === 0) {
                groupList = '• Belum ada grup terdaftar';
            } else {
                // Get group names for better display
                const groupListWithNames = [];
                for (let i = 0; i < Math.min(enabledGroups.length, 5); i++) {
                    const groupId = enabledGroups[i];
                    const groupWarns = config.antitagsw.warns[groupId] || {};
                    const groupUsers = Object.keys(groupWarns).length;
                    const groupWarnsTotal = Object.values(groupWarns).reduce((sum, user) => sum + user.warns, 0);
                    
                    let groupName = 'Unknown Group';
                    try {
                        const groupMetadata = await sock.groupMetadata(groupId);
                        groupName = groupMetadata.subject;
                    } catch (error) {
                        groupName = groupId.split('@')[0];
                    }
                    
                    groupListWithNames.push(`${i + 1}. ${groupName}\n   🆔 ${groupId.split('@')[0]}\n   👥 ${groupUsers} users • ⚠️ ${groupWarnsTotal} warns`);
                }
                
                groupList = groupListWithNames.join('\n\n');
                
                if (enabledGroups.length > 5) {
                    groupList += `\n\n... dan ${enabledGroups.length - 5} grup lainnya`;
                }
            }

            const infoText = `🛡️ *INFO LENGKAP ANTI TAG SW*

📊 *Statistik Global:*
• 🌐 Total Grup Terdaftar: ${enabledGroups.length}
• 👥 Total User dengan Warns: ${totalUsersGlobal}
• ⚠️ Total Active Warns: ${totalWarnsGlobal}
• 📁 Data File: config.json (struktur bersih)

🔧 *Pengaturan Sistem:*
• 📊 Max Warns: ${config.antitagsw.settings?.maxWarns || 5}
• 🚪 Auto Kick: ${config.antitagsw.settings?.autoKick ? 'ON' : 'OFF'}
• 🗑️ Delete Message: ${config.antitagsw.settings?.deleteMessage ? 'ON' : 'OFF'}

📋 *5 Grup Teratas:*
${groupList}

💡 *Cara Kerja:*
1. Admin add grup ke sistem
2. Admin aktifkan fitur di grup
3. Bot pantau tag status WA (hanya grup terdaftar)
4. Beri warn & kick otomatis (jika bot admin)
5. Data tersimpan dalam struktur bersih

🤖 *Syarat Bot Admin:*
• Untuk hapus pesan otomatis
• Untuk kick otomatis
• Sistem warn tetap jalan tanpa admin`;

            await Wily(infoText, msg, sock);

        } else {
            const invalidText = `❌ *COMMAND TIDAK VALID*

📋 *Command yang Tersedia:*
${config.bot.prefix}antitagsw on → Aktifkan
${config.bot.prefix}antitagsw off → Matikan
${config.bot.prefix}antitagsw add → Daftarkan grup
${config.bot.prefix}antitagsw del → Hapus grup
${config.bot.prefix}antitagsw status → Lihat stats
${config.bot.prefix}antitagsw warns → Lihat semua pelanggaran
${config.bot.prefix}antitagsw info → Info lengkap
${config.bot.prefix}antitagsw help → Bantuan

🔧 *Pengaturan Lanjutan:*
${config.bot.prefix}antitagsw set [angka] → Atur max warns (1-10)
${config.bot.prefix}antitagsw reset → Reset warns grup ini
${config.bot.prefix}antitagsw all → Reset semua grup (owner only)

📊 *Status Saat Ini:* ${currentStatus ? 'AKTIF ✅' : 'NONAKTIF ❌'}`;

            await Wily(invalidText, msg, sock);
        }

    } catch (error) {
        
        await Wily('❌ *ERROR*\n\nTerjadi kesalahan saat memproses command antitagsw', msg, sock);
    }
}

// Handler untuk deteksi tag status WhatsApp
async function handleAntiTagSWDetection(sock, msg, config) {
    try {
        const senderJid = msg.key.remoteJid;
        const isGroupChat = senderJid.endsWith('@g.us');

        if (!isGroupChat) return;

        // PENTING: Hanya proses grup yang terdaftar di whitelist
        config = cleanConfigStructure(config);
        if (!isGroupEnabled(config, senderJid)) return;

        // Check for group status mention
        const isGroupStatusMention = msg.message?.groupStatusMentionMessage ||
            (msg.message?.futureProofMessage?.message?.protocolMessage?.type === 25);

        if (!isGroupStatusMention) return;

        // Check if sender is admin (admin tidak kena sanksi)
        const senderIsAdmin = await isAdmin(sock, senderJid, msg.key.participant);
        if (senderIsAdmin) {
            // Send polite message to admin
            const adminExemptText = `🛡️ *ADMIN DETECTION - TIDAK DIKENAI SANKSI*

👨‍💼 *Status:* Admin Grup Terdeteksi
✅ *Aksi:* Dibebaskan dari sistem peringatan

🔰 *Info Admin:*
• Admin utama dan admin biasa bebas dari sanksi
• Sistem antitagsw tidak berlaku untuk admin
• Fitur tetap memantau member biasa

💡 *Pesan Sopan:*
Terima kasih admin yang terhormat! 🙏
Anda bebas menandai grup di status WhatsApp kapan saja.
Sistem antitagsw hanya berlaku untuk member biasa.

🎖️ *Privilege Admin:*
• ✅ Bebas tag status WA
• ✅ Tidak mendapat peringatan  
• ✅ Tidak akan di-kick otomatis
• ✅ Dapat mengatur sistem antitagsw

🤖 *Salam hormat dari bot* ✨`;

            await Wily(adminExemptText, msg, sock);
            return;
        }

        // Check if bot is admin
        const botIsAdmin = await isBotAdmin(sock, senderJid);

        // If bot is not admin, send admin required message
        if (!botIsAdmin) {
            const adminRequiredText = `🚫 *BOT HARUS ADMIN*

❌ Maaf, bot harus menjadi admin terlebih dahulu untuk menghapus pesan tag status WhatsApp grup ini.

🔧 *Cara Mengatasi:*
• Jadikan bot sebagai admin grup
• Setelah bot menjadi admin, fitur akan bekerja optimal

⚠️ *Catatan:*
• Fitur deteksi tetap berjalan
• Sistem peringatan tetap aktif
• Hanya fitur hapus pesan yang tidak berfungsi

💡 *Hubungi admin grup untuk menjadikan bot sebagai admin*`;

            await Wily(adminRequiredText, msg, sock);
            return;
        }

        const userJid = msg.key.participant;

        // Add warn menggunakan sistem config.json yang bersih
        const currentWarns = addUserWarn(config, senderJid, userJid, 'Tag grup di status WhatsApp');

        // Delete the offending message (hanya jika bot admin)
        if (botIsAdmin) {
            try {
                await sock.sendMessage(senderJid, { delete: msg.key });
            } catch (deleteError) {
                
            }
        }

        // Send warning message
        if (currentWarns >= (config.antitagsw.settings?.maxWarns || 5)) {
            const kickText = `🚫 *ANTI TAG STATUS WA - KICK*

❌ Maaf, Anda tidak diperbolehkan menandai grup ini di status WhatsApp!
⚠️ Anda telah menerima ${currentWarns}/${config.antitagsw.settings?.maxWarns || 5} peringatan.

🔨 *TINDAKAN:* ${botIsAdmin ? 'DIKELUARKAN DARI GRUP' : 'PERINGATAN MAKSIMAL (bot bukan admin)'}
📋 *ALASAN:* Melanggar aturan Anti Tag Status WA

💾 *Info:* Data pelanggaran tersimpan di config.json dengan struktur bersih.

💡 *Pesan untuk member lain:*
Jangan menandai grup di status WhatsApp untuk menghindari sanksi yang sama.`;

            await Wily(kickText, msg, sock);

            // Kick user only if bot is admin
            if (botIsAdmin) {
                setTimeout(async () => {
                    try {
                        await sock.groupParticipantsUpdate(senderJid, [userJid], "remove");

                        // Reset warns untuk user yang dikick
                        setTimeout(() => {
                            const updatedConfig = loadConfig();
                            resetUserWarns(updatedConfig, senderJid, userJid, 'Dikick otomatis oleh bot');
                        }, 1000);

                    } catch (error) {
                        
                    }
                }, 2000);
            }

        } else {
            const warnText = `⚠️ *ANTI TAG STATUS WA - PERINGATAN*

❌ Dilarang menandai grup di status WhatsApp!
📊 Peringatan: ${currentWarns}/${config.antitagsw.settings?.maxWarns || 5}

🔔 *Konsekuensi:*
• ${botIsAdmin ? 'Pesan tag dihapus otomatis' : 'Pesan tag terdeteksi (bot bukan admin)'}
• ${(config.antitagsw.settings?.maxWarns || 5) - currentWarns} peringatan lagi = ${botIsAdmin ? 'KICK dari grup' : 'Peringatan maksimal'}

💾 *Info Data:*
• Pelanggaran tersimpan permanent di config.json
• Struktur data bersih (tanpa duplikasi)
• Data tidak hilang saat bot restart
• Akurat per grup, tidak bentrok

${!botIsAdmin ? '⚠️ *Catatan:* Bot bukan admin, fitur hapus pesan & kick tidak aktif!' : ''}

💡 *Aturan:*
Jangan tandai grup ini di status WhatsApp Anda untuk menghindari sanksi.`;

            await Wily(warnText, msg, sock);
        }

    } catch (error) {
        
    }
}

// Initialize antitagsw on bot startup
function initializeAntiTagSW() {
    try {
        const config = loadConfig();
        if (!config.antitagsw) {
            config.antitagsw = {
                enabled: [],
                warns: {},
                settings: {
                    maxWarns: 5,
                    autoKick: true,
                    deleteMessage: true
                }
            };
            saveConfig(config);
        }
        
        const enabledGroups = config.antitagsw.enabled || [];
        
        return true;
    } catch (error) {
        
        return false;
    }
}

module.exports = {
    handleAntitagswCommand,
    handleAntiTagSWDetection,
    loadConfig,
    saveConfig,
    checkAccess,
    getUserWarns,
    addUserWarn,
    resetUserWarns,
    cleanConfigStructure,
    isGroupEnabled,
    addGroupToEnabled,
    removeGroupFromEnabled,
    isAdmin,
    isBotAdmin,
    initializeAntiTagSW
};


import fs from 'fs';
import path from 'path';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk load config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return getDefaultConfig();
    } catch (error) {
        return getDefaultConfig();
    }
}

// Default config
function getDefaultConfig() {
    return {
        OWNER: ["6282263096788"],
        SELF: true,
        mode: "self",
        GOODBYE_ENABLED: false,
        GOODBYE_ALL_GROUPS: false
    };
}

// Fungsi untuk save config
function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        const dataDir = path.join(process.cwd(), 'DATA');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk load goodbye groups data
function loadGoodbyeGroups() {
    try {
        const goodbyeGroupsPath = path.join(process.cwd(), 'DATA', 'goodbyeGroups.json');
        if (fs.existsSync(goodbyeGroupsPath)) {
            const data = fs.readFileSync(goodbyeGroupsPath, 'utf8');
            return JSON.parse(data);
        }
        return { GOODBYE_GROUPS: [] };
    } catch (error) {
        return { GOODBYE_GROUPS: [] };
    }
}

// Fungsi untuk save goodbye groups data
function saveGoodbyeGroups(data) {
    try {
        const dataDir = path.join(process.cwd(), 'DATA');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const goodbyeGroupsPath = path.join(dataDir, 'goodbyeGroups.json');
        fs.writeFileSync(goodbyeGroupsPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk cek akses
function checkAccess(senderJid, config, fromMe) {
    try {
        if (fromMe) return true;

        if (!senderJid || typeof senderJid !== 'string') return false;

        const senderNumber = senderJid.split('@')[0];
        if (!senderNumber) return false;

        const isOwner = config.OWNER && Array.isArray(config.OWNER) && config.OWNER.includes(senderNumber);

        if (config.SELF === true || config.mode === 'self') {
            return isOwner;
        } else if (config.SELF === false || config.mode === 'public') {
            return isOwner; // Goodbye feature adalah owner-only
        }

        return isOwner;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk sensor nomor
function sensorNumber(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    if (cleanNumber.length >= 4) {
        const start = cleanNumber.substring(0, 4);
        const end = cleanNumber.substring(cleanNumber.length - 2);
        const middle = '*'.repeat(cleanNumber.length - 6);
        return `${start}${middle}${end}`;
    }
    return cleanNumber;
}

// Fungsi untuk mendapatkan nama grup
async function getGroupName(hisoka, groupId) {
    try {
        const groupMetadata = await hisoka.groupMetadata(groupId);
        return groupMetadata.subject || 'Unknown Group';
    } catch (error) {
        return 'Unknown Group';
    }
}

// Fungsi untuk extract group ID dari link
function extractGroupIdFromLink(link) {
    try {
        const patterns = [
            /chat\.whatsapp\.com\/([a-zA-Z0-9]{20,})/i,
            /wa\.me\/([a-zA-Z0-9]{20,})/i,
            /whatsapp\.com\/accept\?code=([a-zA-Z0-9]{20,})/i
        ];

        for (const pattern of patterns) {
            const match = link.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

// Fungsi untuk mendapatkan nama user
async function getUserName(hisoka, userId) {
    try {
        // Coba ambil dari contacts
        const contact = await hisoka.onWhatsApp(userId);
        if (contact && contact[0] && contact[0].notify) {
            return contact[0].notify;
        }

        // Coba ambil dari vcard jika ada
        try {
            const vcard = await hisoka.getBusinessProfile(userId);
            if (vcard && vcard.wid) {
                return vcard.wid;
            }
        } catch (vcardError) {
            // Ignore vcard error
        }

        // Fallback ke nomor saja
        return userId.split('@')[0];
    } catch (error) {
        return userId.split('@')[0];
    }
}

// Fungsi untuk cek apakah user adalah admin
async function isGroupAdmin(hisoka, groupId, userId) {
    try {
        const groupMetadata = await hisoka.groupMetadata(groupId);
        const participant = groupMetadata.participants.find(p => p.id === userId);
        return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch (error) {
        return false;
    }
}

// Handler untuk goodbye delete all confirmation
export async function handleGoodbyeDeleteAllConfirmation(m, { hisoka }) {
    try {
        if (!m.quoted && !m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            return false;
        }

        let quotedText = '';
        try {
            if (m.quoted?.message) {
                if (m.quoted.message.conversation) {
                    quotedText = m.quoted.message.conversation;
                } else if (m.quoted.message.extendedTextMessage?.text) {
                    quotedText = m.quoted.message.extendedTextMessage.text;
                }
            }

            if (!quotedText && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = m.message.extendedTextMessage.contextInfo.quotedMessage;
                if (quoted.conversation) {
                    quotedText = quoted.conversation;
                } else if (quoted.extendedTextMessage?.text) {
                    quotedText = quoted.extendedTextMessage.text;
                }
            }

            if (!quotedText && m.quoted) {
                quotedText = m.quoted.text || m.quoted.body || m.quoted.conversation || '';
            }

            quotedText = quotedText.trim();
        } catch (error) {
            return false;
        }

        const isGoodbyeDeleteAllMessage = quotedText && (
            quotedText.includes('👋💥 HAPUS SEMUA GROUP GOODBYE 💔') ||
            quotedText.includes('GOODBYE_DELETE_ALL_UNIQUE_IDENTIFIER_2025_ABC') ||
            (quotedText.includes('HAPUS SEMUA GROUP GOODBYE') && quotedText.includes('goodbye') && quotedText.includes('PERINGATAN KERAS GOODBYE'))
        );

        if (!isGoodbyeDeleteAllMessage) {
            return false;
        }

        const config = loadConfig();
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe || false;

        if (!checkAccess(senderJid, config, fromMe)) {
            return false;
        }

        let userInput = '';
        try {
            if (m.message?.conversation) {
                userInput = m.message.conversation;
            } else if (m.message?.extendedTextMessage?.text) {
                userInput = m.message.extendedTextMessage.text;
            }

            if (!userInput) {
                userInput = m.text || m.body || '';
            }

            userInput = userInput.trim().toLowerCase();
        } catch (error) {
            userInput = '';
        }

        if (!userInput || (userInput !== 'y' && userInput !== 'n')) {
            await Wily(`❌ *INPUT TIDAK VALID*\n\n🔤 Silakan reply dengan "Y" untuk ya atau "N" untuk tidak\n💡 Input Anda: "${userInput}"\n\n⏱️ Timeout dalam 30 detik`, m, hisoka);
            return true;
        }

        if (userInput === 'n') {
            await Wily(`❌ *PENGHAPUSAN DIBATALKAN*\n\n🔒 Semua data grup goodbye tetap aman\n💡 Tidak ada perubahan yang dilakukan\n\n✅ Operasi dibatalkan oleh user`, m, hisoka);
            return true;
        }

        const goodbyeGroups = loadGoodbyeGroups();
        const totalGroups = goodbyeGroups.GOODBYE_GROUPS.length;

        if (totalGroups === 0) {
            await Wily(`ℹ️ *TIDAK ADA DATA UNTUK DIHAPUS*\n\n📋 Goodbye groups sudah kosong\n💡 Tidak ada grup yang perlu dihapus`, m, hisoka);
            return true;
        }

        goodbyeGroups.GOODBYE_GROUPS = [];
        const saveResult = saveGoodbyeGroups(goodbyeGroups);

        if (saveResult) {
            await Wily(`✅ *SEMUA GROUP BERHASIL DIHAPUS*\n\n🗑️ *Data yang dihapus:*\n• Total grup: ${totalGroups}\n• Semua data goodbye group\n• File: DATA/goodbyeGroups.json\n\n💾 *Status:* Data berhasil direset ✅\n🔄 *Efek:* Goodbye feature tidak aktif di grup manapun\n\n💡 *Tips:* Gunakan \`.goodbye add\` untuk menambah grup baru`, m, hisoka);
        } else {
            await Wily('❌ Gagal menyimpan perubahan ke DATA/goodbyeGroups.json', m, hisoka);
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Handler untuk goodbye delete confirmation
export async function handleGoodbyeDeleteConfirmation(m, { hisoka }) {
    try {
        if (!m.quoted && !m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            return false;
        }

        let quotedText = '';
        try {
            if (m.quoted?.message) {
                if (m.quoted.message.conversation) {
                    quotedText = m.quoted.message.conversation;
                } else if (m.quoted.message.extendedTextMessage?.text) {
                    quotedText = m.quoted.message.extendedTextMessage.text;
                }
            }

            if (!quotedText && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = m.message.extendedTextMessage.contextInfo.quotedMessage;
                if (quoted.conversation) {
                    quotedText = quoted.conversation;
                } else if (quoted.extendedTextMessage?.text) {
                    quotedText = quoted.extendedTextMessage.text;
                }
            }

            if (!quotedText && m.quoted) {
                quotedText = m.quoted.text || m.quoted.body || m.quoted.conversation || '';
            }

            quotedText = quotedText.trim();
        } catch (error) {
            return false;
        }

        const isGoodbyeDeleteAllMessage = quotedText && (
            quotedText.includes('HAPUS SEMUA GROUP GOODBYE') || 
            quotedText.includes('👋💥') || 
            quotedText.includes('GOODBYE_DELETE_ALL_UNIQUE_IDENTIFIER_2025_ABC') ||
            (quotedText.includes('PERINGATAN KERAS GOODBYE') && quotedText.includes('goodbye'))
        );

        if (isGoodbyeDeleteAllMessage) {
            return false;
        }

        const isGoodbyeDeleteMessage = quotedText && (
            quotedText.includes('👋 DELETE GROUP GOODBYE 💔') ||
            quotedText.includes('GOODBYE_DELETE_UNIQUE_IDENTIFIER_2025_ABC') ||
            (quotedText.includes('DELETE GROUP GOODBYE') && quotedText.includes('goodbye') && !quotedText.includes('HAPUS SEMUA') && quotedText.includes('hapus goodbye'))
        );

        if (!isGoodbyeDeleteMessage) {
            return false;
        }

        const config = loadConfig();
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe || false;

        if (!checkAccess(senderJid, config, fromMe)) {
            return false;
        }

        let userInput = '';
        try {
            if (m.message?.conversation) {
                userInput = m.message.conversation;
            } else if (m.message?.extendedTextMessage?.text) {
                userInput = m.message.extendedTextMessage.text;
            }

            if (!userInput) {
                userInput = m.text || m.body || '';
            }

            userInput = userInput.trim();
        } catch (error) {
            userInput = '';
        }

        if (!userInput || userInput === '') {
            await Wily(`❌ *INPUT KOSONG*\n\n🔢 Silakan reply dengan nomor yang valid (1, 2, 3, ...)\n💡 Contoh: Reply dengan "1" untuk hapus grup pertama\n\n📝 Debug: Input diterima = "${userInput}"\n⏱️ Timeout dalam 30 detik`, m, hisoka);
            return true;
        }

        const inputNumber = parseInt(userInput);
        if (isNaN(inputNumber) || inputNumber < 1 || !Number.isInteger(inputNumber)) {
            await Wily(`❌ *INPUT TIDAK VALID*\n\n🔢 Masukkan nomor yang valid (1, 2, 3, ...)\n💡 Contoh: Reply dengan "1" untuk hapus grup pertama\n🔢 Input Anda: "${userInput}"\n📝 Parsed Number: ${inputNumber}\n\n⏱️ Timeout dalam 30 detik`, m, hisoka);
            return true;
        }

        const goodbyeGroups = loadGoodbyeGroups();
        const groups = goodbyeGroups.GOODBYE_GROUPS || [];
        const selectedIndex = parseInt(userInput) - 1;

        if (selectedIndex >= groups.length || selectedIndex < 0) {
            await Wily(`❌ *NOMOR MELEBIHI JUMLAH GROUP*\n\n📊 Jumlah grup: ${groups.length}\n🔢 Nomor yang dimasukkan: ${userInput}\n\n💡 Pilih nomor antara 1-${groups.length}`, m, hisoka);
            return true;
        }

        // Hapus grup yang dipilih
        const deletedGroup = groups.splice(selectedIndex, 1)[0];
        const saveResult = saveGoodbyeGroups(goodbyeGroups);

        if (saveResult) {
            await Wily(`✅ *GROUP BERHASIL DIHAPUS*\n\n🗑️ *Group yang dihapus:*\n• Nama: ${deletedGroup.name}\n• ID: ${deletedGroup.id}\n• Ditambahkan: ${deletedGroup.dateAdded}\n• Oleh: ${deletedGroup.addedBy}\n\n📊 *Sisa groups:* ${groups.length}\n💾 *Data tersimpan ke:* DATA/goodbyeGroups.json ✅\n\n🚫 Goodbye feature tidak akan aktif lagi di grup ini`, m, hisoka);
        } else {
            await Wily('❌ Gagal menyimpan perubahan ke DATA/goodbyeGroups.json', m, hisoka);
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Handler untuk goodbye command
export async function handleGoodbyeCommand(m, { hisoka, text, command }) {
    try {
        const config = loadConfig();

        let senderJid;
        try {
            senderJid = m.key?.participant || m.key?.remoteJid || m.sender || '';
        } catch (error) {
            senderJid = '';
        }

        const fromMe = m.key?.fromMe || false;

        if (!senderJid || !checkAccess(senderJid, config, fromMe)) {
            if (config.mode === 'public' && !fromMe) {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat menggunakan fitur goodbye\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text ? text.trim().split(' ') : [];
        const subCommand = args[0]?.toLowerCase();

        if (!subCommand) {
            const currentStatus = config.GOODBYE_ENABLED ? 'ON ✅' : 'OFF ❌';
            const allGroupsStatus = config.GOODBYE_ALL_GROUPS ? 'ON ✅' : 'OFF ❌';

            const helpText = `╭━━━『 👋 GOODBYE MANAGEMENT 』━━━❀
┃ 
┃ 📋 *Command List:*
┃ ▫️ \`.goodbye on/off\` - Toggle goodbye feature
┃ ▫️ \`.goodbye add\` - Add current group to goodbye list
┃ ▫️ \`.goodbye addlink\` - Add group via invite link
┃ ▫️ \`.goodbye list\` - Show active groups
┃ ▫️ \`.goodbye del\` - Delete groups from list
┃ ▫️ \`.goodbye del all\` - Delete all groups with confirmation
┃ ▫️ \`.goodbye all\` - Toggle all groups mode
┃ 
┃ 📊 *Current Status:*
┃ ▫️ Goodbye Feature: ${currentStatus}
┃ ▫️ All Groups Mode: ${allGroupsStatus}
┃ 
┃ 💡 *Features:*
┃ ▫️ Auto goodbye message untuk member yang keluar
┃ ▫️ Beautiful design dengan profile picture
┃ ▫️ Group info dan member statistics
┃ ▫️ Time-based farewell (pagi/siang/malam)
┃ ▫️ Mention member yang keluar otomatis
┃ ▫️ Deteksi kicked vs keluar sendiri
┃ 
┃ 🎯 *How It Works:*
┃ ▫️ Ketika ada member leave grup
┃ ▫️ Bot akan kirim pesan goodbye cantik
┃ ▫️ Include info grup dan pesan perpisahan
┃ ▫️ Dengan animasi dan contextInfo
┃ ▫️ Membedakan cara keluar
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🔧 *Example Usage:*
• \`.goodbye on\` - Aktifkan goodbye
• \`.goodbye add\` - Daftarkan grup ini
• \`.goodbye addlink https://chat.whatsapp.com/xxx\` - Add via link
• \`.goodbye all\` - Aktif di semua grup`;

            await Wily(helpText, m, hisoka);
            return;
        }

        if (subCommand === 'on' || subCommand === 'off') {
            const enabled = subCommand === 'on';

            if (config.GOODBYE_ENABLED === enabled) {
                const statusText = enabled ? 'sudah aktif' : 'sudah nonaktif';
                await Wily(`ℹ️ *GOODBYE FEATURE ${statusText.toUpperCase()}*\n\n🔄 Status saat ini: ${enabled ? 'ON ✅' : 'OFF ❌'}\n💡 Tidak ada perubahan yang diperlukan`, m, hisoka);
                return;
            }

            config.GOODBYE_ENABLED = enabled;
            const saveResult = saveConfig(config);

            if (saveResult) {
                const statusText = enabled ? 
                    `✅ *GOODBYE FEATURE: ON*

👋 *Fitur Aktif:*
┃ ▫️ Auto goodbye untuk member yang keluar
┃ ▫️ Design cantik dengan profile picture
┃ ▫️ Info grup dan member statistics
┃ ▫️ Time-based farewell
┃ ▫️ Auto mention member yang keluar
┃ ▫️ Deteksi kicked vs keluar sendiri

💾 *Status:* Tersimpan ke config.json ✅

💡 *Tips:*
• Gunakan \`.goodbye add\` untuk daftarkan grup
• Atau \`.goodbye all\` untuk aktif di semua grup` :
                    `❌ *GOODBYE FEATURE: OFF*

🔇 *Fitur Nonaktif:*
┃ ▫️ Bot tidak akan kirim goodbye message
┃ ▫️ Member keluar tanpa pesan perpisahan
┃ ▫️ Semua grup kembali ke mode normal

💾 *Status:* Tersimpan ke config.json ✅

🔄 *Untuk mengaktifkan:* \`.goodbye on\``;

                await Wily(statusText, m, hisoka);
            } else {
                await Wily('❌ Gagal menyimpan pengaturan ke config.json', m, hisoka);
            }
            return;
        }

        if (subCommand === 'add') {
            const groupId = m.key?.remoteJid || m.from || '';
            if (!groupId || !groupId.endsWith('@g.us')) {
                await Wily('❌ *COMMAND HANYA UNTUK GROUP*\n\n🚫 Command ini hanya bisa digunakan di grup\n💡 Pindah ke grup yang ingin didaftarkan goodbye', m, hisoka);
                return;
            }

            const goodbyeGroups = loadGoodbyeGroups();

            const existingGroup = goodbyeGroups.GOODBYE_GROUPS.find(g => g.id === groupId);
            if (existingGroup) {
                const groupName = await getGroupName(hisoka, groupId);
                await Wily(`ℹ️ *GROUP SUDAH TERDAFTAR*\n\n📝 *Grup:* ${groupName}\n🆔 *ID:* ${groupId}\n⏰ *Didaftarkan:* ${existingGroup.dateAdded}\n\n✅ Goodbye feature sudah aktif di grup ini`, m, hisoka);
                return;
            }

            const groupName = await getGroupName(hisoka, groupId);
            const newGroup = {
                id: groupId,
                name: groupName,
                dateAdded: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                addedBy: sensorNumber(senderJid.split('@')[0])
            };

            goodbyeGroups.GOODBYE_GROUPS.push(newGroup);
            const saveResult = saveGoodbyeGroups(goodbyeGroups);

            if (saveResult) {
                await Wily(`✅ *GROUP BERHASIL DITAMBAHKAN*

📝 *Detail Group:*
┃ ▫️ Nama: ${groupName}
┃ ▫️ ID: ${groupId}
┃ ▫️ Ditambahkan: ${newGroup.dateAdded}
┃ ▫️ Oleh: ${newGroup.addedBy}

💾 *Data tersimpan ke:* DATA/goodbyeGroups.json ✅

👋 *Goodbye feature akan aktif di grup ini!*
💡 Pastikan goodbye feature sudah ON dengan \`.goodbye on\``, m, hisoka);
            } else {
                await Wily('❌ Gagal menyimpan data grup ke DATA/goodbyeGroups.json', m, hisoka);
            }
            return;
        }

        if (subCommand === 'addlink') {
            const groupLink = args[1];

            if (!groupLink) {
                await Wily(`❌ *LINK GROUP DIPERLUKAN*\n\n💡 *Cara menggunakan:*\n\`.goodbye addlink https://chat.whatsapp.com/xxxxx\`\n\n📝 *Format yang didukung:*\n• https://chat.whatsapp.com/xxxxx\n• https://wa.me/xxxxx\n• https://whatsapp.com/accept?code=xxxxx\n\n🔗 Dapatkan link dari grup → Info Grup → Invite Link`, m, hisoka);
                return;
            }

            const groupCode = extractGroupIdFromLink(groupLink);
            if (!groupCode) {
                await Wily(`❌ *LINK GROUP TIDAK VALID*\n\n🔗 Link yang Anda berikan: ${groupLink}\n\n💡 *Format yang benar:*\n• https://chat.whatsapp.com/xxxxx\n• https://wa.me/xxxxx\n• https://whatsapp.com/accept?code=xxxxx\n\n📝 Pastikan link adalah invite link WhatsApp Group yang valid`, m, hisoka);
                return;
            }

            try {
                const joinResult = await hisoka.groupAcceptInvite(groupCode);
                const groupId = joinResult;

                const groupName = await getGroupName(hisoka, groupId);
                const goodbyeGroups = loadGoodbyeGroups();

                const existingGroup = goodbyeGroups.GOODBYE_GROUPS.find(g => g.id === groupId);
                if (existingGroup) {
                    await Wily(`ℹ️ *GROUP SUDAH TERDAFTAR*\n\n📝 *Grup:* ${groupName}\n🆔 *ID:* ${groupId}\n⏰ *Didaftarkan:* ${existingGroup.dateAdded}\n\n✅ Bot sudah join dan goodbye feature sudah aktif`, m, hisoka);
                    return;
                }

                const newGroup = {
                    id: groupId,
                    name: groupName,
                    dateAdded: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    addedBy: sensorNumber(senderJid.split('@')[0])
                };

                goodbyeGroups.GOODBYE_GROUPS.push(newGroup);
                const saveResult = saveGoodbyeGroups(goodbyeGroups);

                if (saveResult) {
                    await Wily(`✅ *BOT BERHASIL JOIN & GROUP DITAMBAHKAN*

🎉 *Detail Group:*
┃ ▫️ Nama: ${groupName}
┃ ▫️ ID: ${groupId}
┃ ▫️ Link: ${groupLink}
┃ ▫️ Ditambahkan: ${newGroup.dateAdded}
┃ ▫️ Oleh: ${newGroup.addedBy}

💾 *Data tersimpan ke:* DATA/goodbyeGroups.json ✅
🤖 *Status:* Bot berhasil join grup melalui invite link

👋 *Goodbye feature akan aktif di grup ini!*
💡 Pastikan goodbye feature sudah ON dengan \`.goodbye on\``, m, hisoka);
                } else {
                    await Wily('✅ Bot berhasil join grup, tapi gagal menyimpan data ke goodbyeGroups.json', m, hisoka);
                }

            } catch (error) {
                await Wily(`❌ *GAGAL JOIN GROUP*\n\n🔗 Link: ${groupLink}\n❌ Error: ${error.message}\n\n💡 *Kemungkinan penyebab:*\n• Link sudah expired\n• Bot sudah di grup tersebut\n• Grup sudah full/private\n• Link tidak valid\n\n🔄 Coba dapatkan link invite yang baru`, m, hisoka);
            }
            return;
        }

        if (subCommand === 'list') {
            const goodbyeGroups = loadGoodbyeGroups();
            const groups = goodbyeGroups.GOODBYE_GROUPS || [];

            if (groups.length === 0) {
                await Wily(`📋 *DAFTAR GROUP GOODBYE*

❌ *Belum ada grup yang terdaftar*

💡 *Cara menambah grup:*
• Masuk ke grup yang diinginkan
• Ketik \`.goodbye add\`
• Atau gunakan \`.goodbye addlink [link]\`
• Atau gunakan \`.goodbye all\` untuk semua grup

🔧 *Status All Groups:* ${config.GOODBYE_ALL_GROUPS ? 'ON ✅' : 'OFF ❌'}`, m, hisoka);
                return;
            }

            let listText = `╭━━━『 📋 DAFTAR GROUP GOODBYE 』━━━❀
┃ 
┃ 📊 *Total Groups:* ${groups.length}
┃ 🔧 *All Groups Mode:* ${config.GOODBYE_ALL_GROUPS ? 'ON ✅' : 'OFF ❌'}
┃ 
`;

            groups.forEach((group, index) => {
                listText += `┃ ${index + 1}️⃣ *${group.name}*
┃    🆔 ID: ${group.id}
┃    📅 Added: ${group.dateAdded}
┃    👤 By: ${group.addedBy}
┃ 
`;
            });

            listText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

💡 *Untuk hapus grup:* \`.goodbye del\`
🗑️ *Untuk hapus semua:* \`.goodbye del all\`
🎯 *Untuk semua grup:* \`.goodbye all\``;

            await Wily(listText, m, hisoka);
            return;
        }

        if (subCommand === 'del') {
            const goodbyeGroups = loadGoodbyeGroups();
            const groups = goodbyeGroups.GOODBYE_GROUPS || [];

            if (groups.length === 0) {
                await Wily('❌ *TIDAK ADA GROUP UNTUK DIHAPUS*\n\n📋 Belum ada grup yang terdaftar dalam goodbye list\n💡 Gunakan `.goodbye add` untuk menambah grup', m, hisoka);
                return;
            }

            if (args[1] && args[1].toLowerCase() === 'all') {
                let deleteAllText = `╭━━━『 👋💥 HAPUS SEMUA GROUP GOODBYE 💔 』━━━❀
┃ 
┃ ⚠️ *PERINGATAN KERAS GOODBYE!*
┃ 🚨 Anda akan menghapus SEMUA data grup goodbye
┃ <!-- GOODBYE_DELETE_ALL_UNIQUE_IDENTIFIER_2025_ABC -->
┃ 
┃ 📊 *Total grup goodbye yang akan dihapus:* ${groups.length}
┃ 
`;

                groups.forEach((group, index) => {
                    deleteAllText += `┃ ${index + 1}️⃣ ${group.name}
┃    🆔 ${group.id}
┃ 
`;
                });

                deleteAllText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🔥 *KONFIRMASI DIPERLUKAN:*
Apakah Anda yakin akan menghapus SEMUA data grup goodbye?

💬 *Cara konfirmasi:*
Reply pesan ini dengan **Y** untuk Ya atau **N** untuk Tidak

⚠️ *PERHATIAN:*
• Semua ${groups.length} grup akan dihapus permanent
• Data tidak dapat dikembalikan
• Goodbye feature akan nonaktif di semua grup
• Backup otomatis akan dibuat

🚫 *Timeout:* 30 detik`;

                await Wily(deleteAllText, m, hisoka);
                return;
            }

            // Jika ada argumen nomor langsung
            if (args[1] && !isNaN(args[1])) {
                const selectedIndex = parseInt(args[1]) - 1;

                if (selectedIndex >= groups.length || selectedIndex < 0) {
                    await Wily(`❌ *NOMOR MELEBIHI JUMLAH GROUP*\n\n📊 Jumlah grup: ${groups.length}\n🔢 Nomor yang dimasukkan: ${args[1]}\n\n💡 Pilih nomor antara 1-${groups.length}`, m, hisoka);
                    return;
                }

                // Hapus grup yang dipilih dari GOODBYE groups
                const deletedGroup = groups.splice(selectedIndex, 1)[0];

                // PENTING: Pastikan menyimpan ke goodbyeGroups.json BUKAN welcomeGroups.json
                const saveResult = saveGoodbyeGroups(goodbyeGroups);

                if (saveResult) {
                    await Wily(`✅ *GOODBYE GROUP BERHASIL DIHAPUS*\n\n🗑️ *Group yang dihapus:*\n• Nama: ${deletedGroup.name}\n• ID: ${deletedGroup.id}\n• Ditambahkan: ${deletedGroup.dateAdded}\n• Oleh: ${deletedGroup.addedBy}\n\n📊 *Sisa goodbye groups:* ${groups.length}\n💾 *Data tersimpan ke:* DATA/goodbyeGroups.json ✅\n\n🚫 Goodbye feature tidak akan aktif lagi di grup ini`, m, hisoka);
                } else {
                    await Wily('❌ Gagal menyimpan perubahan ke DATA/goodbyeGroups.json', m, hisoka);
                }
                return;
            }

            let deleteText = `╭━━━『 👋 DELETE GROUP GOODBYE 💔 』━━━❀
┃ 
┃ 📋 *Pilih nomor untuk hapus goodbye:*
┃ <!-- GOODBYE_DELETE_UNIQUE_IDENTIFIER_2025_ABC -->
┃ 
`;

            groups.forEach((group, index) => {
                const groupName = group.name || 'Unknown Group';
                const groupId = group.id || 'Unknown ID';
                const dateAdded = group.dateAdded || 'Unknown Date';

                deleteText += `┃ ${index + 1}️⃣ *${groupName}*
┃    🆔 ${groupId}
┃    📅 ${dateAdded}
┃ 
`;
            });

            deleteText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

💬 *Cara hapus goodbye:*
Reply pesan ini dengan nomor yang ingin dihapus
atau gunakan: .goodbye del [nomor]

⏱️ *Contoh goodbye:* 
• Reply dengan "1" untuk hapus goodbye grup pertama
• Atau ketik ".goodbye del 1"
• Ketik ".goodbye del all" untuk hapus semua goodbye
🚫 *Timeout:* 30 detik`;

            await Wily(deleteText, m, hisoka);
            return;
        }

        if (subCommand === 'all') {
            const currentStatus = config.GOODBYE_ALL_GROUPS;
            const newStatus = !currentStatus;

            config.GOODBYE_ALL_GROUPS = newStatus;
            const saveResult = saveConfig(config);

            if (saveResult) {
                const statusText = newStatus ? 
                    `✅ *ALL GROUPS MODE: ON*

🌐 *Fitur Aktif:*
┃ ▫️ Goodbye aktif di SEMUA grup
┃ ▫️ Tidak perlu daftar grup satu-satu
┃ ▫️ Otomatis untuk grup baru
┃ ▫️ Override goodbye groups list

💾 *Status:* Tersimpan ke config.json ✅

⚡ *Efek:*
• Bot akan goodbye di semua grup yang dimasuki
• Tidak perlu gunakan \`.goodbye add\` lagi
• Mode ini lebih praktis untuk bot public

⚠️ *Catatan:* Pastikan goodbye feature ON dengan \`.goodbye on\`` :
                    `❌ *ALL GROUPS MODE: OFF*

🎯 *Fitur Nonaktif:*
┃ ▫️ Goodbye hanya di grup terdaftar
┃ ▫️ Gunakan goodbye groups list
┃ ▫️ Kontrol manual per grup
┃ ▫️ Mode selektif aktif

💾 *Status:* Tersimpan ke config.json ✅

🔄 *Efek:*
• Bot hanya goodbye di grup yang didaftarkan
• Gunakan \`.goodbye add\` untuk daftar grup
• Mode ini lebih selektif dan terkontrol

💡 *Untuk aktifkan semua:* \`.goodbye all\``;

                await Wily(statusText, m, hisoka);
            } else {
                await Wily('❌ Gagal menyimpan pengaturan all groups ke config.json', m, hisoka);
            }
            return;
        }

        await Wily(`❌ *COMMAND TIDAK VALID*\n\n📋 *Available commands:*\n• \`.goodbye on/off\`\n• \`.goodbye add\`\n• \`.goodbye addlink\`\n• \`.goodbye list\`\n• \`.goodbye del\`\n• \`.goodbye del all\`\n• \`.goodbye all\`\n\n💡 Gunakan \`.goodbye\` untuk help`, m, hisoka);

    } catch (error) {
        try {
            await Wily(`❌ Terjadi kesalahan saat memproses command goodbye: ${error.message || 'Unknown error'}`, m, hisoka);
        } catch (replyError) {
            // Silent error handling untuk avoid infinite loop
        }
    }
}

// Global cache untuk prevent duplikat dalam timeframe tertentu
const goodbyeCache = new Map();
const GOODBYE_COOLDOWN = 5000; // 5 detik cooldown per participant per group

// Fungsi untuk generate unique key
function generateGoodbyeKey(groupId, participant) {
    return `${groupId}-${participant}`;
}

// Fungsi untuk cek apakah goodbye sudah dikirim recently
function isGoodbyeRecent(groupId, participant) {
    const key = generateGoodbyeKey(groupId, participant);
    const lastSent = goodbyeCache.get(key);
    
    if (!lastSent) {
        return false;
    }
    
    const now = Date.now();
    const timeDiff = now - lastSent;
    
    // Jika masih dalam cooldown period, skip
    if (timeDiff < GOODBYE_COOLDOWN) {
        return true;
    }
    
    // Hapus entry lama jika sudah lewat cooldown
    goodbyeCache.delete(key);
    return false;
}

// Fungsi untuk mark goodbye as sent
function markGoodbyeSent(groupId, participant) {
    const key = generateGoodbyeKey(groupId, participant);
    goodbyeCache.set(key, Date.now());
    
    // Cleanup old entries (older than 10 seconds)
    setTimeout(() => {
        const now = Date.now();
        for (const [cacheKey, timestamp] of goodbyeCache.entries()) {
            if (now - timestamp > 10000) {
                goodbyeCache.delete(cacheKey);
            }
        }
    }, 10000);
}

// Fungsi untuk handle goodbye message ketika ada member keluar
export async function handleGoodbyeMessage(hisoka, groupId, participants, author = null) {
    try {
        const config = loadConfig();

        if (!config.GOODBYE_ENABLED) {
            return false;
        }

        let isAllowed = false;

        if (config.GOODBYE_ALL_GROUPS) {
            isAllowed = true;
        } else {
            const goodbyeGroups = loadGoodbyeGroups();
            isAllowed = goodbyeGroups.GOODBYE_GROUPS.some(group => group.id === groupId);
        }

        if (!isAllowed) {
            return false;
        }

        // Validate participants
        if (!participants || !Array.isArray(participants)) {
            return false;
        }

        // Hapus duplikat participants dan filter yang valid
        const uniqueParticipants = [...new Set(participants)].filter(p => 
            p && typeof p === 'string' && p.includes('@')
        );
        
        // Jika tidak ada participants yang valid, return
        if (uniqueParticipants.length === 0) {
            return false;
        }

        // Filter participants yang belum dapat goodbye recently
        const validParticipants = uniqueParticipants.filter(participant => {
            if (isGoodbyeRecent(groupId, participant)) {
                return false;
            }
            return true;
        });

        if (validParticipants.length === 0) {
            return false;
        }

        // Mark all participants as processed immediately to prevent race conditions
        validParticipants.forEach(participant => {
            markGoodbyeSent(groupId, participant);
        });

        const groupMetadata = await hisoka.groupMetadata(groupId);
        const groupName = groupMetadata.subject;
        const memberCount = groupMetadata.participants.length;
        const adminCount = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length;
        const ownerTag = groupMetadata.owner ? `@${groupMetadata.owner.split('@')[0]}` : '';
        const groupCreationDate = groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '';

        const jakartaTime = new Date().toLocaleString('id-ID', { 
            timeZone: 'Asia/Jakarta', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const jakartaDate = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

        let successCount = 0;

        for (const participant of validParticipants) {
            try {
                const userName = participant.split('@')[0];
                let ppUser;

                try {
                    ppUser = await hisoka.profilePictureUrl(participant, 'image');
                } catch (error) {
                    ppUser = 'https://files.catbox.moe/mxohav.gif';
                }

                const farewell = '*Selamat Tinggal!*';
                const farewellEmoji = '👋';

                // Tentukan cara keluar
                let leaveMethod = '';
                let leaveMethodIcon = '';
                let authorInfo = '';

                if (author && author !== participant) {
                    // Di-kick oleh admin/member
                    const authorName = await getUserName(hisoka, author);
                    const isAuthorAdmin = await isGroupAdmin(hisoka, groupId, author);
                    
                    if (isAuthorAdmin) {
                        leaveMethod = `Di-kick oleh Admin`;
                        leaveMethodIcon = '🚫';
                        authorInfo = `👑 𝐃𝐢-𝐤𝐢𝐜𝐤 𝐎𝐥𝐞𝐡 : *@${author.split('@')[0]}* (Admin)`;
                    } else {
                        leaveMethod = `Di-kick oleh Member`;
                        leaveMethodIcon = '🚪';
                        authorInfo = `👤 𝐃𝐢-𝐤𝐢𝐜𝐤 𝐎𝐥𝐞𝐡 : *@${author.split('@')[0]}* (Member)`;
                    }
                } else {
                    leaveMethod = 'Keluar dengan sendirinya';
                    leaveMethodIcon = '🚶';
                }

                const goodbyeText = `> 💔 SAMPAI JUMPA LAGI

👋 𝐇𝐚𝐥𝐥𝐨 : @${userName}!
${farewellEmoji} 𝐒𝐞𝐥𝐚𝐦𝐚𝐭 : ${farewell}
${leaveMethodIcon} 𝐔𝐬𝐞𝐫 : *${leaveMethod}*${authorInfo ? `\n${authorInfo}` : ''}
🏡 𝐍𝐚𝐦𝐚 𝐆𝐫𝐮𝐩 : *${groupName}*
👥 𝐒𝐢𝐬𝐚 𝐌𝐞𝐦𝐛𝐞𝐫 : *${memberCount}* 𝐨𝐫𝐚𝐧𝐠
👑 𝐉𝐮𝐦𝐥𝐚𝐡 𝐀𝐝𝐦𝐢𝐧 : *${adminCount}* 𝐨𝐫𝐚𝐧𝐠${ownerTag ? `\n🔰 𝐆𝐫𝐮𝐩 𝐏𝐞𝐦𝐢𝐥𝐢𝐤 : *${ownerTag}*` : ''}${groupCreationDate ? `\n📆 𝐆𝐫𝐮𝐩 𝐃𝐢𝐛𝐮𝐚𝐭 𝐏𝐚𝐝𝐚 : *${groupCreationDate}*` : ''}
📅 𝐒𝐚𝐚𝐭 𝐈𝐧𝐢 𝐓𝐚𝐧𝐠𝐠𝐚𝐥 : *${jakartaDate}*
⏰ 𝐒𝐚𝐚𝐭 𝐈𝐧𝐢 𝐖𝐚𝐤𝐭𝐮 : *${jakartaTime}* 𝐖𝐈𝐁

> 💭 PESAN PERPISAHAN:
• *Terima kasih sudah bergabung dengan kami*
• *Semoga di luar sana lebih baik*
• *Pintu grup ini selalu terbuka untuk kamu*
• *Jaga kesehatan dan semangat terus*

> 🌟 KENANGAN BERSAMA:
• *Setiap diskusi adalah pembelajaran*
• *Setiap tawa adalah kebahagiaan*
• *Setiap sharing adalah berkah*

> ✨ Sampai jumpa di kesempatan lain!`;

                // Array mentions untuk include author jika ada
                const mentions = [participant];
                if (author && author !== participant && authorInfo) {
                    mentions.push(author);
                }

                const messageContent = {
                    text: goodbyeText,
                    contextInfo: {
                        quotedMessage: {
                            conversation: `*_Dikembangkan Oleh @WilyKun Bot_* *${jakartaTime} WIB*`
                        },
                        mentionedJid: mentions,
                        participant: "6289688206739@s.whatsapp.net",
                        remoteJid: "120363312297133690@g.us",
                        forwardingScore: 999,
                        isForwarded: true,
                        externalAdReply: {
                            title: `👋 GOODBYE FROM ${groupName.toUpperCase()}`,
                            body: `${leaveMethodIcon} ${leaveMethod} • ${jakartaDate}`,
                            thumbnailUrl: ppUser || 'https://files.catbox.moe/mxohav.gif',
                            sourceUrl: "https://wa.me/6289688206739",
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        },
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363312297133690@newsletter",
                            newsletterName: "WilyKun Official Bot"
                        }
                    }
                };

                await hisoka.sendMessage(groupId, messageContent);
                successCount++;
                
                // Delay antar pesan untuk avoid spam
                if (validParticipants.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

            } catch (participantError) {
                // Hapus dari cache jika gagal kirim, biar bisa retry nanti
                const key = generateGoodbyeKey(groupId, participant);
                goodbyeCache.delete(key);
            }
        }

        // Return final result
        if (successCount > 0) {
            return true;
        } else {
            return false;
        }

    } catch (error) {
        return false;
    }
}

export const goodbyeInfo = {
    command: ['goodbye'],
    description: 'Manage goodbye message untuk grup'
};

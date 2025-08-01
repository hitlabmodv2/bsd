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
        WELCOME_ENABLED: false,
        WELCOME_ALL_GROUPS: false
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

// Fungsi untuk load welcome groups data
function loadWelcomeGroups() {
    try {
        const welcomeGroupsPath = path.join(process.cwd(), 'DATA', 'welcomeGroups.json');
        if (fs.existsSync(welcomeGroupsPath)) {
            const data = fs.readFileSync(welcomeGroupsPath, 'utf8');
            return JSON.parse(data);
        }
        return { WELCOME_GROUPS: [] };
    } catch (error) {
        return { WELCOME_GROUPS: [] };
    }
}

// Fungsi untuk save welcome groups data
function saveWelcomeGroups(data) {
    try {
        const dataDir = path.join(process.cwd(), 'DATA');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const welcomeGroupsPath = path.join(dataDir, 'welcomeGroups.json');
        fs.writeFileSync(welcomeGroupsPath, JSON.stringify(data, null, 2));
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
            return isOwner; // Welcome feature adalah owner-only
        }

        return isOwner;
    } catch (error) {
        return false;
    }
}

// Map untuk menyimpan timestamp welcome terakhir per participant
const welcomeThrottle = new Map();
const WELCOME_THROTTLE_TIME = 60000; // 1 menit throttle

// Fungsi untuk mengecek apakah participant bisa mendapat welcome message
function canSendWelcome(participant) {
    const now = Date.now();
    const lastWelcome = welcomeThrottle.get(participant);

    if (!lastWelcome || (now - lastWelcome) > WELCOME_THROTTLE_TIME) {
        welcomeThrottle.set(participant, now);
        return true;
    }

    return false;
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
        // Pattern untuk WhatsApp group invite link
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

// Fungsi untuk mendeteksi cara bergabung grup dengan lebih akurat
async function detectJoinMethod(hisoka, groupId, newParticipant, author, inviteCode) {
    try {
        // Priority 1: Jika ada inviteCode yang valid
        if (inviteCode && typeof inviteCode === 'string' && inviteCode.trim() !== '') {
            return {
                method: 'link',
                icon: '🔗',
                description: '𝐌𝐚𝐬𝐮𝐤 𝐕𝐢𝐚 𝐋𝐢𝐧𝐤 𝐆𝐫𝐮𝐩',
                authorInfo: ''
            };
        }

        // Priority 2: Jika author sama dengan participant (join sendiri via link)
        if (author === newParticipant || !author) {
            return {
                method: 'link',
                icon: '🔗',
                description: '𝐌𝐚𝐬𝐮𝐤 𝐕𝐢𝐚 𝐋𝐢𝐧𝐤 𝐆𝐫𝐮𝐩',
                authorInfo: ''
            };
        }

        // Priority 3: Jika ada author yang berbeda (ditambahkan oleh orang lain)
        if (author && author !== newParticipant) {
            const authorName = await getUserName(hisoka, author);
            const isAuthorAdmin = await isGroupAdmin(hisoka, groupId, author);

            if (isAuthorAdmin) {
                return {
                    method: 'admin_invite',
                    icon: '👑',
                    description: 'Ditambahkan oleh Admin',
                    authorInfo: `👤 𝐃𝐢𝐭𝐚𝐦𝐛𝐚𝐡𝐤𝐚𝐧 𝐎𝐥𝐞𝐡 : *@${author.split('@')[0]}* (Admin)`
                };
            } else {
                return {
                    method: 'member_invite',
                    icon: '👥',
                    description: 'Ditambahkan oleh Member',
                    authorInfo: `👤 𝐃𝐢𝐭𝐚𝐦𝐛𝐚𝐡𝐤𝐚𝐧 𝐎𝐥𝐞𝐡 : *@${author.split('@')[0]}* (Member)`
                };
            }
        }

        // Default fallback
        return {
            method: 'unknown',
            icon: '🚪',
            description: 'Bergabung ke grup',
            authorInfo: ''
        };

    } catch (error) {
        return {
            method: 'unknown',
            icon: '🚪',
            description: 'Bergabung ke grup',
            authorInfo: ''
        };
    }
}

// Handler untuk welcome delete all confirmation
export async function handleWelcomeDeleteAllConfirmation(m, { hisoka }) {
    try {
        // Cek apakah ini adalah reply ke pesan delete all
        if (!m.quoted && !m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            return false;
        }

        // Ambil teks dari quoted message
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

        // Cek apakah reply ke pesan delete all welcome
        const isWelcomeDeleteAllMessage = quotedText && (
            quotedText.includes('HAPUS SEMUA GROUP WELCOME') || 
            quotedText.includes('🗑️💥') || 
            quotedText.includes('WELCOME_DELETE_ALL_UNIQUE_IDENTIFIER_2025_XWZ') ||
            (quotedText.includes('PERINGATAN KERAS WELCOME') && quotedText.includes('welcome'))
        );

        if (!isWelcomeDeleteAllMessage) {
            return false;
        }

        const config = loadConfig();
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe || false;

        // Check access permission
        if (!checkAccess(senderJid, config, fromMe)) {
            return false;
        }

        // Ambil input user
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

        // Validasi input Y atau N
        if (!userInput || (userInput !== 'y' && userInput !== 'n')) {
            await Wily(`❌ *INPUT TIDAK VALID*\n\n🔤 Silakan reply dengan "Y" untuk ya atau "N" untuk tidak\n💡 Input Anda: "${userInput}"\n\n⏱️ Timeout dalam 30 detik`, m, hisoka);
            return true;
        }

        if (userInput === 'n') {
            await Wily(`❌ *PENGHAPUSAN DIBATALKAN*\n\n🔒 Semua data grup welcome tetap aman\n💡 Tidak ada perubahan yang dilakukan\n\n✅ Operasi dibatalkan oleh user`, m, hisoka);
            return true;
        }

        // Jika Y, hapus semua grup
        const welcomeGroups = loadWelcomeGroups();
        const totalGroups = welcomeGroups.WELCOME_GROUPS.length;

        if (totalGroups === 0) {
            await Wily(`ℹ️ *TIDAK ADA DATA UNTUK DIHAPUS*\n\n📋 Welcome groups sudah kosong\n💡 Tidak ada grup yang perlu dihapus`, m, hisoka);
            return true;
        }

        // Reset welcome groups
        welcomeGroups.WELCOME_GROUPS = [];
        const saveResult = saveWelcomeGroups(welcomeGroups);

        if (saveResult) {
            await Wily(`✅ *SEMUA WELCOME GROUP BERHASIL DIHAPUS*\n\n🗑️ *Data welcome yang dihapus:*\n• Total grup welcome: ${totalGroups}\n• Semua data welcome group\n• File: DATA/welcomeGroups.json\n\n💾 *Status:* Data welcome berhasil direset ✅\n🔄 *Efek:* Welcome feature tidak aktif di grup manapun\n\n💡 *Tips:* Gunakan \`.welcome add\` untuk menambah grup welcome baru\n\n⚠️ *Catatan:* Goodbye feature tidak terpengaruh oleh ini`, m, hisoka);
        } else {
            await Wily('❌ Gagal menyimpan perubahan welcome ke DATA/welcomeGroups.json', m, hisoka);
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Handler untuk welcome delete confirmation
export async function handleWelcomeDeleteConfirmation(m, { hisoka }) {
    try {
        // Cek apakah ini adalah reply ke pesan delete - dengan multiple checks
        if (!m.quoted && !m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            return false;
        }

        // Ambil teks dari quoted message dengan semua kemungkinan cara
        let quotedText = '';
        try {
            // Method 1: Direct quoted message
            if (m.quoted?.message) {
                if (m.quoted.message.conversation) {
                    quotedText = m.quoted.message.conversation;
                } else if (m.quoted.message.extendedTextMessage?.text) {
                    quotedText = m.quoted.message.extendedTextMessage.text;
                }
            }

            // Method 2: Dari contextInfo quoted message
            if (!quotedText && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = m.message.extendedTextMessage.contextInfo.quotedMessage;
                if (quoted.conversation) {
                    quotedText = quoted.conversation;
                } else if (quoted.extendedTextMessage?.text) {
                    quotedText = quoted.extendedTextMessage.text;
                }
            }

            // Method 3: Fallback ke properti lain
            if (!quotedText && m.quoted) {
                quotedText = m.quoted.text || m.quoted.body || m.quoted.conversation || '';
            }

            quotedText = quotedText.trim();
        } catch (error) {
            return false;
        }

        // PRIORITAS: Cek dulu apakah ini adalah reply untuk WELCOME DELETE ALL
        const isWelcomeDeleteAllMessage = quotedText && (
            quotedText.includes('🗑️💥 HAPUS SEMUA GROUP WELCOME 🎉') || 
            quotedText.includes('WELCOME_DELETE_ALL_UNIQUE_IDENTIFIER_2025_XWZ') ||
            (quotedText.includes('HAPUS SEMUA GROUP WELCOME') && quotedText.includes('welcome') && quotedText.includes('PERINGATAN KERAS WELCOME'))
        );

        // Jika ini adalah reply untuk delete all, JANGAN handle di sini
        if (isWelcomeDeleteAllMessage) {
            return false; // Biarkan handleWelcomeDeleteAllConfirmation yang handle
        }

        // Cek apakah reply ke pesan delete welcome biasa dengan identifier unik
        const isWelcomeDeleteMessage = quotedText && (
            quotedText.includes('🗑️ DELETE GROUP WELCOME 🎉') ||
            quotedText.includes('WELCOME_DELETE_UNIQUE_IDENTIFIER_2025_XWZ') ||
            (quotedText.includes('DELETE GROUP WELCOME') && quotedText.includes('welcome') && !quotedText.includes('HAPUS SEMUA') && quotedText.includes('hapus welcome'))
        );

        if (!isWelcomeDeleteMessage) {
            return false;
        }

        const config = loadConfig();
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe || false;

        // Check access permission
        if (!checkAccess(senderJid, config, fromMe)) {
            return false;
        }

        // Ambil input user dengan semua kemungkinan cara
        let userInput = '';
        try {
            // Method 1: Dari message structure utama
            if (m.message?.conversation) {
                userInput = m.message.conversation;
            } else if (m.message?.extendedTextMessage?.text) {
                userInput = m.message.extendedTextMessage.text;
            }

            // Method 2: Fallback properties
            if (!userInput) {
                userInput = m.text || m.body || '';
            }

            userInput = userInput.trim();
        } catch (error) {
            userInput = '';
        }

        // Validasi input nomor
        if (!userInput || userInput === '') {
            await Wily(`❌ *INPUT KOSONG*\n\n🔢 Silakan reply dengan nomor yang valid (1, 2, 3, ...)\n💡 Contoh: Reply dengan "1" untuk hapus grup pertama\n\n📝 Debug: Input diterima = "${userInput}"\n⏱️ Timeout dalam 30 detik`, m, hisoka);
            return true;
        }

        const inputNumber = parseInt(userInput);
        if (isNaN(inputNumber) || inputNumber < 1 || !Number.isInteger(inputNumber)) {
            await Wily(`❌ *INPUT TIDAK VALID*\n\n🔢 Masukkan nomor yang valid (1, 2, 3, ...)\n💡 Contoh: Reply dengan "1" untuk hapus grup pertama\n🔢 Input Anda: "${userInput}"\n📝 Parsed Number: ${inputNumber}\n\n⏱️ Timeout dalam 30 detik`, m, hisoka);
            return true;
        }

        const welcomeGroups = loadWelcomeGroups();
        const groups = welcomeGroups.WELCOME_GROUPS || [];
        const selectedIndex = parseInt(userInput) - 1;

        if (selectedIndex >= groups.length || selectedIndex < 0) {
            await Wily(`❌ *NOMOR MELEBIHI JUMLAH GROUP*\n\n📊 Jumlah grup: ${groups.length}\n🔢 Nomor yang dimasukkan: ${userInput}\n\n💡 Pilih nomor antara 1-${groups.length}`, m, hisoka);
            return true;
        }

        // Hapus grup yang dipilih dari WELCOME groups  
        const deletedGroup = groups.splice(selectedIndex, 1)[0];

        // PENTING: Gunakan saveWelcomeGroups untuk welcome, BUKAN saveGoodbyeGroups
        const saveResult = saveWelcomeGroups(welcomeGroups);

        if (saveResult) {
            await Wily(`✅ *WELCOME GROUP BERHASIL DIHAPUS*\n\n🗑️ *Group yang dihapus:*\n• Nama: ${deletedGroup.name}\n• ID: ${deletedGroup.id}\n• Ditambahkan: ${deletedGroup.dateAdded}\n• Oleh: ${deletedGroup.addedBy}\n\n📊 *Sisa welcome groups:* ${groups.length}\n💾 *Data tersimpan ke:* DATA/welcomeGroups.json ✅\n\n🚫 Welcome feature tidak akan aktif lagi di grup ini`, m, hisoka);
        } else {
            await Wily('❌ Gagal menyimpan perubahan welcome ke DATA/welcomeGroups.json', m, hisoka);
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Handler untuk welcome command
export async function handleWelcomeCommand(m, { hisoka, text, command }) {
    try {
        const config = loadConfig();

        // Safely extract sender info
        let senderJid;
        try {
            senderJid = m.key?.participant || m.key?.remoteJid || m.sender || '';
        } catch (error) {
            senderJid = '';
        }

        const fromMe = m.key?.fromMe || false;

        // Check access permission with better validation
        if (!senderJid || !checkAccess(senderJid, config, fromMe)) {
            return; // Silent return for unauthorized users
        }

        const args = text ? text.trim().split(' ') : [];
        const subCommand = args[0]?.toLowerCase();

        // Handle no arguments - show help
        if (!subCommand) {
            const currentStatus = config.WELCOME_ENABLED ? 'ON ✅' : 'OFF ❌';
            const allGroupsStatus = config.WELCOME_ALL_GROUPS ? 'ON ✅' : 'OFF ❌';

            const helpText = `╭━━━『 🎉 WELCOME MANAGEMENT 』━━━❀
┃ 
┃ 📋 *Command List:*
┃ ▫️ \`.welcome on/off\` - Toggle welcome feature
┃ ▫️ \`.welcome add\` - Add current group to welcome list
┃ ▫️ \`.welcome addlink\` - Add group via invite link
┃ ▫️ \`.welcome list\` - Show active groups
┃ ▫️ \`.welcome del\` - Delete groups from list
┃ ▫️ \`.welcome del all\` - Delete all groups with confirmation
┃ ▫️ \`.welcome all\` - Toggle all groups mode
┃ 
┃ 📊 *Current Status:*
┃ ▫️ Welcome Feature: ${currentStatus}
┃ ▫️ All Groups Mode: ${allGroupsStatus}
┃ 
┃ 💡 *Features:*
┃ ▫️ Auto welcome message untuk member baru
┃ ▫️ Beautiful design dengan profile picture
┃ ▫️ Group info dan member statistics
┃ ▫️ Time-based greeting (pagi/siang/malam)
┃ ▫️ Mention member baru otomatis
┃ ▫️ Deteksi join via link vs ditambah admin
┃ 
┃ 🎯 *How It Works:*
┃ ▫️ Ketika ada member join grup
┃ ▫️ Bot akan kirim pesan welcome cantik
┃ ▫️ Include info grup dan peraturan
┃ ▫️ Dengan animasi dan contextInfo
┃ ▫️ Membedakan cara bergabung
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🔧 *Example Usage:*
• \`.welcome on\` - Aktifkan welcome
• \`.welcome add\` - Daftarkan grup ini
• \`.welcome addlink https://chat.whatsapp.com/xxx\` - Add via link
• \`.welcome all\` - Aktif di semua grup`;

            await Wily(helpText, m, hisoka);
            return;
        }

        // Handle on/off command
        if (subCommand === 'on' || subCommand === 'off') {
            const enabled = subCommand === 'on';

            if (config.WELCOME_ENABLED === enabled) {
                const statusText = enabled ? 'sudah aktif' : 'sudah nonaktif';
                await Wily(`ℹ️ *WELCOME FEATURE ${statusText.toUpperCase()}*\n\n🔄 Status saat ini: ${enabled ? 'ON ✅' : 'OFF ❌'}\n💡 Tidak ada perubahan yang diperlukan`, m, hisoka);
                return;
            }

            config.WELCOME_ENABLED = enabled;
            const saveResult = saveConfig(config);

            if (saveResult) {
                const statusText = enabled ? 
                    `✅ *WELCOME FEATURE: ON*

🎉 *Fitur Aktif:*
┃ ▫️ Auto welcome untuk member baru
┃ ▫️ Design cantik dengan profile picture
┃ ▫️ Info grup dan member statistics
┃ ▫️ Time-based greeting
┃ ▫️ Auto mention member baru
┃ ▫️ Deteksi join via link vs ditambah admin

💾 *Status:* Tersimpan ke config.json ✅

💡 *Tips:*
• Gunakan \`.welcome add\` untuk daftarkan grup
• Atau \`.welcome all\` untuk aktif di semua grup` :
                    `❌ *WELCOME FEATURE: OFF*

🔇 *Fitur Nonaktif:*
┃ ▫️ Bot tidak akan kirim welcome message
┃ ▫️ Member baru join tanpa sambutan
┃ ▫️ Semua grup kembali ke mode normal

💾 *Status:* Tersimpan ke config.json ✅

🔄 *Untuk mengaktifkan:* \`.welcome on\``;

                await Wily(statusText, m, hisoka);
            } else {
                await Wily('❌ Gagal menyimpan pengaturan ke config.json', m, hisoka);
            }
            return;
        }

        // Handle add command (changed from addgc)
        if (subCommand === 'add') {
            // Validate group context
            const groupId = m.key?.remoteJid || m.from || '';
            if (!groupId || !groupId.endsWith('@g.us')) {
                await Wily('❌ *COMMAND HANYA UNTUK GROUP*\n\n🚫 Command ini hanya bisa digunakan di grup\n💡 Pindah ke grup yang ingin didaftarkan welcome', m, hisoka);
                return;
            }

            const welcomeGroups = loadWelcomeGroups();

            // Check if group already exists
            const existingGroup = welcomeGroups.WELCOME_GROUPS.find(g => g.id === groupId);
            if (existingGroup) {
                const groupName = await getGroupName(hisoka, groupId);
                await Wily(`ℹ️ *GROUP SUDAH TERDAFTAR*\n\n📝 *Grup:* ${groupName}\n🆔 *ID:* ${groupId}\n⏰ *Didaftarkan:* ${existingGroup.dateAdded}\n\n✅ Welcome feature sudah aktif di grup ini`, m, hisoka);
                return;
            }

            // Add new group
            const groupName = await getGroupName(hisoka, groupId);
            const newGroup = {
                id: groupId,
                name: groupName,
                dateAdded: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                addedBy: sensorNumber(senderJid.split('@')[0])
            };

            welcomeGroups.WELCOME_GROUPS.push(newGroup);
            const saveResult = saveWelcomeGroups(welcomeGroups);

            if (saveResult) {
                await Wily(`✅ *GROUP BERHASIL DITAMBAHKAN*

📝 *Detail Group:*
┃ ▫️ Nama: ${groupName}
┃ ▫️ ID: ${groupId}
┃ ▫️ Ditambahkan: ${newGroup.dateAdded}
┃ ▫️ Oleh: ${newGroup.addedBy}

💾 *Data tersimpan ke:* DATA/welcomeGroups.json ✅

🎉 *Welcome feature akan aktif di grup ini!*
💡 Pastikan welcome feature sudah ON dengan \`.welcome on\``, m, hisoka);
            } else {
                await Wily('❌ Gagal menyimpan data grup ke DATA/welcomeGroups.json', m, hisoka);
            }
            return;
        }

        // Handle addlink command
        if (subCommand === 'addlink') {
            const groupLink = args[1];

            if (!groupLink) {
                await Wily(`❌ *LINK GROUP DIPERLUKAN*\n\n💡 *Cara menggunakan:*\n\`.welcome addlink https://chat.whatsapp.com/xxxxx\`\n\n📝 *Format yang didukung:*\n• https://chat.whatsapp.com/xxxxx\n• https://wa.me/xxxxx\n• https://whatsapp.com/accept?code=xxxxx\n\n🔗 Dapatkan link dari grup → Info Grup → Invite Link`, m, hisoka);
                return;
            }

            const groupCode = extractGroupIdFromLink(groupLink);
            if (!groupCode) {
                await Wily(`❌ *LINK GROUP TIDAK VALID*\n\n🔗 Link yang Anda berikan: ${groupLink}\n\n💡 *Format yang benar:*\n• https://chat.whatsapp.com/xxxxx\n• https://wa.me/xxxxx\n• https://whatsapp.com/accept?code=xxxxx\n\n📝 Pastikan link adalah invite link WhatsApp Group yang valid`, m, hisoka);
                return;
            }

            try {
                // Try to join group using the invite code
                const joinResult = await hisoka.groupAcceptInvite(groupCode);
                const groupId = joinResult;

                // Get group info after joining
                const groupName = await getGroupName(hisoka, groupId);
                const welcomeGroups = loadWelcomeGroups();

                // Check if group already exists
                const existingGroup = welcomeGroups.WELCOME_GROUPS.find(g => g.id === groupId);
                if (existingGroup) {
                    await Wily(`ℹ️ *GROUP SUDAH TERDAFTAR*\n\n📝 *Grup:* ${groupName}\n🆔 *ID:* ${groupId}\n⏰ *Didaftarkan:* ${existingGroup.dateAdded}\n\n✅ Bot sudah join dan welcome feature sudah aktif`, m, hisoka);
                    return;
                }

                // Add new group
                const newGroup = {
                    id: groupId,
                    name: groupName,
                    dateAdded: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                    addedBy: sensorNumber(senderJid.split('@')[0])
                };

                welcomeGroups.WELCOME_GROUPS.push(newGroup);
                const saveResult = saveWelcomeGroups(welcomeGroups);

                if (saveResult) {
                    await Wily(`✅ *BOT BERHASIL JOIN & GROUP DITAMBAHKAN*

🎉 *Detail Group:*
┃ ▫️ Nama: ${groupName}
┃ ▫️ ID: ${groupId}
┃ ▫️ Link: ${groupLink}
┃ ▫️ Ditambahkan: ${newGroup.dateAdded}
┃ ▫️ Oleh: ${newGroup.addedBy}

💾 *Data tersimpan ke:* DATA/welcomeGroups.json ✅
🤖 *Status:* Bot berhasil join grup melalui invite link

🎉 *Welcome feature akan aktif di grup ini!*
💡 Pastikan welcome feature sudah ON dengan \`.welcome on\``, m, hisoka);
                } else {
                    await Wily('✅ Bot berhasil join grup, tapi gagal menyimpan data ke welcomeGroups.json', m, hisoka);
                }

            } catch (error) {
                await Wily(`❌ *GAGAL JOIN GROUP*\n\n🔗 Link: ${groupLink}\n❌ Error: ${error.message}\n\n💡 *Kemungkinan penyebab:*\n• Link sudah expired\n• Bot sudah di grup tersebut\n• Grup sudah full/private\n• Link tidak valid\n\n🔄 Coba dapatkan link invite yang baru`, m, hisoka);
            }
            return;
        }

        // Handle list command
        if (subCommand === 'list') {
            const welcomeGroups = loadWelcomeGroups();
            const groups = welcomeGroups.WELCOME_GROUPS || [];

            if (groups.length === 0) {
                await Wily(`📋 *DAFTAR GROUP WELCOME*

❌ *Belum ada grup yang terdaftar*

💡 *Cara menambah grup:*
• Masuk ke grup yang diinginkan
• Ketik \`.welcome add\`
• Atau gunakan \`.welcome addlink [link]\`
• Atau gunakan \`.welcome all\` untuk semua grup

🔧 *Status All Groups:* ${config.WELCOME_ALL_GROUPS ? 'ON ✅' : 'OFF ❌'}`, m, hisoka);
                return;
            }

            let listText = `╭━━━『 📋 DAFTAR GROUP WELCOME 』━━━❀
┃ 
┃ 📊 *Total Groups:* ${groups.length}
┃ 🔧 *All Groups Mode:* ${config.WELCOME_ALL_GROUPS ? 'ON ✅' : 'OFF ❌'}
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

💡 *Untuk hapus grup:* \`.welcome del\`
🗑️ *Untuk hapus semua:* \`.welcome del all\`
🎯 *Untuk semua grup:* \`.welcome all\``;

            await Wily(listText, m, hisoka);
            return;
        }

        // Handle del command
        if (subCommand === 'del') {
            const welcomeGroups = loadWelcomeGroups();
            const groups = welcomeGroups.WELCOME_GROUPS || [];

            if (groups.length === 0) {
                await Wily('❌ *TIDAK ADA GROUP UNTUK DIHAPUS*\n\n📋 Belum ada grup yang terdaftar dalam welcome list\n💡 Gunakan `.welcome add` untuk menambah grup', m, hisoka);
                return;
            }

            // Check for "all" parameter
            if (args[1] && args[1].toLowerCase() === 'all') {
                let deleteAllText = `╭━━━『 🗑️💥 HAPUS SEMUA GROUP WELCOME 🎉 』━━━❀
┃ 
┃ ⚠️ *PERINGATAN KERAS WELCOME!*
┃ 🚨 Anda akan menghapus SEMUA data grup welcome
┃ <!-- WELCOME_DELETE_ALL_UNIQUE_IDENTIFIER_2025_XWZ -->
┃ 
┃ 📊 *Total grup welcome yang akan dihapus:* ${groups.length}
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
Apakah Anda yakin akan menghapus SEMUA data grup welcome?

💬 *Cara konfirmasi:*
Reply pesan ini dengan **Y** untuk Ya atau **N** untuk Tidak

⚠️ *PERHATIAN:*
• Semua ${groups.length} grup akan dihapus permanent
• Data tidak dapat dikembalikan
• Welcome feature akan nonaktif di semua grup
• Backup otomatis akan dibuat

🚫 *Timeout:* 30 detik`;

                await Wily(deleteAllText, m, hisoka);
                return;
            }

            // Jika ada argumen nomor langsung (.welcome del 1, .welcome del 2, dll)
            if (args[1] && !isNaN(args[1])) {
                const selectedIndex = parseInt(args[1]) - 1;

                if (selectedIndex >= groups.length || selectedIndex < 0) {
                    await Wily(`❌ *NOMOR MELEBIHI JUMLAH GROUP*\n\n📊 Jumlah grup: ${groups.length}\n🔢 Nomor yang dimasukkan: ${args[1]}\n\n💡 Pilih nomor antara 1-${groups.length}`, m, hisoka);
                    return;
                }

                // Hapus grup yang dipilih dari WELCOME groups
                const deletedGroup = groups.splice(selectedIndex, 1)[0];

                // PENTING: Pastikan menyimpan ke welcomeGroups.json BUKAN goodbyeGroups.json
                const saveResult = saveWelcomeGroups(welcomeGroups);

                if (saveResult) {
                    await Wily(`✅ *WELCOME GROUP BERHASIL DIHAPUS*\n\n🗑️ *Group yang dihapus:*\n• Nama: ${deletedGroup.name}\n• ID: ${deletedGroup.id}\n• Ditambahkan: ${deletedGroup.dateAdded}\n• Oleh: ${deletedGroup.addedBy}\n\n📊 *Sisa welcome groups:* ${groups.length}\n💾 *Data tersimpan ke:* DATA/welcomeGroups.json ✅\n\n🚫 Welcome feature tidak akan aktif lagi di grup ini`, m, hisoka);
                } else {
                    await Wily('❌ Gagal menyimpan perubahan welcome ke DATA/welcomeGroups.json', m, hisoka);
                }
                return;
            }

            let deleteText = `╭━━━『 🗑️ DELETE GROUP WELCOME 🎉 』━━━❀
┃ 
┃ 📋 *Pilih nomor untuk hapus welcome:*
┃ <!-- WELCOME_DELETE_UNIQUE_IDENTIFIER_2025_XWZ -->
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

💬 *Cara hapus welcome:*
Reply pesan ini dengan nomor yang ingin dihapus
atau gunakan: .welcome del [nomor]

⏱️ *Contoh welcome:* 
• Reply dengan "1" untuk hapus welcome grup pertama
• Atau ketik ".welcome del 1"
• Ketik ".welcome del all" untuk hapus semua welcome
🚫 *Timeout:* 30 detik`;

            await Wily(deleteText, m, hisoka);
            return;
        }

        // Handle all command
        if (subCommand === 'all') {
            const currentStatus = config.WELCOME_ALL_GROUPS;
            const newStatus = !currentStatus;

            config.WELCOME_ALL_GROUPS = newStatus;
            const saveResult = saveConfig(config);

            if (saveResult) {
                const statusText = newStatus ? 
                    `✅ *ALL GROUPS MODE: ON*

🌐 *Fitur Aktif:*
┃ ▫️ Welcome aktif di SEMUA grup
┃ ▫️ Tidak perlu daftar grup satu-satu
┃ ▫️ Otomatis untuk grup baru
┃ ▫️ Override welcome groups list

💾 *Status:* Tersimpan ke config.json ✅

⚡ *Efek:*
• Bot akan welcome di semua grup yang dimasuki
• Tidak perlu gunakan \`.welcome add\` lagi
• Mode ini lebih praktis untuk bot public

⚠️ *Catatan:* Pastikan welcome feature ON dengan \`.welcome on\`` :
                    `❌ *ALL GROUPS MODE: OFF*

🎯 *Fitur Nonaktif:*
┃ ▫️ Welcome hanya di grup terdaftar
┃ ▫️ Gunakan welcome groups list
┃ ▫️ Kontrol manual per grup
┃ ▫️ Mode selektif aktif

💾 *Status:* Tersimpan ke config.json ✅

🔄 *Efek:*
• Bot hanya welcome di grup yang didaftarkan
• Gunakan \`.welcome add\` untuk daftar grup
• Mode ini lebih selektif dan terkontrol

💡 *Untuk aktifkan semua:* \`.welcome all\``;

                await Wily(statusText, m, hisoka);
            } else {
                await Wily('❌ Gagal menyimpan pengaturan all groups ke config.json', m, hisoka);
            }
            return;
        }

        // Handle invalid subcommand
        await Wily(`❌ *COMMAND TIDAK VALID*\n\n📋 *Available commands:*\n• \`.welcome on/off\`\n• \`.welcome add\`\n• \`.welcome addlink\`\n• \`.welcome list\`\n• \`.welcome del\`\n• \`.welcome del all\`\n• \`.welcome all\`\n\n💡 Gunakan \`.welcome\` untuk help`, m, hisoka);

    } catch (error) {
        try {
            await Wily(`❌ Terjadi kesalahan saat memproses command welcome: ${error.message || 'Unknown error'}`, m, hisoka);
        } catch (replyError) {
            // Silent error handling untuk avoid infinite loop
        }
    }
}

// Fungsi untuk handle welcome message ketika ada member baru join
export async function handleWelcomeMessage(hisoka, groupId, participants, inviteCode = null, author = null) {
    try {
        const config = loadConfig();

        // Cek apakah welcome feature aktif
        if (!config.WELCOME_ENABLED) {
            return false;
        }

        // Cek apakah grup diizinkan untuk welcome
        let isAllowed = false;

        if (config.WELCOME_ALL_GROUPS) {
            isAllowed = true;
        } else {
            const welcomeGroups = loadWelcomeGroups();
            isAllowed = welcomeGroups.WELCOME_GROUPS.some(group => group.id === groupId);
        }

        if (!isAllowed) {
            return false;
        }
        
        // Inisialisasi set untuk menyimpan participant yang sudah diproses
        const processedParticipants = new Set();

        // Ambil metadata grup
        const groupMetadata = await hisoka.groupMetadata(groupId);
        const groupName = groupMetadata.subject;
        const memberCount = groupMetadata.participants.length;
        const adminCount = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length;
        const ownerTag = groupMetadata.owner ? `@${groupMetadata.owner.split('@')[0]}` : '';
        const groupCreationDate = groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '';

        // Get current time in Jakarta timezone
        const jakartaTime = new Date().toLocaleString('id-ID', { 
            timeZone: 'Asia/Jakarta', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const jakartaDate = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

        // Send welcome message untuk setiap participant baru
        for (const participant of participants) {
            // Skip jika participant sudah diproses
            if (processedParticipants.has(participant)) {
                continue;
            }

            // Tambahkan ke processed list
            processedParticipants.add(participant);

            // Cek throttling untuk mencegah spam welcome
            if (!canSendWelcome(participant)) {
                continue; // Skip jika masih dalam throttle period
            }

            try {
                const userName = participant.split('@')[0];
                let ppUser;

                try {
                    ppUser = await hisoka.profilePictureUrl(participant, 'image');
                } catch (error) {
                    ppUser = 'https://files.catbox.moe/mxohav.gif';
                }

                const greeting = '*Selamat Datang!*';
                const greetingEmoji = '🎉';

                // Deteksi cara bergabung dengan akurasi tinggi
                const joinMethodInfo = await detectJoinMethod(hisoka, groupId, participant, author, inviteCode);

                // Array mentions untuk include author jika ada
                const mentions = [participant];
                if (author && author !== participant && joinMethodInfo.authorInfo) {
                    mentions.push(author);
                }

                const welcomeText = `> ⭐ SELAMAT DATANG

👋 𝐇𝐚𝐥𝐥𝐨 : @${userName}!
${greetingEmoji} 𝐒𝐞𝐥𝐚𝐦𝐚𝐭 : ${greeting}
${joinMethodInfo.icon} 𝐔𝐬𝐞𝐫 : *${joinMethodInfo.description}*${joinMethodInfo.authorInfo ? `\n${joinMethodInfo.authorInfo}` : ''}
🏡 𝐍𝐚𝐦𝐚 𝐆𝐫𝐮𝐩 : *${groupName}*
👥 𝐉𝐮𝐦𝐥𝐚𝐡 𝐌𝐞𝐦𝐛𝐞𝐫 : *${memberCount}* 𝐨𝐫𝐚𝐧𝐠
👑 𝐉𝐮𝐦𝐥𝐚𝐡 𝐀𝐝𝐦𝐢𝐧 : *${adminCount}* 𝐨𝐫𝐚𝐧𝐠${ownerTag ? `\n🔰 𝐆𝐫𝐮𝐩 𝐏𝐞𝐦𝐢𝐥𝐢𝐤 : *${ownerTag}*` : ''}${groupCreationDate ? `\n📆 𝐆𝐫𝐮𝐩 𝐃𝐢𝐛𝐮𝐚𝐭 𝐏𝐚𝐝𝐚 : *${groupCreationDate}*` : ''}
📅 𝐒𝐚𝐚𝐭 𝐈𝐧𝐢 𝐓𝐚𝐧𝐠𝐠𝐚𝐥 : *${jakartaDate}*
⏰ 𝐒𝐚𝐚𝐭 𝐈𝐧𝐢 𝐖𝐚𝐤𝐭𝐮 : *${jakartaTime}* 𝐖𝐈𝐁

> 📋 PERATURAN GRUP:
• *Saling menghormati sesama member*
• *Dilarang spam atau flood*
• *Gunakan nama yang sopan*
• *No toxic, no drama*
• *Nikmati diskusi yang sehat*

> 💡 TIPS:
• *Perkenalkan diri terlebih dahulu*
• *Baca pesan sebelumnya*
• *Ikuti diskusi dengan baik*

> ✨ Semoga betah dan bisa berkontribusi positif!`;

                // Struktur pesan dengan contextInfo yang lebih cantik
                const messageContent = {
                    text: welcomeText,
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
                            title: `🎉 WELCOME TO ${groupName.toUpperCase()}`,
                            body: `${joinMethodInfo.icon} ${joinMethodInfo.description} • ${jakartaDate}`,
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

                // Delay sedikit antar welcome message untuk avoid spam
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (participantError) {
                // Silent error handling untuk participant
            }
        }

        return true;

    } catch (error) {
        return false;
    }
}

// Export info untuk registrasi di message.js
export const welcomeInfo = {
    command: ['welcome'],
    description: 'Manage welcome message untuk grup'
};
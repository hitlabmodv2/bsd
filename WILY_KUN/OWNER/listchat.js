import fs from 'fs';
import path from 'path';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk memuat config
function loadConfig() {
    try {
        const configPath = './config.json';
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return {};
    } catch (error) {
        return {};
    }
}

// Fungsi untuk menyimpan config
function saveConfig(config) {
    try {
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk memuat data chat
function loadChatData() {
    try {
        const dataDir = './DATA';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const filePath = path.join(dataDir, 'listchat.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(data);
            // Jika struktur lama (hanya object kosong), buat struktur baru
            if (!parsed.trackedGroups && !parsed.groups) {
                return {
                    groups: [],
                    trackedGroups: {},
                    settings: {
                        enabled: false,
                        mode: 'specific',
                        lastUpdate: new Date().toISOString()
                    }
                };
            }
            return parsed;
        }
        // Return struktur default
        return {
            groups: [],
            trackedGroups: {},
            settings: {
                enabled: false,
                mode: 'specific',
                lastUpdate: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            groups: [],
            trackedGroups: {},
            settings: {
                enabled: false,
                mode: 'specific',
                lastUpdate: new Date().toISOString()
            }
        };
    }
}

// Fungsi untuk menyimpan data chat
function saveChatData(data) {
    try {
        const dataDir = './DATA';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const filePath = path.join(dataDir, 'listchat.json');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk mengecek akses user
function checkUserAccess(senderNumber, config) {
    // Pastikan senderNumber valid
    if (!senderNumber || senderNumber === '' || senderNumber === 'undefined') {
        return false;
    }

    // Pastikan config.OWNER exists dan adalah array
    if (!config.OWNER || !Array.isArray(config.OWNER)) {
        return false;
    }

    const isOwner = config.OWNER.includes(senderNumber);

    // Jika owner, selalu bisa akses
    if (isOwner) {
        return true;
    }

    // Fitur listchat khusus owner saja, non-owner tidak bisa akses
    return false;
}

// Fungsi untuk track pesan (dipanggil dari message.js)
export function trackChatMessage(m, hisoka) {
    try {
        const config = loadConfig();

        // Cek apakah fitur listchat aktif
        if (!config.listchat || !config.listchat.enabled) {
            return; // Fitur tidak aktif
        }

        // Cek apakah ini grup
        if (!m.key?.remoteJid?.endsWith('@g.us')) {
            return; // Bukan grup
        }

        const groupId = m.key.remoteJid;
        const senderId = m.key.participant || m.sender;
        const senderNumber = senderId?.split('@')[0] || 'unknown';

        // Cek apakah grup ini di-track
        if (config.listchat.mode === 'specific' && (!config.listchat.groups || !config.listchat.groups.includes(groupId))) {
            return;
        }

        // Load data chat
        let chatData = loadChatData();

        // Inisialisasi grup jika belum ada
        if (!chatData.trackedGroups[groupId]) {
            chatData.trackedGroups[groupId] = {
                groupName: '',
                users: {},
                totalMessages: 0,
                lastUpdate: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
        }

        // Update nama grup
        let currentGroupName = chatData.trackedGroups[groupId].groupName || '';

        // Coba dari berbagai source untuk nama grup
        if (m.key?.remoteJid && hisoka.chats && hisoka.chats[m.key.remoteJid] && hisoka.chats[m.key.remoteJid].name) {
            currentGroupName = hisoka.chats[m.key.remoteJid].name;
        } else if (hisoka.groupMetadata && hisoka.groupMetadata[groupId] && hisoka.groupMetadata[groupId].subject) {
            currentGroupName = hisoka.groupMetadata[groupId].subject;
        } else if (m.metadata && m.metadata.subject) {
            currentGroupName = m.metadata.subject;
        }

        // Update nama grup jika berhasil dapat nama yang valid
        if (currentGroupName && currentGroupName !== '' && currentGroupName !== 'Unknown Group') {
            chatData.trackedGroups[groupId].groupName = currentGroupName;
        }

        // Inisialisasi user jika belum ada
        if (!chatData.trackedGroups[groupId].users[senderNumber]) {
            chatData.trackedGroups[groupId].users[senderNumber] = {
                name: m.pushName || senderNumber,
                count: 0,
                lastMessage: new Date().toISOString()
            };
        }

        // Update data user
        chatData.trackedGroups[groupId].users[senderNumber].count += 1;
        chatData.trackedGroups[groupId].users[senderNumber].lastMessage = new Date().toISOString();
        chatData.trackedGroups[groupId].users[senderNumber].name = m.pushName || chatData.trackedGroups[groupId].users[senderNumber].name || senderNumber;

        // Update total pesan grup
        chatData.trackedGroups[groupId].totalMessages += 1;
        chatData.trackedGroups[groupId].lastUpdate = new Date().toISOString();
        chatData.settings.lastUpdate = new Date().toISOString();

        // Simpan data
        saveChatData(chatData);

    } catch (error) {
        // Silent error handling
    }
}

// Main handler function
export async function handleListChatCommand(m, { hisoka, text, command }) {
    try {
        const config = loadConfig();

        // Extract sender number dengan beberapa fallback
        let senderNumber = '';
        if (m.sender) {
            senderNumber = m.sender.split('@')[0];
        } else if (m.key?.participant) {
            senderNumber = m.key.participant.split('@')[0];
        } else if (m.key?.remoteJid && !m.key.remoteJid.includes('@g.us')) {
            senderNumber = m.key.remoteJid.split('@')[0];
        }

        // Cek akses user
        if (!checkUserAccess(senderNumber, config)) {
            // Selalu beri respon jika bukan owner
            await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat menggunakan fitur list chat\n\n🔒 Akses terbatas untuk menjaga keamanan bot', m, hisoka);
            return;
        }

        const args = text.trim().split(' ');
        const subCommand = args[0]?.toLowerCase();

        // Validasi command dengan pengecekan yang lebih ketat
        const validCommands = ['on', 'off', 'all', 'add', 'del'];

        // Jika ada subcommand tapi tidak valid
        if (subCommand && subCommand !== '' && !validCommands.includes(subCommand)) {
            let suggestionText = '';

            // Berikan saran berdasarkan typo yang umum
            if (subCommand.includes('o')) {
                suggestionText = '\n💡 *Mungkin maksud Anda:* `.listchat on` atau `.listchat off`';
            } else if (subCommand.includes('a')) {
                suggestionText = '\n💡 *Mungkin maksud Anda:* `.listchat all` atau `.listchat add`';
            } else if (subCommand.includes('d')) {
                suggestionText = '\n💡 *Mungkin maksud Anda:* `.listchat del`';
            }

            await Wily(`❌ *Command "${subCommand}" tidak valid!*\n\n🔧 *Command yang tersedia:*\n• \`.listchat\` - Tampilkan ranking chat\n• \`.listchat on\` - Aktifkan fitur\n• \`.listchat off\` - Nonaktifkan fitur\n• \`.listchat all\` - Track semua grup\n• \`.listchat add\` - Tambah grup ke tracking\n• \`.listchat del\` - Hapus grup dari tracking${suggestionText}\n\n❗ *Yang Anda ketik:* \`.listchat ${subCommand}\`\n\n💡 *Tips:* Ketik \`.listchat\` saja untuk melihat status`, m, hisoka);
            return;
        }

        // Handle subcommands
        if (subCommand === 'on') {
            if (!config.listchat) config.listchat = {};

            if (config.listchat.enabled) {
                await Wily(`ℹ️ *FITUR SUDAH AKTIF*\n\n🟢 List chat tracking sudah dalam keadaan ON\n📊 Mode: ${config.listchat.mode === 'all' ? 'Semua Grup' : 'Grup Spesifik'}\n💡 Bot sedang menghitung chat anggota grup`, m, hisoka);
                return;
            }

            config.listchat = {
                enabled: true,
                mode: 'specific',
                groups: [],
                activatedAt: new Date().toISOString(),
                activatedBy: senderNumber
            };

            const success = saveConfig(config);
            if (success) {
                await Wily(`✅ *LIST CHAT TRACKING DIAKTIFKAN*\n\n📊 Status: AKTIF\n🎯 Mode: Grup Spesifik\n👥 Bot siap menghitung chat anggota grup\n\n💡 *Langkah selanjutnya:*\n• \`.listchat add\` - Tambah grup ini ke tracking\n• \`.listchat all\` - Track semua grup\n\n📁 Data tersimpan di: DATA/listchat.json`, m, hisoka);
            } else {
                await Wily('❌ Gagal mengaktifkan fitur. Terjadi kesalahan saat menyimpan data.', m, hisoka);
            }
            return;
        }

        if (subCommand === 'off') {
            if (!config.listchat || !config.listchat.enabled) {
                await Wily(`ℹ️ *FITUR SUDAH NONAKTIF*\n\n🔴 List chat tracking sudah dalam keadaan OFF\n💡 Bot tidak sedang menghitung chat`, m, hisoka);
                return;
            }

            config.listchat.enabled = false;
            config.listchat.deactivatedAt = new Date().toISOString();
            config.listchat.deactivatedBy = senderNumber;

            const success = saveConfig(config);
            if (success) {
                await Wily(`🔴 *LIST CHAT TRACKING DINONAKTIFKAN*\n\n📊 Status: NONAKTIF\n👥 Bot berhenti menghitung chat anggota grup\n\n💡 *Data yang sudah ada tetap tersimpan*\n• Untuk melihat data: \`.listchat\`\n• Untuk aktifkan lagi: \`.listchat on\`\n\n📁 Data tersimpan di: DATA/listchat.json`, m, hisoka);
            } else {
                await Wily('❌ Gagal menonaktifkan fitur. Terjadi kesalahan saat menyimpan data.', m, hisoka);
            }
            return;
        }

        if (subCommand === 'all') {
            if (!config.listchat) config.listchat = {};

            config.listchat.enabled = true;
            config.listchat.mode = 'all';
            config.listchat.groups = [];
            config.listchat.activatedAt = new Date().toISOString();
            config.listchat.activatedBy = senderNumber;

            const success = saveConfig(config);
            if (success) {
                await Wily(`✅ *LIST CHAT ALL MODE DIAKTIFKAN*\n\n📊 Status: AKTIF\n🌐 Mode: Semua Grup\n👥 Bot akan menghitung chat di SEMUA grup\n\n💡 *Fitur aktif untuk:*\n• Semua grup yang sudah ada\n• Grup baru yang bot masuki\n\n📁 Data tersimpan di: DATA/listchat.json\n⚠️ Pastikan bot memiliki akses ke semua grup`, m, hisoka);
            } else {
                await Wily('❌ Gagal mengaktifkan mode all. Terjadi kesalahan saat menyimpan data.', m, hisoka);
            }
            return;
        }

        if (subCommand === 'add') {
            // Cek apakah di grup
            if (!m.key?.remoteJid?.endsWith('@g.us')) {
                await Wily('❌ *Command ini hanya dapat digunakan di grup*\n\n💡 Silakan gunakan command ini di dalam grup yang ingin ditambahkan', m, hisoka);
                return;
            }

            if (!config.listchat) config.listchat = {};
            if (!config.listchat.groups) config.listchat.groups = [];

            const groupId = m.key.remoteJid;

            // Get group name
            let groupName = 'Unknown Group';
            try {
                if (hisoka.chats && hisoka.chats[groupId] && hisoka.chats[groupId].name) {
                    groupName = hisoka.chats[groupId].name;
                } else {
                    const metadata = await hisoka.groupMetadata(groupId);
                    if (metadata && metadata.subject) {
                        groupName = metadata.subject;
                    }
                }
            } catch (error) {
                if (m.metadata && m.metadata.subject) {
                    groupName = m.metadata.subject;
                }
            }

            if (config.listchat.groups.includes(groupId)) {
                await Wily(`ℹ️ *GRUP SUDAH DITAMBAHKAN*\n\n🏷️ Grup: ${groupName}\n📊 Status: Sudah dalam daftar tracking\n💡 Bot sudah menghitung chat di grup ini`, m, hisoka);
                return;
            }

            config.listchat.enabled = true;
            config.listchat.mode = 'specific';
            config.listchat.groups.push(groupId);

            const success = saveConfig(config);
            if (success) {
                // Inisialisasi data grup
                let chatData = loadChatData();
                if (!chatData[groupId]) {
                    chatData[groupId] = {
                        groupName: groupName,
                        users: {},
                        totalMessages: 0,
                        lastUpdate: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    };
                    saveChatData(chatData);
                }

                await Wily(`✅ *GRUP BERHASIL DITAMBAHKAN*\n\n🏷️ Grup: ${groupName}\n📊 Status: Tracking AKTIF\n👥 Bot mulai menghitung chat anggota grup\n\n📈 Total grup di-track: ${config.listchat.groups.length}\n📁 Data tersimpan di: DATA/listchat.json`, m, hisoka);
            } else {
                await Wily('❌ Gagal menambahkan grup. Terjadi kesalahan saat menyimpan data.', m, hisoka);
            }
            return;
        }

        if (subCommand === 'del') {
            if (!config.listchat || !config.listchat.groups || config.listchat.groups.length === 0) {
                await Wily('❌ *Tidak ada grup dalam daftar tracking*\n\n💡 Gunakan `.listchat add` untuk menambah grup ke tracking', m, hisoka);
                return;
            }

            const chatData = loadChatData();
            let groupList = '';
            let index = 1;

            config.listchat.groups.forEach(groupId => {
                const groupData = chatData[groupId];
                const groupName = groupData ? groupData.groupName || 'Unknown Group' : 'Unknown Group';
                const totalUsers = groupData ? Object.keys(groupData.users || {}).length : 0;
                const totalMessages = groupData ? groupData.totalMessages || 0 : 0;

                groupList += `${index}. ${groupName}\n`;
                groupList += `   📊 ${totalMessages} pesan | 👥 ${totalUsers} user\n`;
                groupList += `   🆔 ${groupId}\n\n`;
                index++;
            });

            await Wily(`📋 *DAFTAR GRUP TRACKING*\n\n${groupList}💡 *Cara hapus:*\nReply pesan ini dengan nomor grup yang ingin dihapus\nContoh: ketik \`1\` untuk hapus grup nomor 1`, m, hisoka);
            return;
        }

        // Jika tidak ada subcommand atau cek reply untuk delete
        if (m.quoted && text.trim() && /^\d+$/.test(text.trim())) {
            const number = parseInt(text.trim());

            if (!config.listchat || !config.listchat.groups || config.listchat.groups.length === 0) {
                await Wily('❌ Tidak ada grup dalam daftar tracking untuk dihapus.', m, hisoka);
                return;
            }

            if (number < 1 || number > config.listchat.groups.length) {
                await Wily(`❌ Nomor tidak valid! Pilih antara 1-${config.listchat.groups.length}`, m, hisoka);
                return;
            }

            const groupIdToDelete = config.listchat.groups[number - 1];
            const chatData = loadChatData();
            const groupData = chatData[groupIdToDelete];
            const groupName = groupData ? groupData.groupName || 'Unknown Group' : 'Unknown Group';

            // Hapus dari config
            config.listchat.groups.splice(number - 1, 1);

            const success = saveConfig(config);
            if (success) {
                await Wily(`✅ *GRUP BERHASIL DIHAPUS*\n\n🏷️ Grup: ${groupName}\n📊 Status: Tracking DIHENTIKAN\n👥 Bot berhenti menghitung chat di grup ini\n\n📈 Sisa grup di-track: ${config.listchat.groups.length}\n💡 Data lama tetap tersimpan di: DATA/listchat.json`, m, hisoka);
            } else {
                await Wily('❌ Gagal menghapus grup dari tracking.', m, hisoka);
            }
            return;
        }

        // Tampilkan ranking jika tidak ada subcommand
        if (!config.listchat || !config.listchat.enabled) {
            await Wily(`📊 *LIST CHAT TRACKING*\n\n🔴 Status: NONAKTIF\n\n💡 *Cara menggunakan:*\n• \`.listchat on\` - Aktifkan fitur\n• \`.listchat all\` - Track semua grup\n• \`.listchat add\` - Tambah grup ini\n• \`.listchat del\` - Hapus grup dari tracking\n\n📁 Data tersimpan di: DATA/listchat.json`, m, hisoka);
            return;
        }

        // Cek apakah di grup untuk tampilkan ranking
        if (!m.key?.remoteJid?.endsWith('@g.us')) {
            const mode = config.listchat.mode === 'all' ? 'Semua Grup' : 'Grup Spesifik';
            const trackedGroups = config.listchat.groups ? config.listchat.groups.length : 0;

            await Wily(`📊 *LIST CHAT TRACKING*\n\n🟢 Status: AKTIF\n🎯 Mode: ${mode}\n📈 Grup di-track: ${trackedGroups}\n\n💡 Gunakan command ini di dalam grup untuk melihat ranking chat\n\n📁 Data tersimpan di: DATA/listchat.json`, m, hisoka);
            return;
        }

        const groupId = m.key.remoteJid;
        const chatData = loadChatData();

        if (!chatData.trackedGroups[groupId] || !chatData.trackedGroups[groupId].users || Object.keys(chatData.trackedGroups[groupId].users).length === 0) {
            // Get group name
            let groupName = 'Unknown Group';
            try {
                if (hisoka.chats && hisoka.chats[groupId] && hisoka.chats[groupId].name) {
                    groupName = hisoka.chats[groupId].name;
                } else {
                    const metadata = await hisoka.groupMetadata(groupId);
                    if (metadata && metadata.subject) {
                        groupName = metadata.subject;
                    }
                }
            } catch (error) {
                if (m.metadata && m.metadata.subject) {
                    groupName = m.metadata.subject;
                }
            }

            const isTracked = config.listchat.mode === 'all' || (config.listchat.groups && config.listchat.groups.includes(groupId));
            const statusText = isTracked ? '🟢 AKTIF' : '🔴 TIDAK DITRACK';

            await Wily(`📊 *LIST CHAT GRUP*\n\n🏷️ Grup: ${groupName}\n📈 Status: ${statusText}\n\n❌ *Belum ada data chat*\n\n💡 *Cara menggunakan:*\n• \`.listchat add\` - Tambah grup ini ke tracking\n• \`.listchat all\` - Track semua grup\n\n⚠️ Data tracking dimulai setelah grup ditambahkan`, m, hisoka);
            return;
        }

        // Get group name
        let groupName = chatData.trackedGroups[groupId].groupName || 'Unknown Group';
        try {
            if (hisoka.chats && hisoka.chats[groupId] && hisoka.chats[groupId].name) {
                groupName = hisoka.chats[groupId].name;
            } else {
                const metadata = await hisoka.groupMetadata(groupId);
                if (metadata && metadata.subject) {
                    groupName = metadata.subject;
                }
            }
        } catch (error) {
            // Use stored name
        }

        // Buat ranking
        const users = chatData.trackedGroups[groupId].users;
        const userList = Object.entries(users).map(([phone, data]) => ({
            phone,
            name: data.name,
            count: data.count,
            lastMessage: data.lastMessage
        }));

        // Sort berdasarkan jumlah chat (descending)
        userList.sort((a, b) => b.count - a.count);

        // Ambil top 50
        const top50 = userList.slice(0, 50);
        const sisanya = userList.length > 50 ? userList.length - 50 : 0;

        // Buat ranking text
        let rankingText = '';
        const mentions = [];

        top50.forEach((user, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            rankingText += `${medal} @${user.phone} 💬 ${user.count} chat\n`;
            mentions.push(`${user.phone}@s.whatsapp.net`);
        });

        const isTracked = config.listchat.mode === 'all' || (config.listchat.groups && config.listchat.groups.includes(groupId));
        const statusText = isTracked ? '🟢 DITRACK' : '🔴 TIDAK DITRACK';
        const modeText = config.listchat.mode === 'all' ? '🌐 SEMUA GRUP' : '📋 GRUP TERPILIH';
        const totalMessages = chatData.trackedGroups[groupId].totalMessages || 0;
        const lastUpdate = chatData.trackedGroups[groupId].lastUpdate ? new Date(chatData.trackedGroups[groupId].lastUpdate).toLocaleString('id-ID') : 'Tidak diketahui';

        let finalMessage = `🏆 *RANKING CHAT GRUP*\n\n🏷️ Grup: ${groupName}\n📊 Status: ${modeText}\n📈 Mode: ${statusText}\n💬 Total Chat: ${totalMessages}\n👥 Total User: ${userList.length}\n⏰ Update Terakhir: ${lastUpdate}\n\n📋 *TOP ${top50.length} USER TERAKTIF:*\n\n${rankingText}`;

        if (sisanya > 0) {
            finalMessage += `📊 *Dan ${sisanya} user lainnya...*\n\n`;
        }

        finalMessage += `💡 *Command:*\n• \`.listchat add\` - Tambah grup ke tracking\n• \`.listchat del\` - Hapus grup dari tracking\n\n📁 Data: DATA/listchat.json`;

        // Gunakan Wily reply untuk semua response
        await Wily(finalMessage, m, hisoka);

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export info untuk digunakan di message.js
export const listChatInfo = {
    command: ['listchat'],
    description: 'Tracking dan ranking chat anggota grup'
};

// Export fungsi utama
export const listchat = handleListChatCommand;
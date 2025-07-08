const { Wily } = require('../CODE_REPLAY/reply');

const fs = require('fs');
const path = require('path');

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        // Silent error
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' }
    };
}

// Check access permission based on bot mode
function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    if (botMode === 'public') {
        return true;
    }

    const botNumber = config?.bot?.botNumber;
    const ownerNumber = config?.bot?.owner;

    const cleanSender = senderNumber?.split('@')[0]?.split(':')[0];
    const cleanBot = botNumber?.split('@')[0]?.split(':')[0];
    const cleanOwner = ownerNumber?.split('@')[0]?.split(':')[0];

    const isBotNumber = cleanSender === cleanBot;
    const isOwnerNumber = cleanSender === cleanOwner;
    const isFromMe = fromMe === true;

    return isFromMe || isBotNumber || isOwnerNumber;
}

async function cekidgcHandler(m, client) {
    try {
        if (!m.message) return;

        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text
        const messageText = m.message?.conversation || 
                          m.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Check if it's cekidgc command
        if (!messageText.toLowerCase().startsWith(`${prefix}cekidgc`)) return;

        // Check access based on bot mode FIRST before processing
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            // In self mode, bot should not respond to unauthorized users
            return; // Silent exit, no response
        }

        const chat = m.key.remoteJid;
        const isGroup = chat.endsWith('@g.us');
        const senderNumber = m.key.participant ? m.key.participant.split('@')[0] : m.key.remoteJid.split('@')[0];

        // Parse command arguments
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'cekidgc') return;

        let targetGroupId = null;

        // Check if URL parameter is provided
        if (args.length > 1 && args[1]) {
            const groupUrl = args[1];

            if (groupUrl.toLowerCase().includes('chat.whatsapp.com/')) {
                // Extract invite code from URL
                const inviteCode = groupUrl.split('/').pop();

                if (inviteCode && inviteCode.length > 10) {
                    try {
                        // Get group info from invite code
                        const groupInfo = await client.groupGetInviteInfo(inviteCode);
                        if (groupInfo && groupInfo.id) {
                            targetGroupId = groupInfo.id;
                        }
                    } catch (error) {
                        let errorDetail = 'Link grup tidak valid atau sudah expired';
                        let errorTips = '• Pastikan link grup benar dan masih aktif\n┃ ⌬ • Coba minta link baru dari admin grup\n┃ ⌬ • Link mungkin sudah dibatasi atau dihapus';

                        if (error.message.includes('forbidden')) {
                            errorDetail = 'Bot tidak memiliki izin akses ke grup';
                            errorTips = '• Bot perlu di-invite ke grup terlebih dahulu\n┃ ⌬ • Atau grup memiliki pengaturan privasi ketat';
                        } else if (error.message.includes('not-found')) {
                            errorDetail = 'Grup tidak ditemukan';
                            errorTips = '• Link grup mungkin salah atau sudah dihapus\n┃ ⌬ • Coba verifikasi kembali URL yang diberikan';
                        }

                        const invalidUrlMessage = `╭━━━『 ❌ GAGAL AKSES GRUP 』━━━❀
┃ 
┃ 🚫 *${errorDetail}*
┃ ⌬ URL: ${groupUrl}
┃ ⌬ Invite Code: ${inviteCode}
┃ 
┃ 💡 *Solusi yang Bisa Dicoba:*
┃ ⌬ ${errorTips}
┃ 
┃ 📝 *Format URL yang Benar:*
┃ ⌬ https://chat.whatsapp.com/INVITE_CODE
┃ ⌬ Contoh: https://chat.whatsapp.com/CLoa3KctkyHBMADOSGAaYL
┃ 
┃ 🔄 *Langkah Troubleshooting:*
┃ ⌬ 1. Verifikasi link masih aktif dengan buka di browser
┃ ⌬ 2. Pastikan bot sudah di-add ke grup (jika private)
┃ ⌬ 3. Minta admin grup untuk generate link baru
┃ 
┃ 👤 *Status Anda*
┃ ⌬ Nomor: ${senderNumber}
┃ ⌬ Mode Bot: ${config.bot.mode.toUpperCase()}
┃ ⌬ Waktu: ${new Date().toLocaleString('id-ID')}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_❌ Pastikan URL grup valid dan bot memiliki akses!_`;

                        await Wily(invalidUrlMessage, m, client);
                        return;
                    }
                } else {
                    const invalidFormatMessage = `╭━━━『 ❌ FORMAT URL SALAH 』━━━❀
┃ 
┃ 🚫 *Format URL Grup Tidak Benar*
┃ ⌬ URL: ${groupUrl}
┃ 
┃ 📝 *Format yang Benar:*
┃ ⌬ ${prefix}cekidgc https://chat.whatsapp.com/xxxxx
┃ ⌬ Dimana xxxxx adalah invite code grup
┃ 
┃ 📝 *Contoh Penggunaan:*
┃ ⌬ ${prefix}cekidgc https://chat.whatsapp.com/ABC123def456GHI
┃ 
┃ 💡 *Cara Mendapatkan URL Grup:*
┃ ⌬ Masuk ke grup target
┃ ⌬ Klik info grup (nama grup)
┃ ⌬ Pilih "Link Grup"
┃ ⌬ Copy URL yang tersedia
┃ 
┃ 👤 *Status Anda*
┃ ⌬ Nomor: ${senderNumber}
┃ ⌬ Mode Bot: ${config.bot.mode.toUpperCase()}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_❌ Gunakan format URL yang benar!_`;

                    await Wily(invalidFormatMessage, m, client);
                    return;
                }
            } else {
                const noUrlMessage = `╭━━━『 ❌ PARAMETER SALAH 』━━━❀
┃ 
┃ 🚫 *Bukan URL WhatsApp Group*
┃ ⌬ Parameter: ${groupUrl}
┃ 
┃ 📝 *Format yang Benar:*
┃ ⌬ ${prefix}cekidgc [URL_GRUP]
┃ ⌬ URL harus berupa link WhatsApp Group
┃ 
┃ 📝 *Contoh Penggunaan:*
┃ ⌬ ${prefix}cekidgc https://chat.whatsapp.com/ABC123def456GHI
┃ 
┃ 🤔 *Jika Tidak Ada URL?*
┃ ⌬ Gunakan ${prefix}cekidgc tanpa parameter
┃ ⌬ Akan cek grup tempat perintah dikirim
┃ ⌬ (Hanya jika di dalam grup)
┃ 
┃ 👤 *Status Anda*
┃ ⌬ Nomor: ${senderNumber}
┃ ⌬ Mode Bot: ${config.bot.mode.toUpperCase()}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_❌ Parameter harus berupa URL WhatsApp Group!_`;

                await Wily(noUrlMessage, m, client);
                return;
            }
        } else {
            // If no parameter, use current group (if in group)
            if (!isGroup) {
                const needUrlMessage = `╭━━━『 📝 CARA PENGGUNAAN 』━━━❀
┃ 
┃ 🤖 *Fitur Cek ID Grup*
┃ ⌬ Bisa digunakan di chat pribadi
┃ ⌬ Bisa digunakan di dalam grup
┃ ⌬ Memerlukan URL grup sebagai parameter
┃ 
┃ 📝 *Format Penggunaan:*
┃ ⌬ ${prefix}cekidgc [URL_GRUP]
┃ 
┃ 📝 *Contoh:*
┃ ⌬ ${prefix}cekidgc https://chat.whatsapp.com/ABC123def456GHI
┃ 
┃ 💡 *Alternatif di Grup:*
┃ ⌬ Jika Anda di dalam grup
┃ ⌬ Gunakan: ${prefix}cekidgc (tanpa parameter)
┃ ⌬ Akan auto-cek grup tempat perintah dikirim
┃ 
┃ 🔧 *Cara Mendapatkan URL Grup:*
┃ ⌬ Masuk ke grup target
┃ ⌬ Klik nama grup (info grup)
┃ ⌬ Pilih "Link Grup"
┃ ⌬ Copy URL yang muncul
┃ ⌬ Paste setelah command ${prefix}cekidgc
┃ 
┃ 👤 *Status Anda*
┃ ⌬ Nomor: ${senderNumber}
┃ ⌬ Mode Bot: ${config.bot.mode.toUpperCase()}
┃ ⌬ Lokasi: Chat Pribadi
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_📱 Masukkan URL grup atau gunakan di dalam grup!_`;

                await Wily(needUrlMessage, m, client);
                return;
            }

            // If in group and no parameter, use current group
            targetGroupId = chat;
        }

        // Proses langsung tanpa loading message terpisah

        try {
            // Get group metadata
            const groupMetadata = await client.groupMetadata(targetGroupId);

            // Basic group information
            const groupName = groupMetadata.subject || 'Tidak Diketahui';
            const groupDesc = groupMetadata.desc || 'Tidak ada deskripsi';
            const groupId = targetGroupId;
            const groupIdShort = targetGroupId.split('@')[0];

            // Member information
            const participants = groupMetadata.participants || [];
            const totalMembers = participants.length;

            // Count admins and regular members
            const admins = participants.filter(p => p.admin === 'admin');
            const superAdmins = participants.filter(p => p.admin === 'superadmin');
            const regularMembers = participants.filter(p => !p.admin);

            // Function to censor phone number (sensor 3 digit tengah)
            function censorNumber(number) {
                if (!number || number.length < 8) return number;
                const start = number.substring(0, 4);
                const end = number.substring(number.length - 3);
                const middle = '*'.repeat(3);
                return start + middle + end;
            }

            // Get owner/creator yang akurat - cari dari creation metadata
            let groupCreator = 'Tidak diketahui';
            try {
                // Metode 1: Cek superadmin pertama
                if (superAdmins.length > 0) {
                    groupCreator = censorNumber(superAdmins[0].id.split('@')[0]);
                } else {
                    // Metode 2: Cek participant pertama (biasanya creator)
                    const firstParticipant = participants[0];
                    if (firstParticipant) {
                        groupCreator = censorNumber(firstParticipant.id.split('@')[0]);
                    }
                }
            } catch (error) {
                groupCreator = 'Tidak dapat dideteksi';
            }

            // Get group profile picture
            let groupPP = null;
            try {
                groupPP = await client.profilePictureUrl(targetGroupId, 'image');
            } catch (error) {
                groupPP = 'https://files.catbox.moe/9cq0yk.jpg'; // Default group picture
            }

            // Create group invite link
            let inviteLink = 'Tidak dapat membuat link';
            try {
                const inviteCode = await client.groupInviteCode(targetGroupId);
                inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            } catch (error) {
                inviteLink = 'Bot bukan admin atau tidak dapat membuat link';
            }

            // Format time
            const currentTime = new Date().toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            // Create detailed admin list dengan sensor nomor
            let adminList = '';
            if (superAdmins.length > 0) {
                adminList += '\n┃ 👑 *PEMILIK GRUP:*\n';
                superAdmins.forEach((admin, index) => {
                    const adminNumber = censorNumber(admin.id.split('@')[0]);
                    adminList += `┃ ├─ ${index + 1}. ${adminNumber}\n`;
                });
            }

            if (admins.length > 0) {
                adminList += '\n┃ 🛡️ *ADMIN GRUP:*\n';
                admins.forEach((admin, index) => {
                    const adminNumber = censorNumber(admin.id.split('@')[0]);
                    adminList += `┃ ├─ ${index + 1}. ${adminNumber}\n`;
                });
            }

            if (superAdmins.length === 0 && admins.length === 0) {
                adminList = '\n┃ ⚠️ *ADMIN:* Tidak ditemukan admin di grup ini';
            }

            // PESAN PERTAMA: Loading + Info Grup Lengkap dengan foto
            const groupInfoMessage = `╭━━━『 🔍 LOADING & INFO GRUP 』━━━❀
┃ 
┃ ⏳ *Status:* Berhasil memuat data grup ✅
┃ 
┃ 🏷️ *IDENTITAS GRUP*
┃ ├─ Nama: ${groupName}
┃ ├─ Pemilik: ${groupCreator}
┃ ├─ Dibuat: ${new Date(groupMetadata.creation * 1000).toLocaleDateString('id-ID')}
┃ └─ Waktu Cek: ${currentTime}
┃ 
┃ 📝 *DESKRIPSI GRUP*
┃ └─ ${groupDesc}
┃ 
┃ 👥 *STATISTIK MEMBER*
┃ ├─ Total Member: ${totalMembers} orang
┃ ├─ Pemilik Grup: ${superAdmins.length} orang
┃ ├─ Admin Grup: ${admins.length} orang
┃ └─ Member Biasa: ${regularMembers.length} orang
${adminList}
┃ 
┃ 🔗 *LINK GRUP*
┃ └─ ${inviteLink}
┃ 
┃ 👤 *INFO PENGECEKAN*
┃ ├─ Dicek oleh: ${censorNumber(senderNumber)}
┃ ├─ Mode Bot: ${config.bot.mode.toUpperCase()}
┃ ├─ Status: Berhasil ✅
┃ └─ Waktu: ${new Date().toLocaleTimeString('id-ID')}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_📋 Informasi grup berhasil diambil lengkap!_`;

            // Send first message with group profile picture - quoted to user message
            await client.sendMessage(m.key.remoteJid, {
                image: { url: groupPP },
                caption: groupInfoMessage
            }, { quoted: m });

            // PESAN KEDUA: ID Grup dengan Quoted Message ke pesan user
            const idGroupMessage = `╭━━━『 🆔 ID GRUP DETAIL 』━━━❀
┃ 
┃ 🏷️ *INFORMASI ID GRUP*
┃ ├─ Nama Grup: ${groupName}
┃ ├─ ID Pendek: ${groupIdShort}
┃ ├─ ID Lengkap: ${groupId}
┃ └─ Format: ${groupId.endsWith('@g.us') ? 'WhatsApp Group' : 'Unknown Format'}
┃ 
┃ 📋 *DETAIL TEKNIS*
┃ ├─ Server: ${groupId.includes('@g.us') ? 'WhatsApp Group Server' : 'Unknown Server'}
┃ ├─ Type: ${groupId.endsWith('@g.us') ? 'Group Chat' : 'Private Chat'}
┃ └─ Status: Valid Group ID ✅
┃ 
┃ 💾 *PENGGUNAAN ID*
┃ ├─ Untuk API: ${groupIdShort}
┃ ├─ Untuk Bot: ${groupId}
┃ └─ Untuk Script: ${groupId}
┃ 
┃ 🔧 *TEKNIS INFO*
┃ ├─ Extracted: ${new Date().toLocaleTimeString('id-ID')}
┃ ├─ Method: GroupMetadata
┃ └─ Source: ${args.length > 1 ? 'URL Link' : 'Current Group'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🆔 ID grup berhasil diekstrak dan siap digunakan!_`;

            // Send second message as quoted reply to user message
            await client.sendMessage(m.key.remoteJid, {
                text: idGroupMessage
            }, { quoted: m });

        } catch (error) {
            const errorMessage = `╭━━━『 ❌ ERROR GRUP INFO 』━━━❀
┃ 
┃ ⚠️ *Gagal Mendapatkan Info Grup*
┃ ├─ Error: ${error.message}
┃ ├─ Cause: Kemungkinan bot tidak memiliki izin
┃ └─ Solution: Pastikan bot adalah admin grup
┃ 
┃ 🔧 *Solusi yang Bisa Dicoba*
┃ ├─ Pastikan bot adalah admin grup
┃ ├─ Coba lagi dalam beberapa saat
┃ ├─ Periksa koneksi internet
┃ └─ Hubungi admin jika masalah berlanjut
┃ 
┃ 📞 *Kontak Support*
┃ ├─ WhatsApp: 6289688206739
┃ └─ Mention: @6289688206739
┃ 
┃ 👤 *Status Error*
┃ ├─ User: ${senderNumber}
┃ ├─ Mode: ${config.bot.mode.toUpperCase()}
┃ ├─ Time: ${new Date().toLocaleString('id-ID')}
┃ └─ Target: ${targetGroupId}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_❌ Terjadi kesalahan saat mengecek info grup_`;

            await Wily(errorMessage, m, client);
        }

    } catch (error) {
        const fatalErrorMessage = `╭━━━『 💥 FATAL ERROR 』━━━❀
┃ 
┃ 🚨 *Kesalahan Sistem Fatal*
┃ ├─ Error: ${error.message}
┃ ├─ Function: cekidgcHandler
┃ └─ Status: Critical System Error
┃ 
┃ 📞 *Laporkan ke Developer*
┃ ├─ WhatsApp: 6289688206739
┃ ├─ Error Detail: ${error.message}
┃ ├─ Timestamp: ${new Date().toLocaleString('id-ID')}
┃ └─ User: ${senderNumber}
┃ 
┃ 🔄 *Langkah Selanjutnya*
┃ ├─ Restart bot jika perlu
┃ ├─ Coba command lain
┃ └─ Hubungi developer untuk fix
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_💥 Sistem mengalami kesalahan fatal_`;

        await client.sendMessage(m.key.remoteJid, {
            text: fatalErrorMessage
        }, { quoted: m });
    }
}

module.exports = {
    cekidgcHandler,
    checkAccess,
    loadConfig
};
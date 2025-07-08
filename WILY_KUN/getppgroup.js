
const fs = require('fs');
const path = require('path');
const { Wily } = require('../CODE_REPLAY/reply');

// Fungsi untuk membaca config
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
        bot: {
            mode: "public",
            prefix: ".",
            owner: "",
            botNumber: ""
        }
    };
}

// Fungsi untuk mengecek akses berdasarkan mode bot
function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    // Mode public: semua orang bisa akses
    if (botMode === 'public') {
        return true;
    }

    // Mode self: hanya fromMe, bot number, dan owner yang bisa akses
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

// Fungsi ReplyRynzz untuk mengirim balasan dengan format yang rapi
async function ReplyRynzz(teks, msg, sock, media = null, isQuoted = false) {
    const packname = "Group Profile Picture Downloader";
    const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];
    const formattedDate = new Date().toLocaleDateString('id-ID');

    let profilePic;
    try {
        const userJid = msg.key.participant || msg.key.remoteJid;
        profilePic = await sock.profilePictureUrl(userJid, 'image');
    } catch (error) {
        profilePic = "https://files.catbox.moe/mxohav.gif";
    }

    const contextInfo = {
        mentionedJid: [],
        externalAdReply: {
            showAdAttribution: false,
            title: packname,
            body: `${senderName} • ${formattedDate}`,
            thumbnailUrl: profilePic,
            sourceUrl: "",
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    const messageContent = media ? 
        { image: media, caption: teks, contextInfo } : 
        { text: teks, contextInfo };

    const options = isQuoted ? { quoted: msg } : {};

    try {
        await sock.sendMessage(msg.key.remoteJid, messageContent, options);
    } catch (error) {
        // Fallback tanpa context info jika error
        const fallbackContent = media ? 
            { image: media, caption: teks } : 
            { text: teks };
        await sock.sendMessage(msg.key.remoteJid, fallbackContent, options);
    }
}

// Handler utama untuk fitur .getppgroup
async function handleGetPPGroupCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config.bot?.prefix || '.';

        // Ambil text dari pesan atau caption gambar
        let messageText = '';
        
        if (msg.message?.imageMessage?.caption) {
            messageText = msg.message.imageMessage.caption.trim();
        } else if (msg.message?.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text.trim();
        } else if (msg.message?.conversation) {
            messageText = msg.message.conversation.trim();
        }

        // Cek apakah ini command getppgroup
        if (!messageText.toLowerCase().startsWith(`${prefix}getppgroup`)) {
            return false;
        }

        // Validasi hanya bisa digunakan di grup
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        if (!isGroup) {
            const notGroupText = `
❌ *FITUR KHUSUS GRUP!*

🚫 *Error:* Fitur ini hanya bisa digunakan di dalam grup WhatsApp

📝 *Cara Penggunaan:*
• Masuk ke grup yang ingin diambil foto profilnya
• Ketik ${prefix}getppgroup di dalam grup tersebut
• Bot akan otomatis mengambil foto profil grup

💡 *Catatan:*
• Fitur ini tidak dapat digunakan di chat pribadi
• Hanya bekerja di grup WhatsApp
• Bot akan mengambil foto profil grup tempat command dikirim

_🔧 Group Profile Picture Handler - WilyKun Bot_`;

            await ReplyRynzz(notGroupText, msg, sock, null, true);
            return true;
        }

        // Ekstrak nomor pengirim dan validasi akses
        const senderJid = msg.key.remoteJid;
        let actualSenderNumber;

        if (msg.key.participant) {
            // Pesan grup
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            // Pesan dari bot sendiri
            actualSenderNumber = sock.user?.id?.split(':')[0];
        } else {
            // Private chat
            actualSenderNumber = senderJid?.split('@')[0];
        }

        // Cek akses berdasarkan mode bot
        const hasAccess = checkAccess(actualSenderNumber, config, msg.key.fromMe);
        
        if (!hasAccess) {
            // Jika mode self dan user tidak authorized, bot diam saja
            return true; // Return true karena command sudah dihandle (dengan tidak merespons)
        }

        // Ambil ID grup
        const groupJid = msg.key.remoteJid;

        // Kirim pesan loading
        const loadingText = `⏳ *MENGUNDUH FOTO PROFIL GRUP...*

🏢 *Target:* Grup Saat Ini
📱 *Group ID:* ${groupJid.split('@')[0]}
🔍 *Metode:* Group Profile Picture

⏳ Sedang mengunduh foto profil grup, mohon tunggu...`;

        await ReplyRynzz(loadingText, msg, sock, null, true);

        try {
            // Ambil metadata grup terlebih dahulu
            const groupMetadata = await sock.groupMetadata(groupJid);
            const groupName = groupMetadata.subject || 'Unknown Group';
            const groupDescription = groupMetadata.desc || 'Tidak ada deskripsi';
            const memberCount = groupMetadata.participants.length;

            // Coba dapatkan foto profil grup resolusi tinggi
            let profilePicUrl;
            try {
                profilePicUrl = await sock.profilePictureUrl(groupJid, 'image');
            } catch (error) {
                // Jika gagal dengan resolusi tinggi, coba resolusi rendah
                try {
                    profilePicUrl = await sock.profilePictureUrl(groupJid, 'preview');
                } catch (fallbackError) {
                    throw new Error('Grup tidak memiliki foto profil atau tidak dapat diakses');
                }
            }

            // Download gambar dari URL
            const https = require('https');
            const downloadImage = (url) => {
                return new Promise((resolve, reject) => {
                    https.get(url, (response) => {
                        if (response.statusCode !== 200) {
                            reject(new Error(`HTTP ${response.statusCode}`));
                            return;
                        }

                        const chunks = [];
                        response.on('data', chunk => chunks.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(chunks)));
                        response.on('error', reject);
                    }).on('error', reject);
                });
            };

            const imageBuffer = await downloadImage(profilePicUrl);

            // Censor group ID untuk keamanan
            const censoredGroupId = groupJid.split('@')[0].substring(0, 6) + '***' + 
                                   groupJid.split('@')[0].substring(groupJid.split('@')[0].length - 3);

            // Format pesan sukses
            const successText = `
✅ *FOTO PROFIL GRUP BERHASIL DIUNDUH!*

🏢 *Info Grup:*
├─ Nama: ${groupName}
├─ ID: ${censoredGroupId}
├─ Member: ${memberCount} orang
├─ Status: Tersedia ✅
└─ Deskripsi: ${groupDescription.substring(0, 50)}${groupDescription.length > 50 ? '...' : ''}

📸 *Detail Gambar:*
├─ Ukuran: ${(imageBuffer.length / 1024).toFixed(2)} KB
├─ Format: JPEG/PNG
├─ Kualitas: HD Original
└─ Source: WhatsApp Group Server

🎯 *Berhasil diunduh dari grup saat ini!*

_📸 Group Profile Picture Downloader - WilyKun Bot_`;

            // Kirim gambar dengan caption
            await ReplyRynzz(successText, msg, sock, imageBuffer, true);

        } catch (profileError) {
            // Handle berbagai jenis error
            let errorMessage = "❌ *GAGAL MENGUNDUH FOTO PROFIL GRUP*\n\n";
            
            if (profileError.message.includes('not-authorized')) {
                errorMessage += `🚫 *Error:* Tidak memiliki izin mengakses foto profil grup
                
*Kemungkinan Penyebab:*
• Bot bukan admin atau member grup
• Pengaturan privasi grup membatasi akses
• Bot tidak memiliki permission yang cukup
• Grup memiliki pembatasan khusus`;
            } else if (profileError.message.includes('item-not-found') || 
                      profileError.message.includes('tidak memiliki foto profil')) {
                errorMessage += `📭 *Error:* Foto profil grup tidak ditemukan

*Kemungkinan Penyebab:*
• Grup tidak memiliki foto profil
• Foto profil baru saja dihapus
• Grup masih menggunakan foto default
• Pengaturan grup membatasi akses foto`;
            } else {
                errorMessage += `⚠️ *Error:* ${profileError.message}

*Kemungkinan Penyebab:*
• Koneksi internet tidak stabil
• Server WhatsApp sedang bermasalah
• Bot tidak memiliki akses ke grup
• Grup sedang dalam pemeliharaan`;
            }

            errorMessage += `

*Info Grup:*
├─ Group ID: ${groupJid.split('@')[0].substring(0, 6)}***${groupJid.split('@')[0].substring(groupJid.split('@')[0].length - 3)}
├─ Metode: Group Profile Picture
└─ Status: Error ❌

*Tips Solusi:*
• Pastikan bot adalah member grup
• Pastikan grup memiliki foto profil
• Coba lagi beberapa saat
• Pastikan bot memiliki permission yang cukup

_🔧 Group Profile Picture Error Handler - WilyKun Bot_`;

            await ReplyRynzz(errorMessage, msg, sock, null, true);
        }

        return true;

    } catch (error) {
        console.error('Error in handleGetPPGroupCommand:', error);
        
        const errorText = `
❌ *SYSTEM ERROR*

*Detail Error:* ${error.message}

*Silakan coba lagi atau hubungi admin*

_🔧 System Error Handler - WilyKun Bot_`;

        try {
            await ReplyRynzz(errorText, msg, sock, null, true);
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
        
        return true;
    }
}

module.exports = {
    handleGetPPGroupCommand,
    loadConfig,
    checkAccess
};

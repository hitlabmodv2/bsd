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

// Fungsi untuk memformat nomor telepon
function formatPhoneNumber(number) {
    // Hapus semua karakter non-digit
    let cleaned = number.replace(/\D/g, '');

    // Jika dimulai dengan 0, ganti dengan 62
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }

    // Jika tidak dimulai dengan 62, tambahkan 62
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }

    return cleaned + '@s.whatsapp.net';
}

// Fungsi untuk ekstrak nomor dari mention
function extractMentionNumber(text) {
    const mentionRegex = /@(\d+)/g;
    const match = mentionRegex.exec(text);
    return match ? match[1] : null;
}

// Fungsi untuk ekstrak nomor telepon dari teks
function extractPhoneNumber(text) {
    // Pattern untuk nomor Indonesia
    const phonePattern = /(?:\+?62|0)[\s-]?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{0,4})/g;
    const match = phonePattern.exec(text);

    if (match) {
        const fullNumber = match[0].replace(/[\s-]/g, '');
        return fullNumber;
    }

    return null;
}

// Fungsi untuk mengirim balasan dengan format yang rapi
async function ReplyRynzz(teks, msg, sock, media = null, isQuoted = false) {
    const packname = "Profile Picture Downloader";
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

// Handler utama untuk fitur .getppuser
async function handleGetPPUserCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config.bot?.prefix || '.';

        // Ambil text dari pesan atau caption gambar
        let messageText = '';

        // Prioritas: caption gambar > extendedTextMessage > conversation
        if (msg.message?.imageMessage?.caption) {
            messageText = msg.message.imageMessage.caption.trim();
        } else if (msg.message?.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text.trim();
        } else if (msg.message?.conversation) {
            messageText = msg.message.conversation.trim();
        }

        // Cek apakah ini command getppuser
        if (!messageText.toLowerCase().startsWith(`${prefix}getppuser`)) {
            return false;
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

        let targetJid = null;
        let targetName = "Unknown";
        let method = "unknown";

        // 1. PRIORITAS PERTAMA: Cek quoted message (reply)
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedSender = msg.message.extendedTextMessage.contextInfo.participant;
            if (quotedSender) {
                targetJid = quotedSender;
                targetName = msg.message.extendedTextMessage.contextInfo.quotedMessage?.conversation?.split(':')[0] || 
                           "User";
                method = "reply";
            }
        }

        // 2. PRIORITAS KEDUA: Cek mention (@)
        if (!targetJid && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            targetName = targetJid.split('@')[0];
            method = "mention";
        }

        // 3. PRIORITAS KETIGA: Cek mention dalam teks (@62812345678)
        if (!targetJid) {
            const mentionedNumber = extractMentionNumber(messageText);
            if (mentionedNumber) {
                targetJid = formatPhoneNumber(mentionedNumber);
                targetName = mentionedNumber;
                method = "text mention";
            }
        }

        // 4. PRIORITAS KEEMPAT: Cek nomor telepon dalam teks
        if (!targetJid) {
            const args = messageText.split(' ');
            if (args.length > 1) {
                const phoneNumber = extractPhoneNumber(args.slice(1).join(' '));
                if (phoneNumber) {
                    targetJid = formatPhoneNumber(phoneNumber);
                    targetName = phoneNumber;
                    method = "phone number";
                }
            }
        }

        // Jika tidak ada target yang ditemukan
        if (!targetJid) {
            const helpText = `
❌ *FORMAT TIDAK VALID!*

📝 *Cara Penggunaan:*
• *Reply pesan:* Reply pesan seseorang lalu ketik ${prefix}getppuser
• *Mention/Tag:* ${prefix}getppuser @username  
• *Nomor telepon:* ${prefix}getppuser 62812345678
• *Caption gambar:* Kirim gambar dengan caption ${prefix}getppuser @username

💡 *Contoh:*
→ ${prefix}getppuser @62812345678
→ ${prefix}getppuser 081234567890
→ ${prefix}getppuser +62 812-3456-7890

⚠️ *Catatan:*
• Bisa digunakan di private chat atau grup
• Mendukung format nomor Indonesia (+62/0)
• Reply pesan adalah metode tercepat`;

            await ReplyRynzz(helpText, msg, sock, null, true);
            return true;
        }

        // Kirim pesan loading
        const loadingText = `⏳ *MENGUNDUH FOTO PROFIL...*

👤 *Target:* ${targetName}
📱 *Nomor:* ${targetJid.split('@')[0]}
🔍 *Metode:* ${method}

⏳ Sedang mengunduh foto profil, mohon tunggu...`;

        await ReplyRynzz(loadingText, msg, sock, null, true);

        try {
            // Coba dapatkan foto profil resolusi tinggi
            let profilePicUrl;
            try {
                profilePicUrl = await sock.profilePictureUrl(targetJid, 'image');
            } catch (error) {
                // Jika gagal dengan resolusi tinggi, coba resolusi rendah
                try {
                    profilePicUrl = await sock.profilePictureUrl(targetJid, 'preview');
                } catch (fallbackError) {
                    throw new Error('Tidak dapat mengakses foto profil');
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

            // Format pesan sukses
            const successText = `
✅ *FOTO PROFIL BERHASIL DIUNDUH!*

👤 *Info Target:*
├─ Nama: ${targetName}
├─ Nomor: ${targetJid.split('@')[0]}
├─ Status: Tersedia ✅
└─ Metode: ${method}

📸 *Detail Gambar:*
├─ Ukuran: ${(imageBuffer.length / 1024).toFixed(2)} KB
├─ Format: JPEG/PNG
├─ Kualitas: HD Original
└─ Source: WhatsApp Server

🎯 *Berhasil diunduh via ${method}!*

_📸 Profile Picture Downloader - WilyKun Bot_`;

            // Kirim gambar dengan caption
            await ReplyRynzz(successText, msg, sock, imageBuffer, true);

        } catch (profileError) {
            // Handle berbagai jenis error
            let errorMessage = "❌ *GAGAL MENGUNDUH FOTO PROFIL*\n\n";

            if (profileError.message.includes('not-authorized')) {
                errorMessage += `🚫 *Error:* Tidak memiliki izin mengakses foto profil

*Kemungkinan Penyebab:*
• Target memblokir bot
• Pengaturan privasi target membatasi akses
• Nomor tidak terdaftar di WhatsApp
• Target membatasi siapa yang bisa melihat foto profil`;
            } else if (profileError.message.includes('item-not-found')) {
                errorMessage += `📭 *Error:* Foto profil tidak ditemukan

*Kemungkinan Penyebab:*
• Target tidak punya foto profil
• Nomor tidak terdaftar di WhatsApp  
• Target baru bergabung di WhatsApp
• Nomor sudah tidak aktif`;
            } else {
                errorMessage += `⚠️ *Error:* ${profileError.message}

*Kemungkinan Penyebab:*
• Koneksi internet tidak stabil
• Server WhatsApp sedang bermasalah
• Format nomor tidak valid
• Target memblokir akses foto profil`;
            }

            errorMessage += `

*Info Target:*
├─ Nama: ${targetName}
├─ Nomor: ${targetJid.split('@')[0]}
├─ Metode: ${method}
└─ Status: Error ❌

*Tips Solusi:*
• Pastikan nomor valid dan aktif
• Coba lagi beberapa saat
• Pastikan target tidak memblokir bot
• Gunakan reply pesan untuk akurasi lebih baik

_🔧 Profile Picture Error Handler - WilyKun Bot_`;

            await ReplyRynzz(errorMessage, msg, sock, null, true);
        }

        return true;

    } catch (error) {
        console.error('Error in handleGetPPUserCommand:', error);

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
    handleGetPPUserCommand,
    loadConfig,
    checkAccess
};
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

// Import config functions
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

async function ReplyRynzz(teks, msg, sock) {
    try {
        const packname = "Fake Chat Generator";
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        let profilePic;
        try {
            const userJid = msg.key.participant || msg.key.remoteJid;
            profilePic = await sock.profilePictureUrl(userJid, 'image');
        } catch (error) {
            profilePic = "https://files.catbox.moe/mxohav.gif";
        }

        const json = {
            body: teks,
            footer: packname,
            avatar: profilePic,
            name: senderName,
            type: "quote"
        };

        // Use only the first API
        try {
            const response = await axios.post("https://widipe.com/quotedly", json, {
                headers: { "Content-Type": "application/json" },
                responseType: 'arraybuffer',
                timeout: 10000
            });

            const buffer = Buffer.from(response.data);
            return await sock.sendMessage(msg.key.remoteJid, {
                sticker: buffer,
            }, { quoted: msg });
        } catch (apiError) {
            // If API fails, send as regular text message
            return await sock.sendMessage(msg.key.remoteJid, {
                text: teks
            }, { quoted: msg });
        }
    } catch (error) {
        // Fallback to regular text message
        return await sock.sendMessage(msg.key.remoteJid, {
            text: teks
        }, { quoted: msg });
    }
}

async function handleFakeChatCommand(sock, msg) {
    try {
        const config = loadConfig();

        // Get sender information
        const senderJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderNumber = msg.key.participant ? 
            msg.key.participant.split('@')[0] : 
            msg.key.remoteJid.split('@')[0];

        // Check access permission
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Get message text from caption or regular text
        let messageText = '';

        if (msg.message?.imageMessage?.caption) {
            messageText = msg.message.imageMessage.caption.trim();
        } else if (msg.message?.conversation) {
            messageText = msg.message.conversation.trim();
        } else if (msg.message?.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text.trim();
        }

        // Remove prefix from text
        const prefix = config.bot?.prefix || '.';
        const text = messageText.replace(new RegExp(`^${prefix}fakechat\\s*`, 'i'), '').trim();

        if (!text || !text.includes('|')) {
            const helpText = `
❌ *FORMAT SALAH!*

📝 *Cara penggunaan:*
Kirim/reply gambar dengan caption:
${prefix}fakechat Nama|Chat1|Chat2|Chat3|v2

Atau reply gambar dengan:
${prefix}fakechat Risma|Halo|Kamu siapa|Gpp|Sama|v2

📋 *Parameter:*
• Nama - Nama pengirim chat
• Chat1-Chat6 - Pesan chat (minimal 2, maksimal 6)
• v1/v2 - Versi tampilan chat (opsional, default v2)

💡 *Contoh:*
${prefix}fakechat Risma|Halo kak|Apa kabar?|Baik nih|Senang ketemu|v2

⚠️ *Catatan:*
• Harus reply/kirim foto profil
• Minimal 2 bubble chat
• Maksimal 6 bubble chat
• Format: Nama|Chat1|Chat2|...|versi`;

            await ReplyRynzz(helpText, msg, sock);
            return;
        }

        // Parse arguments
        const args = text.split('|').map(v => v.trim());
        const versiRaw = args[args.length - 1]?.toLowerCase();
        const versi = (versiRaw === 'v1' || versiRaw === 'v2') ? versiRaw.replace('v', '') : '2';

        if (versiRaw === 'v1' || versiRaw === 'v2') {
            args.pop(); // Remove version from chat list
        }

        const nama = args[0];
        const chats = args.slice(1);

        if (!nama) {
            await ReplyRynzz("❌ *NAMA TIDAK BOLEH KOSONG!*\n\nFormat: Nama|Chat1|Chat2|...", msg, sock);
            return;
        }

        if (chats.length < 2 || chats.length > 6) {
            await ReplyRynzz("❌ *JUMLAH CHAT TIDAK VALID!*\n\n📝 Minimal 2 bubble chat dan maksimal 6 bubble chat\n\nContoh: Nama|Halo|Apa kabar|Baik|Senang", msg, sock);
            return;
        }

        // Check for media (image) - PERBAIKAN UTAMA DI SINI
        let imageMessage = null;
        let messageToProcess = null;

        // Check if image is sent with caption
        if (msg.message?.imageMessage) {
            imageMessage = msg.message.imageMessage;
            messageToProcess = msg;
        }
        // Check if replying to an image message
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            imageMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
            // Create a proper message object for quoted image
            messageToProcess = {
                key: msg.key,
                message: {
                    imageMessage: imageMessage
                }
            };
        }

        if (!imageMessage) {
            const noImageText = `
❌ *KIRIM ATAU REPLY FOTO PROFIL!*

📱 *Cara penggunaan:*
1. Kirim foto dengan caption:
   ${prefix}fakechat Nama|Chat1|Chat2|v2

2. Atau reply foto dengan:
   ${prefix}fakechat Nama|Chat1|Chat2|v2

🖼️ *Format gambar yang didukung:*
• JPG, JPEG, PNG, WebP
• Ukuran maksimal: 10MB
• Untuk foto profil chat palsu

💡 *Contoh lengkap:*
[Kirim foto] + caption:
${prefix}fakechat Risma|Halo kak|Apa kabar?|Baik nih|v2`;

            await ReplyRynzz(noImageText, msg, sock);
            return;
        }

        // Send processing message
        await ReplyRynzz(`⏳ *MEMPROSES FAKE CHAT...*\n\n🔄 Sedang membuat chat palsu dengan ${chats.length} bubble\n📤 Mengupload foto profil...\n🎨 Generating fake chat v${versi}...`, msg, sock);

        // Download media - PERBAIKAN UTAMA DI SINI
        let buffer;
        try {
            buffer = await downloadMediaMessage(
                messageToProcess,
                'buffer',
                {},
                { 
                    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
                }
            );
        } catch (downloadError) {
            await ReplyRynzz('❌ *GAGAL MENGUNDUH GAMBAR!*\n\nTidak dapat mengunduh foto profil.\nSilakan coba lagi!', msg, sock);
            return;
        }

        if (!buffer || buffer.length === 0) {
            await ReplyRynzz('❌ *GAGAL MENGUNDUH GAMBAR!*\n\nTidak dapat mengunduh foto profil.\nSilakan coba lagi!', msg, sock);
            return;
        }

        // Check file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            await ReplyRynzz('❌ *UKURAN GAMBAR TERLALU BESAR!*\n\nMaksimal 10MB.\nKompres gambar terlebih dahulu!', msg, sock);
            return;
        }

        // Upload image to CloudGood
        const form = new FormData();
        form.append('file', buffer, { filename: `pp_${Date.now()}.jpg` });

        let imageUrl;
        try {
            const upload = await axios.post('https://cloudgood.web.id/upload.php', form, {
                headers: form.getHeaders(),
                timeout: 30000
            });

            const uploaded = upload.data;
            if (!uploaded.url) {
                await ReplyRynzz('❌ *GAGAL UPLOAD GAMBAR!*\n\nServer upload sedang bermasalah.\nSilakan coba lagi nanti!', msg, sock);
                return;
            }
            imageUrl = uploaded.url;
        } catch (uploadError) {
            await ReplyRynzz('❌ *GAGAL UPLOAD GAMBAR!*\n\nServer CloudGood sedang bermasalah.\nSilakan coba lagi nanti!', msg, sock);
            return;
        }

        // Create fake chat
        const base = `https://apii.baguss.web.id/tools/fakechat?apikey=bagus&nama=${encodeURIComponent(nama)}&imageurl=${encodeURIComponent(imageUrl)}&versi=${versi}`;
        const query = chats.map((v, i) => `chat${i + 1}=${encodeURIComponent(v)}`).join('&');
        const fullUrl = `${base}&${query}`;

        try {
            const { data } = await axios.get(fullUrl, { timeout: 30000 });

            if (!data.success || !data.result) {
                await ReplyRynzz('❌ *GAGAL MEMBUAT FAKE CHAT!*\n\nAPI sedang bermasalah.\nSilakan coba lagi nanti!', msg, sock);
                return;
            }

            // Send result with quoted message
            const resultCaption = `
✅ *FAKE CHAT BERHASIL DIBUAT!*

👤 *Nama:* ${nama}
💬 *Jumlah Chat:* ${chats.length} bubble
🎨 *Versi:* v${versi}

📝 *Chat yang dibuat:*
${chats.map((chat, i) => `${i + 1}. ${chat}`).join('\n')}

🤖 *Dibuat oleh WilyKun Bot*
⚡ *Powered by Bagus API*`;

            await sock.sendMessage(msg.key.remoteJid, {
                image: { url: data.result },
                caption: resultCaption
            }, { quoted: msg });

        } catch (apiError) {
            await ReplyRynzz('❌ *API FAKE CHAT BERMASALAH!*\n\nServer API sedang sibuk.\nSilakan coba lagi nanti!', msg, sock);
            return;
        }

    } catch (error) {
        console.error('FakeChat Error:', error);
        await ReplyRynzz('❌ *TERJADI KESALAHAN!*\n\nGagal memproses fake chat.\nSilakan coba lagi!', msg, sock);
    }
}

module.exports = { handleFakeChatCommand };
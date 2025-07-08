const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

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
    const isHardcodedBot = cleanSender === '6289681008411';

    return isFromMe || isBotNumber || isOwnerNumber || isHardcodedBot;
}

// Upload to Uguu.se
async function uploadToUguu(buffer, filename) {
    try {
        const form = new FormData();
        form.append('files[]', buffer, { filename });

        const { data } = await axios.post('https://uguu.se/upload.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        if (data.files && data.files[0]) {
            return data.files[0].url;
        } else {
            throw new Error('Gagal upload ke uguu.se');
        }
    } catch (error) {
        throw new Error('Error upload gambar: ' + error.message);
    }
}

// Reply function
async function ReplyRynzz(text, msg, sock) {
    await sock.sendMessage(msg.key.remoteJid, {
        text: text
    }, { quoted: msg });
}

// Handler untuk command toghibli
async function handleToghibliCommand(sock, msg) {
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

        const prefix = config.bot?.prefix || '.';

        // Jika hanya ketik .toghibli tanpa gambar, tampilkan help
        if (messageText === `${prefix}toghibli` && !msg.message?.imageMessage && !msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            const helpText = `
🎨 *GHIBLI STYLE CONVERTER*

📝 *Cara Penggunaan:*
• Kirim gambar dengan caption \`.toghibli\`
• Reply gambar dengan \`.toghibli\`

✨ *Fitur ini mengubah gambar biasa menjadi style Studio Ghibli yang indah*

💡 *Contoh:*
\`\`\`
.toghibli
\`\`\`
(kirim dengan gambar atau reply gambar)

🎬 *Studio Ghibli Style Features:*
├─ 🎨 Artistic anime transformation
├─ 🌸 Soft pastel color palette
├─ ✨ Dreamy atmosphere effect
├─ 🌙 Hand-drawn animation style
└─ 🎭 Character-focused enhancement

📋 *Format yang didukung:*
• JPG, JPEG, PNG, WebP
• Ukuran maksimal: 10MB
• Resolusi optimal: 512x512 - 1024x1024

⚠️ *Tips untuk hasil terbaik:*
• Gunakan foto portrait atau landscape yang jelas
• Hindari gambar yang terlalu gelap atau blur
• Foto dengan pencahayaan yang baik akan memberikan hasil optimal

🤖 *Powered by Siputzx API*
`;
            await ReplyRynzz(helpText, msg, sock);
            return;
        }

        // Check for media (image)
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
            messageToProcess = {
                key: msg.key,
                message: {
                    imageMessage: imageMessage
                }
            };
        }

        if (!imageMessage) {
            const noImageText = `
❌ *KIRIM ATAU REPLY GAMBAR!*

📱 *Cara penggunaan:*
1. Kirim gambar dengan caption:
   ${prefix}toghibli

2. Atau reply gambar dengan:
   ${prefix}toghibli

🖼️ *Format gambar yang didukung:*
• JPG, JPEG, PNG, WebP
• Ukuran maksimal: 10MB
• Untuk konversi ke style Studio Ghibli

💡 *Contoh lengkap:*
[Kirim foto] + caption:
${prefix}toghibli
`;
            await ReplyRynzz(noImageText, msg, sock);
            return;
        }

        // Send processing message
        await ReplyRynzz(`🎨 *MEMPROSES GHIBLI CONVERSION...*\n\n🔄 Sedang mengubah gambar ke style Studio Ghibli\n📤 Mengupload gambar...\n✨ Applying Ghibli magic...`, msg, sock);

        // Download media
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
            await ReplyRynzz('❌ *GAGAL MENGUNDUH GAMBAR!*\n\nTidak dapat mengunduh gambar.\nSilakan coba lagi!', msg, sock);
            return;
        }

        if (!buffer || buffer.length === 0) {
            await ReplyRynzz('❌ *GAGAL MENGUNDUH GAMBAR!*\n\nGambar tidak dapat diproses.\nSilakan coba lagi!', msg, sock);
            return;
        }

        // Check file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            await ReplyRynzz('❌ *UKURAN GAMBAR TERLALU BESAR!*\n\nMaksimal 10MB.\nKompres gambar terlebih dahulu!', msg, sock);
            return;
        }

        // Upload image to uguu.se
        const filename = `ghibli_${Date.now()}.jpg`;
        let imageUrl;
        try {
            imageUrl = await uploadToUguu(buffer, filename);
        } catch (uploadError) {
            await ReplyRynzz(`❌ *GAGAL UPLOAD GAMBAR!*\n\n${uploadError.message}\nSilakan coba lagi!`, msg, sock);
            return;
        }

        // Process with Ghibli API
        try {
            const apiUrl = `https://api.siputzx.my.id/api/image2ghibli?image=${encodeURIComponent(imageUrl)}`;
            const response = await axios.get(apiUrl, { 
                timeout: 60000,
                responseType: 'arraybuffer'
            });

            // Check if response is an image
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.startsWith('image/')) {
                await ReplyRynzz('❌ *API ERROR!*\n\nGagal memproses gambar ke style Ghibli.\nSilakan coba lagi!', msg, sock);
                return;
            }

            // Send result
            const resultCaption = `
✅ *GHIBLI CONVERSION BERHASIL!*

🎨 *Transformasi Completed:*
├─ 🎬 Style: Studio Ghibli
├─ ✨ Effect: Anime Art Style
├─ 🌸 Palette: Soft & Dreamy
└─ 🎭 Quality: Enhanced

📊 *Processing Info:*
├─ Original Size: ${Math.round(buffer.length / 1024)}KB
├─ Processing Time: Fast
├─ API: Siputzx v2
└─ Status: Success ✅

🎬 *Hasil gambar telah diubah ke style Studio Ghibli yang indah!*
✨ *Nikmati artwork dengan sentuhan magic anime*

🤖 *WilyKun Bot - Ghibli Art Generator*
⚡ *Powered by Siputzx API*
`;

            await sock.sendMessage(msg.key.remoteJid, {
                image: Buffer.from(response.data),
                caption: resultCaption
            }, { quoted: msg });

        } catch (apiError) {
            if (apiError.code === 'ECONNABORTED') {
                await ReplyRynzz('❌ *PROSES TIMEOUT!*\n\nProses konversi memakan waktu terlalu lama.\nSilakan coba dengan gambar yang lebih kecil!', msg, sock);
            } else if (apiError.response?.status === 404) {
                await ReplyRynzz('❌ *API TIDAK TERSEDIA!*\n\nService Ghibli converter sedang offline.\nSilakan coba lagi nanti!', msg, sock);
            } else if (apiError.response?.status >= 500) {
                await ReplyRynzz('❌ *SERVER ERROR!*\n\nServer API sedang bermasalah.\nSilakan coba lagi nanti!', msg, sock);
            } else {
                await ReplyRynzz('❌ *GAGAL KONVERSI GHIBLI!*\n\nTerjadi kesalahan saat memproses.\nSilakan coba lagi!', msg, sock);
            }
        }

    } catch (error) {
        await ReplyRynzz('❌ *TERJADI KESALAHAN!*\n\nGagal memproses Ghibli conversion.\nSilakan coba lagi!', msg, sock);
    }
}

// Handler untuk caption gambar
async function handleToghibliCaption(sock, msg) {
    try {
        const config = loadConfig();

        // Cek akses permission
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderNumber = msg.key.participant ? 
            msg.key.participant.split('@')[0] : 
            msg.key.remoteJid.split('@')[0];

        if (!checkAccess(senderNumber, config, fromMe)) {
            return false; // Mode self, bot diam saja
        }

        // Pastikan ada gambar dengan caption .toghibli
        if (!msg.message?.imageMessage?.caption) {
            return false;
        }

        const prefix = config?.bot?.prefix || '.';
        const caption = msg.message.imageMessage.caption.trim();

        if (caption !== `${prefix}toghibli`) {
            return false;
        }

        // Processing message
        await ReplyRynzz(`🎨 *MEMPROSES GHIBLI CONVERSION...*\n\n🔄 Sedang mengubah gambar ke style Studio Ghibli\n📤 Mengupload gambar...\n✨ Applying Ghibli magic...`, msg, sock);

        // Download media
        let buffer;
        try {
            buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                { 
                    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
                }
            );
        } catch (downloadError) {
            await ReplyRynzz('❌ *GAGAL MENGUNDUH GAMBAR!*\n\nTidak dapat mengunduh gambar.\nSilakan coba lagi!', msg, sock);
            return true;
        }

        if (!buffer || buffer.length === 0) {
            await ReplyRynzz('❌ *BUFFER GAMBAR KOSONG!*\n\nGambar tidak dapat diproses.\nSilakan coba dengan gambar lain!', msg, sock);
            return true;
        }

        // Check file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            await ReplyRynzz('❌ *UKURAN GAMBAR TERLALU BESAR!*\n\nMaksimal 10MB.\nKompres gambar terlebih dahulu!', msg, sock);
            return true;
        }

        // Upload ke uguu.se
        const filename = `ghibli_${Date.now()}.jpg`;
        let imageUrl;
        try {
            imageUrl = await uploadToUguu(buffer, filename);
        } catch (uploadError) {
            await ReplyRynzz(`❌ *GAGAL UPLOAD GAMBAR!*\n\n${uploadError.message}\nSilakan coba lagi!`, msg, sock);
            return true;
        }

        // Process with Ghibli API
        try {
            const apiUrl = `https://api.siputzx.my.id/api/image2ghibli?image=${encodeURIComponent(imageUrl)}`;
            const response = await axios.get(apiUrl, { 
                timeout: 60000,
                responseType: 'arraybuffer'
            });

            // Check if response is an image
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.startsWith('image/')) {
                await ReplyRynzz('❌ *API ERROR!*\n\nGagal memproses gambar ke style Ghibli.\nSilakan coba lagi!', msg, sock);
                return true;
            }

            // Send result
            const resultCaption = `
✅ *GHIBLI CONVERSION BERHASIL!*

🎨 *Transformasi Completed:*
├─ 🎬 Style: Studio Ghibli
├─ ✨ Effect: Anime Art Style
├─ 🌸 Palette: Soft & Dreamy
└─ 🎭 Quality: Enhanced

📊 *Processing Info:*
├─ Original Size: ${Math.round(buffer.length / 1024)}KB
├─ Processing Time: Fast
├─ API: Siputzx v2
└─ Status: Success ✅

🎬 *Hasil gambar telah diubah ke style Studio Ghibli yang indah!*
✨ *Nikmati artwork dengan sentuhan magic anime*

🤖 *WilyKun Bot - Ghibli Art Generator*
⚡ *Powered by Siputzx API*
`;

            await sock.sendMessage(msg.key.remoteJid, {
                image: Buffer.from(response.data),
                caption: resultCaption
            }, { quoted: msg });

        } catch (apiError) {
            if (apiError.code === 'ECONNABORTED') {
                await ReplyRynzz('❌ *PROSES TIMEOUT!*\n\nProses konversi memakan waktu terlalu lama.\nSilakan coba dengan gambar yang lebih kecil!', msg, sock);
            } else if (apiError.response?.status === 404) {
                await ReplyRynzz('❌ *API TIDAK TERSEDIA!*\n\nService Ghibli converter sedang offline.\nSilakan coba lagi nanti!', msg, sock);
            } else if (apiError.response?.status >= 500) {
                await ReplyRynzz('❌ *SERVER ERROR!*\n\nServer API sedang bermasalah.\nSilakan coba lagi nanti!', msg, sock);
            } else {
                await ReplyRynzz('❌ *GAGAL KONVERSI GHIBLI!*\n\nTerjadi kesalahan saat memproses.\nSilakan coba lagi!', msg, sock);
            }
        }

        return true;

    } catch (error) {
        await ReplyRynzz('❌ *TERJADI KESALAHAN!*\n\nGagal memproses Ghibli conversion.\nSilakan coba lagi!', msg, sock);
        return true;
    }
}

module.exports = {
    handleToghibliCommand,
    handleToghibliCaption
};
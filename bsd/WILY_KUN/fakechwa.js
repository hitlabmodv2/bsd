const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

async function handleFakeChwaCommand(sock, msg) {
    try {
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
        const config = loadConfig();
        const prefix = config.bot?.prefix || '.';
        const text = messageText.replace(new RegExp(`^${prefix}fakechwa\\s*`, 'i'), '').trim();

        if (!text) {
            const helpText = `❌ *Format salah!*

📝 *Cara penggunaan:*
Kirim gambar dengan caption:
${prefix}fakechwa NamaChannel|Deskripsi|500Rb|true

Atau reply gambar dengan:
${prefix}fakechwa NamaChannel|Deskripsi|500Rb|true

📋 *Parameter:*
• NamaChannel - Nama channel yang diinginkan
• Deskripsi - Deskripsi channel
• 500Rb - Jumlah pengikut (bisa 1k, 10k, 100k, 1M, dll)
• true/false - Status verified

💡 *Contoh:*
${prefix}fakechwa Gaming Channel|Channel untuk gamers|250k|true`;

            await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
            return;
        }

        const [nama, deskripsi, pengikut, verif] = text.split('|');
        if (!nama || !deskripsi || !pengikut || !verif) {
            const errorText = `❌ *Format tidak lengkap!*

📝 *Format yang benar:*
${prefix}fakechwa NamaChannel|Deskripsi|500Rb|true

🔍 *Yang Anda masukkan:*
• Nama: ${nama || 'Kosong'}
• Deskripsi: ${deskripsi || 'Kosong'}
• Pengikut: ${pengikut || 'Kosong'}
• Verified: ${verif || 'Kosong'}

💡 *Pastikan menggunakan tanda | untuk memisahkan setiap parameter*`;

            await sock.sendMessage(msg.key.remoteJid, { text: errorText }, { quoted: msg });
            return;
        }

        // Check for media (image)
        let media = null;
        let mime = '';

        // Check if image is in the current message
        if (msg.message?.imageMessage) {
            media = msg.message.imageMessage;
            mime = media.mimetype || '';
        }
        // Check if replying to an image message
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            media = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
            mime = media.mimetype || '';
        }

        if (!media || !mime.startsWith('image/')) {
            const noImageText = `❌ *Kirim atau reply gambar profil channel!*

📱 *Cara penggunaan:*
1. Kirim gambar dengan caption:
   ${prefix}fakechwa NamaChannel|Deskripsi|500Rb|true

2. Atau reply gambar dengan:
   ${prefix}fakechwa NamaChannel|Deskripsi|500Rb|true

🖼️ *Format gambar yang didukung:*
• JPG, JPEG, PNG, WebP
• Ukuran maksimal: 10MB
• Resolusi disarankan: 500x500px`;

            await sock.sendMessage(msg.key.remoteJid, { text: noImageText }, { quoted: msg });
            return;
        }

        // Send processing message
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ *Sedang memproses...*\n\n🔄 Mengunduh gambar...\n📤 Mengupload ke server...\n🎨 Membuat fake channel...' }, { quoted: msg });

        // Download media
        let buffer;
        if (msg.message?.imageMessage) {
            buffer = await downloadMediaMessage(msg, 'buffer', {});
        } else {
            // Create a temporary message object for quoted image
            const quotedMsg = {
                ...msg,
                message: {
                    imageMessage: msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage
                }
            };
            buffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
        }

        if (!buffer || buffer.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal mengunduh gambar. Silakan coba lagi!' }, { quoted: msg });
            return;
        }

        // Check file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Ukuran gambar terlalu besar! Maksimal 10MB.' }, { quoted: msg });
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
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal upload gambar ke CloudGood. Silakan coba lagi!' }, { quoted: msg });
                return;
            }
            imageUrl = uploaded.url;
        } catch (uploadError) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal upload gambar. Server upload sedang bermasalah!' }, { quoted: msg });
            return;
        }

        // Create fake channel
        const api = `https://apii.baguss.web.id/tools/fakechwa?apikey=bagus&nama=${encodeURIComponent(nama)}&pengikut=${encodeURIComponent(pengikut)}&deskripsi=${encodeURIComponent(deskripsi)}&jangkau=5Rb&bersih=+120&image=${encodeURIComponent(imageUrl)}&verified=${verif}`;

        try {
            const { data } = await axios.get(api, { timeout: 30000 });

            if (!data.success || !data.result) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal membuat fake channel WhatsApp. API sedang bermasalah!' }, { quoted: msg });
                return;
            }

            // Send result with quoted message
            const resultCaption = `✅ *Fake Channel WhatsApp Berhasil Dibuat!*

📛 *Nama:* ${nama}
📄 *Deskripsi:* ${deskripsi}
👥 *Pengikut:* ${pengikut}
✔️ *Verified:* ${verif}
🎯 *Jangkauan:* 5Rb
🧹 *Bersih:* +120

🤖 *Dibuat oleh WilyKun Bot*`;

            await sock.sendMessage(msg.key.remoteJid, {
                image: { url: data.result },
                caption: resultCaption
            }, { quoted: msg });

        } catch (apiError) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ API fake channel sedang bermasalah. Silakan coba lagi nanti!' }, { quoted: msg });
            return;
        }

    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan saat memproses fake channel!' }, { quoted: msg });
    }
}

// Helper function to load config
function loadConfig() {
    try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return { bot: { prefix: '.' } };
    } catch (error) {
        return { bot: { prefix: '.' } };
    }
}

module.exports = { handleFakeChwaCommand };
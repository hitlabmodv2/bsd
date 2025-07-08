
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

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
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        sticker: { packname: 'WilyKun Bot', author: '© WilyKun' }
    };
}

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

async function handleQcCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Validasi awal struktur message
        if (!m || !m.message) {
            return;
        }

        let messageContent = '';
        let qcText = '';

        // Get message text dari berbagai format
        if (m.message?.conversation) {
            messageContent = m.message.conversation.trim();
        } else if (m.message?.extendedTextMessage?.text) {
            messageContent = m.message.extendedTextMessage.text.trim();
        }

        // Check if it's qc command
        const isQcCommand = messageContent.startsWith(`${prefix}qc`);

        if (!isQcCommand) {
            return;
        }

        // Check access based on bot mode FIRST before processing
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Extract text after command
        qcText = messageContent.slice(`${prefix}qc`.length).trim();

        // If no text provided, show help
        if (!qcText) {
            const helpText = `
╭━━━『 💬 QUOTE CARD CREATOR 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ ${prefix}qc [teks yang ingin dijadikan quote]
┃ 
┃ 📋 *Contoh penggunaan:*
┃ • ${prefix}qc Halo semua!
┃ • ${prefix}qc @62812345678 Quotes kamu keren!
┃ • ${prefix}qc 081234567890 Semangat terus!
┃ • Reply pesan lalu ${prefix}qc Quotes untuk orang ini
┃ 
┃ 👤 *Target foto profil:*
┃ • Reply pesan: Gunakan PP orang yang direply
┃ • Mention: ${prefix}qc @username teks quote
┃ • Nomor: ${prefix}qc 62812345678 teks quote
┃ • Default: Gunakan PP pengirim jika tidak ada target
┃ 
┃ 🎨 *Fitur:*
┃ • Auto deteksi target user untuk PP
┃ • Background hitam elegan & kontras tinggi
┃ • Format optimal untuk sticker
┃ • Ukuran 512x512 standar WhatsApp
┃ 
┃ 📦 *Info sticker pack:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Ketik ${prefix}qc diikuti teks untuk membuat quote card!_`;

            await Wily(helpText, m, client);
            return;
        }

        // Send processing message
        await Wily("⏳ Sedang membuat quote card sticker...", m, client);

        // Get user profile picture - check if there's a target user mentioned
        let ppuser;
        let targetJid = null;
        let targetName = "";

        // Check if message is from bot itself (fromMe = true)
        const isFromBot = m.key.fromMe;

        if (isFromBot) {
            // If bot is using the command, use bot's own profile picture by default
            targetJid = client.user?.id?.split(':')[0] + '@s.whatsapp.net';
            targetName = "Bot";
        } else {
            // For regular users, use existing logic

            // Priority 1: Check if replying to someone's message
            if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedSender = m.message.extendedTextMessage.contextInfo.participant;
                if (quotedSender) {
                    targetJid = quotedSender;
                    targetName = quotedSender.split('@')[0];
                }
            }

            // Priority 2: Check for mentions
            if (!targetJid && m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
                targetName = targetJid.split('@')[0];
            }

            // Priority 3: Extract number from text (@62812345678 format)
            if (!targetJid) {
                const mentionMatch = qcText.match(/@(\d+)/);
                if (mentionMatch) {
                    let number = mentionMatch[1];
                    // Format number properly
                    if (number.startsWith('0')) {
                        number = '62' + number.substring(1);
                    } else if (!number.startsWith('62')) {
                        number = '62' + number;
                    }
                    targetJid = number + '@s.whatsapp.net';
                    targetName = number;
                    // Remove the mention from qcText
                    qcText = qcText.replace(/@\d+/g, '').trim();
                }
            }

            // Priority 4: Extract phone number from text
            if (!targetJid) {
                const phoneMatch = qcText.match(/(?:\+?62|0)[\s-]?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{0,4})/);
                if (phoneMatch) {
                    let number = phoneMatch[0].replace(/[\s-]/g, '');
                    if (number.startsWith('0')) {
                        number = '62' + number.substring(1);
                    } else if (!number.startsWith('62')) {
                        number = '62' + number;
                    }
                    targetJid = number + '@s.whatsapp.net';
                    targetName = number;
                    // Remove the phone number from qcText
                    qcText = qcText.replace(/(?:\+?62|0)[\s-]?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{1,4})[\s-]?(\d{0,4})/, '').trim();
                }
            }

            // If no target specified, use sender's profile picture (original behavior)
            if (!targetJid) {
                targetJid = m.key.participant || m.key.remoteJid;
                targetName = "You";
            }
        }

        try {
            ppuser = await client.profilePictureUrl(targetJid, 'image');
        } catch (err) {
            ppuser = 'https://telegra.ph/file/a059a6a734ed202c879d3.jpg';
        }

        // Use black background for better text visibility and elegant look
        const backgroundColor = "#000000";

        // Prepare JSON for quote API dengan ukuran yang optimal untuk sticker
        const json = {
            "type": "quote",
            "format": "png",
            "backgroundColor": backgroundColor,
            "width": 512,  // Ukuran optimal untuk sticker
            "height": 512, // Ukuran optimal untuk sticker
            "scale": 2,
            "messages": [
                {
                    "entities": [],
                    "avatar": true,
                    "from": {
                        "id": 1,
                        "name": m.pushName || "Anonymous",
                        "photo": {
                            "url": ppuser
                        }
                    },
                    "text": qcText,
                    "replyMessage": {}
                }
            ]
        };

        try {
            // Make request to quote API
            const response = await axios.post('https://bot.lyo.su/quote/generate', json, {
                headers: {'Content-Type': 'application/json'},
                timeout: 30000
            });

            if (!response.data || !response.data.result || !response.data.result.image) {
                throw new Error('API response tidak valid');
            }

            // Convert base64 to buffer
            const buffer = Buffer.from(response.data.result.image, 'base64');

            if (!buffer || buffer.length === 0) {
                throw new Error('Gagal mengkonversi gambar');
            }

            // Create sticker using wa-sticker-formatter for proper format
            const stickerMetadata = {
                pack: config.sticker?.packname || 'WilyKun Bot',
                author: config.sticker?.author || '© WilyKun',
                type: StickerTypes.FULL,
                categories: ['💬', '🗨️'],
                quality: 100,
                background: 'transparent'
            };

            // Create sticker instance
            const sticker = new Sticker(buffer, stickerMetadata);
            const stickerBuffer = await sticker.toBuffer();

            if (!stickerBuffer || stickerBuffer.length === 0) {
                throw new Error('Gagal membuat sticker dari quote card');
            }

            // Send sticker with proper mimetype
            await client.sendMessage(m.key.remoteJid, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: m });

            // Send success message
            const successText = `
╭━━━『 ✅ QUOTE CARD BERHASIL 』━━━❀
┃ 
┃ 💬 *Quote card sticker berhasil dibuat!*
┃ 👤 Profile Picture: ${targetName}
┃ 📦 Pack: ${stickerMetadata.pack}
┃ ✍️ Author: ${stickerMetadata.author}
┃ 🎨 Background: Black (Elegant Style)
┃ 📏 Size: 512x512px (Optimal)
┃ 
┃ 💡 *Tips:*
┃ • Sticker sudah terkirim di atas ⬆️
┃ • Ukuran dioptimalkan untuk WhatsApp
┃ • Format WebP untuk kualitas terbaik
┃ • Background hitam untuk kontras maksimal
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Quote: "${qcText}"_`;

            await Wily(successText, m, client);

        } catch (apiError) {
            const errorText = `
╭━━━『 ❌ ERROR QUOTE CARD 』━━━❀
┃ 
┃ 💥 *Gagal membuat quote card sticker!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • API quote generator sedang down
┃ • Koneksi internet tidak stabil
┃ • Teks terlalu panjang
┃ • Server sedang overload
┃ 
┃ 💡 *Solusi:*
┃ • Coba lagi dalam beberapa saat
┃ • Gunakan teks yang lebih pendek
┃ • Periksa koneksi internet
┃ • Hindari karakter khusus yang aneh
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan teks yang berbeda!_`;

            await Wily(errorText, m, client);
        }

    } catch (error) {
        const generalErrorText = `
╭━━━『 ❌ SYSTEM ERROR 』━━━❀
┃ 
┃ 💥 *Terjadi kesalahan sistem!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Bot sedang mengalami gangguan
┃ • Memory atau CPU overload
┃ • Network connection error
┃ • Sticker formatter error
┃ 
┃ 💡 *Solusi:*
┃ • Tunggu beberapa saat lalu coba lagi
┃ • Restart bot jika diperlukan
┃ • Periksa status sistem
┃ • Contact admin jika masalah berlanjut
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Mohon maaf atas ketidaknyamanan ini!_`;

        await Wily(generalErrorText, m, client);
    }
}

module.exports = {
    handleQcCommand,
    checkAccess,
    loadConfig
};

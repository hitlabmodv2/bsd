const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require('fs');
const path = require('path');
const { Wily } = require('../CODE_REPLAY/reply');

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

    // Enhanced cleaning untuk berbagai format JID
    const cleanSender = senderNumber?.replace(/@.*/, '')?.replace(/:\d+$/, '');
    const cleanBot = botNumber?.replace(/@.*/, '')?.replace(/:\d+$/, '');
    const cleanOwner = ownerNumber?.replace(/@.*/, '')?.replace(/:\d+$/, '');

    const isBotNumber = cleanSender === cleanBot;
    const isOwnerNumber = cleanSender === cleanOwner;
    const isFromMe = fromMe === true;

    return isFromMe || isBotNumber || isOwnerNumber;
}

async function handleStickerCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Enhanced validasi struktur message untuk berbagai WhatsApp client
        if (!m) {
            console.log('❌ Message object is null');
            return;
        }

        // Cek berbagai format message
        const msg = m.message || m.msg || m;
        if (!msg) {
            console.log('❌ No message content found');
            return;
        }

        let messageContent = '';
        let imageMessage = null;
        let hasValidImage = false;

        // Check for image with caption FIRST (prioritas utama)
        if (msg.imageMessage?.caption) {
            messageContent = msg.imageMessage.caption.trim();
            imageMessage = msg.imageMessage;
            hasValidImage = true;
        }
        // Check for quoted image (reply)
        else if (msg.extendedTextMessage?.text) {
            messageContent = msg.extendedTextMessage.text.trim();
            // Check for quoted image
            if (msg.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage) {
                imageMessage = msg.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
                hasValidImage = true;
            }
        }
        // Regular text message without image
        else if (msg.conversation) {
            messageContent = msg.conversation.trim();
        }
        // Alternative message formats
        else if (msg.text) {
            messageContent = msg.text.trim();
        }

        // Check if it's sticker command
        const isCommand = messageContent === `${prefix}s` || messageContent === `${prefix}sticker`;

        if (!isCommand) {
            return; // Bukan command sticker, keluar tanpa response
        }

        // Enhanced JID detection untuk berbagai WhatsApp client
        let senderJid;
        
        // Prioritas pengecekann JID
        if (m.key.participant) {
            // Pesan dari grup
            senderJid = m.key.participant;
        } else if (m.key.remoteJid) {
            // Pesan pribadi
            senderJid = m.key.remoteJid;
        } else if (m.participant) {
            // Format alternatif
            senderJid = m.participant;
        } else {
            // Fallback
            senderJid = m.from || m.sender;
        }

        const fromMe = m.key.fromMe || false;

        // Enhanced access control - lebih fleksibel untuk berbagai client WhatsApp
        const botMode = config?.bot?.mode || 'public';
        let hasAccess = false;

        if (botMode === 'public') {
            hasAccess = true;
        } else if (botMode === 'self') {
            // Mode self: izinkan dari bot sendiri, owner, atau bot number
            const botNumber = config?.bot?.botNumber;
            const ownerNumber = config?.bot?.owner;
            
            const cleanSender = senderJid?.replace(/@.*/, '')?.replace(/:\d+$/, '');
            const cleanBot = botNumber?.replace(/@.*/, '')?.replace(/:\d+$/, '');
            const cleanOwner = ownerNumber?.replace(/@.*/, '')?.replace(/:\d+$/, '');
            
            hasAccess = fromMe || 
                       cleanSender === cleanBot || 
                       cleanSender === cleanOwner ||
                       senderJid === botNumber ||
                       senderJid === ownerNumber;
        }

        if (!hasAccess) {
            return; // Silent exit untuk access denied
        }

        // Must have image (either direct or quoted)
        if (!hasValidImage) {
            const helpText = `
╭━━━『 🎨 STICKER CREATOR 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ 1️⃣ Kirim gambar dengan caption ${prefix}s
┃ 2️⃣ Reply gambar dengan ${prefix}s
┃ 3️⃣ Ketik ${prefix}sticker untuk nama lengkap
┃ 
┃ 🎯 *Format yang didukung:*
┃ • JPG, JPEG, PNG, WEBP, GIF
┃ • BMP, TIFF, SVG
┃ • Ukuran maksimal: 10MB
┃ • Resolusi optimal: 512x512px
┃ 
┃ 📦 *Info sticker pack:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim gambar untuk membuat sticker!_`;

            await Wily(helpText, m, client);
            return;
        }

        // Send processing message
        await Wily("⏳ Sedang memproses gambar menjadi sticker...", m, client);

        // Download image
        let buffer;
        try {
            if (m.message?.imageMessage?.caption) {
                // Direct image with caption
                buffer = await downloadMediaMessage(m, 'buffer', {}, {});
            } else {
                // Quoted image
                const quotedMessage = {
                    key: m.key,
                    message: { imageMessage: imageMessage }
                };
                buffer = await downloadMediaMessage(quotedMessage, 'buffer', {}, {});
            }

            if (!buffer || buffer.length === 0) {
                await Wily("❌ Gagal mengunduh gambar. Pastikan gambar valid dan tidak corrupt!", m, client);
                return;
            }

            // Enhanced image validation
            const isValidImage = 
                // JPEG
                (buffer[0] === 0xFF && buffer[1] === 0xD8) ||
                // PNG
                (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) ||
                // GIF
                (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) ||
                // WEBP
                (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
                 buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) ||
                // BMP
                (buffer[0] === 0x42 && buffer[1] === 0x4D);

            if (!isValidImage) {
                await Wily("❌ Format file tidak didukung! Gunakan JPG, PNG, GIF, WEBP, atau BMP.", m, client);
                return;
            }

        } catch (downloadError) {
            // Silent error logging

            const emergencyMsg = `
❌ *GAGAL DOWNLOAD GAMBAR*

🔧 **SOLUSI CEPAT:**
1️⃣ **Kirim ulang gambar dengan caption .s**
2️⃣ **Jangan pakai reply** (ada bug WhatsApp)
3️⃣ **Forward gambar** lalu kirim dengan caption .s

💡 **CARA YANG SELALU WORK:**
• Kirim gambar → langsung tulis .s di caption
• Ini 100% pasti berhasil!

🚀 **Tips:** Caption method lebih stabil dan cepat!`;

            await Wily(emergencyMsg, m, client);
            return;
        }

        // Create sticker using wa-sticker-formatter
        try {
            const stickerMetadata = {
                pack: config.sticker?.packname || 'WilyKun Bot',
                author: config.sticker?.author || '© WilyKun',
                type: StickerTypes.FULL,
                categories: ['🤖'],
                quality: 95,
                background: 'transparent'
            };

            const sticker = new Sticker(buffer, stickerMetadata);
            const stickerBuffer = await sticker.toBuffer();

            if (!stickerBuffer || stickerBuffer.length === 0) {
                await Wily("❌ Gagal membuat sticker. Format gambar mungkin tidak kompatibel.", m, client);
                return;
            }

            // Send sticker
            await client.sendMessage(m.key.remoteJid, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: m });

            // Send success message
            const successText = `
╭━━━『 ✅ STICKER BERHASIL 』━━━❀
┃ 
┃ 🎨 *Sticker berhasil dibuat!*
┃ 📦 Pack: ${stickerMetadata.pack}
┃ ✍️ Author: ${stickerMetadata.author}
┃ 
┃ 💡 *Tips:*
┃ • Gunakan gambar dengan background transparan untuk hasil terbaik
┃ • Ukuran optimal: 512x512px
┃ • Format terbaik: PNG dengan background transparan
┃ • Semua format gambar didukung (JPG, PNG, GIF, WEBP, BMP)
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Selamat menggunakan sticker baru!_`;

            await Wily(successText, m, client);

        } catch (stickerError) {
            const errorText = `
╭━━━『 ❌ ERROR STICKER 』━━━❀
┃ 
┃ 💥 *Gagal membuat sticker!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Format gambar tidak didukung
┃ • Ukuran file terlalu besar (>10MB)
┃ • File gambar corrupt atau rusak
┃ • Koneksi tidak stabil
┃ 
┃ 💡 *Solusi:*
┃ • Coba dengan gambar lain
┃ • Pastikan ukuran < 10MB
┃ • Gunakan format JPG/PNG/GIF/WEBP
┃ • Periksa koneksi internet
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan gambar yang berbeda!_`;
            await Wily(errorText, m, client);

        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ ERROR STICKER 』━━━❀
┃ 
┃ 💥 *Gagal membuat sticker!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Format gambar tidak didukung
┃ • Ukuran file terlalu besar (>10MB)
┃ • File gambar corrupt atau rusak
┃ • Koneksi tidak stabil
┃ 
┃ 💡 *Solusi:*
┃ • Coba dengan gambar lain
┃ • Pastikan ukuran < 10MB
┃ • Gunakan format JPG/PNG/GIF/WEBP
┃ • Periksa koneksi internet
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan gambar yang berbeda!_`;

        await Wily(errorText, m, client);
    }
}

module.exports = {
    handleStickerCommand,
    checkAccess,
    loadConfig
};
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const sharp = require('sharp');

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



// Method untuk membuat meme menggunakan Sharp (lebih reliable)
async function createMemeManual(imageBuffer, topText, bottomText) {
    try {
        // Konversi ke PNG dulu jika input WEBP
        let processedBuffer = imageBuffer;

        // Check if input is WEBP and convert to PNG
        if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46 && 
            imageBuffer[8] === 0x57 && imageBuffer[9] === 0x45 && imageBuffer[10] === 0x42 && imageBuffer[11] === 0x50) {
            processedBuffer = await sharp(imageBuffer)
                .png()
                .toBuffer();
        }

        // Get image metadata
        const metadata = await sharp(processedBuffer).metadata();
        const { width, height } = metadata;

        // Calculate dimensions (minimum 512px)
        let newWidth = Math.max(width, 512);
        let newHeight = Math.max(height, 512);

        // Maintain aspect ratio
        const aspectRatio = width / height;
        if (newWidth / newHeight !== aspectRatio) {
            if (newWidth / aspectRatio <= newHeight) {
                newHeight = Math.round(newWidth / aspectRatio);
            } else {
                newWidth = Math.round(newHeight * aspectRatio);
            }
        }

        // Resize image
        let baseImage = sharp(processedBuffer)
            .resize(newWidth, newHeight, { 
                fit: 'fill',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            });

        // Enhanced font size calculation for better visibility
        const baseFontSize = Math.max(32, Math.min(newWidth / 12, 64));
        const fontSize = baseFontSize;
        const strokeWidth = Math.max(3, fontSize / 12);

        // Better text positioning margins
        const topMargin = fontSize * 0.8;
        const bottomMargin = fontSize * 0.8;

        // Function to create text SVG with enhanced stroke and styling
        function createTextSVG(text, x, y, fontSize, color = 'white', stroke = 'black', strokeWidth = 2) {
            const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            // Enhanced stroke effect dengan multiple layers
            return `
<svg width="${newWidth}" height="${newHeight}">
    <defs>
        <style>
            .meme-text-shadow { 
                font-family: Impact, "Arial Black", "Helvetica Bold", sans-serif; 
                font-weight: 900; 
                font-size: ${fontSize}px; 
                text-anchor: middle; 
                dominant-baseline: central;
                fill: black;
                stroke: black;
                stroke-width: ${strokeWidth * 2};
                opacity: 0.8;
            }
            .meme-text-stroke { 
                font-family: Impact, "Arial Black", "Helvetica Bold", sans-serif; 
                font-weight: 900; 
                font-size: ${fontSize}px; 
                text-anchor: middle; 
                dominant-baseline: central;
                fill: none;
                stroke: ${stroke};
                stroke-width: ${strokeWidth * 1.5};
                stroke-linejoin: round;
                stroke-linecap: round;
            }
            .meme-text-fill { 
                font-family: Impact, "Arial Black", "Helvetica Bold", sans-serif; 
                font-weight: 900; 
                font-size: ${fontSize}px; 
                text-anchor: middle; 
                dominant-baseline: central;
                fill: ${color};
                stroke: none;
            }
        </style>
    </defs>
    <!-- Shadow layer -->
    <text x="${x + 2}" y="${y + 2}" class="meme-text-shadow">${escapedText.toUpperCase()}</text>
    <!-- Stroke layer -->
    <text x="${x}" y="${y}" class="meme-text-stroke">${escapedText.toUpperCase()}</text>
    <!-- Fill layer -->
    <text x="${x}" y="${y}" class="meme-text-fill">${escapedText.toUpperCase()}</text>
</svg>`;
        }

        const overlays = [];

        // Add top text with better positioning
        if (topText && topText.trim()) {
            const topTextSVG = createTextSVG(
                topText.trim(),
                newWidth / 2,
                topMargin + (fontSize / 2),
                fontSize,
                'white',
                'black',
                strokeWidth
            );

            overlays.push({
                input: Buffer.from(topTextSVG),
                top: 0,
                left: 0
            });
        }

        // Add bottom text with better positioning
        if (bottomText && bottomText.trim()) {
            const bottomTextSVG = createTextSVG(
                bottomText.trim(),
                newWidth / 2,
                newHeight - bottomMargin - (fontSize / 2),
                fontSize,
                'white',
                'black',
                strokeWidth
            );

            overlays.push({
                input: Buffer.from(bottomTextSVG),
                top: 0,
                left: 0
            });
        }

        // Composite the image with text overlays
        if (overlays.length > 0) {
            baseImage = baseImage.composite(overlays);
        }

        // Return as PNG buffer
        return await baseImage.png().toBuffer();

    } catch (sharpError) {
        // Simple fallback - just return original image converted to PNG
        try {
            return await sharp(imageBuffer)
                .png()
                .toBuffer();
        } catch (fallbackError) {
            return imageBuffer;
        }
    }
}

async function handleSmemeCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Validasi awal struktur message
        if (!m || !m.message) {
            return;
        }

        let messageContent = '';
        let imageMessage = null;
        let hasValidImage = false;
        let memeTexts = [];

        // Check for image with caption FIRST (prioritas utama)
        if (m.message?.imageMessage?.caption) {
            messageContent = m.message.imageMessage.caption.trim();
            imageMessage = m.message.imageMessage;
            hasValidImage = true;
        }
        // Check for quoted image (reply)
        else if (m.message?.extendedTextMessage?.text) {
            messageContent = m.message.extendedTextMessage.text.trim();
            // Check for quoted image
            if (m.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage) {
                imageMessage = m.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
                hasValidImage = true;
            }
        }
        // Regular text message without image
        else if (m.message?.conversation) {
            messageContent = m.message.conversation.trim();
        }

        // Parse smeme command and texts
        const smemeRegex = new RegExp(`^\\${prefix}smeme\\s+(.*)$`);
        const exactSmemeRegex = new RegExp(`^\\${prefix}smeme\\s*$`);
        const match = messageContent.match(smemeRegex);
        const exactMatch = messageContent.match(exactSmemeRegex);

        // Handle exact .smeme command without parameters
        if (exactMatch && !hasValidImage) {
            const exampleText = `
╭━━━『 🎭 MEME STICKER CREATOR 』━━━❀
┃ 
┃ 👋 *HAI! SELAMAT DATANG DI MEME CREATOR!*
┃ 
┃ 🎯 *CARA MENGGUNAKAN:*
┃ 
┃ 📸 *STEP 1:* Kirim gambar
┃ 📝 *STEP 2:* Tulis caption: ${prefix}smeme text atas|text bawah
┃ 🎭 *STEP 3:* Tunggu meme sticker jadi!
┃ 
┃ 💡 *CONTOH CAPTION YANG BISA DICOBA:*
┃ 
┃ ${prefix}smeme when you|see this bot
┃ ${prefix}smeme coding at|3 AM be like
┃ ${prefix}smeme me trying|to understand this
┃ ${prefix}smeme boss: why late?|me: traffic jam
┃ ${prefix}smeme expectation|vs reality
┃ ${prefix}smeme monday morning|energy level
┃ ${prefix}smeme when debugging|works perfectly
┃ ${prefix}smeme my code|actually works?
┃ ${prefix}smeme trying to|fix one bug
┃ ${prefix}smeme stackoverflow|saved my life
┃ 
┃ 🎨 *FORMAT:*
┃ • text atas|text bawah
┃ • pisahkan dengan tanda |
┃ • bisa hanya text atas atau bawah saja
┃ 
┃ 📂 *FORMAT GAMBAR YANG DIDUKUNG:*
┃ • JPG/JPEG ✅
┃ • PNG ✅  
┃ • GIF ✅
┃ • WEBP ✅
┃ • BMP ✅
┃ • Maksimal 10MB
┃ 
┃ 🚀 *LANGKAH MUDAH:*
┃ 1. Ambil gambar dari galeri/kamera
┃ 2. Sebelum kirim, tulis caption ${prefix}smeme text|text
┃ 3. Kirim gambar dengan caption tersebut
┃ 4. Bot akan buat meme sticker otomatis!
┃ 
┃ 🎭 *INFO PACK:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🎉 *YUK COBA SEKARANG!* 
_Kirim gambar dengan caption ${prefix}smeme text|text_`;

            await Wily(exampleText, m, client);
            return;
        }

        // Handle exact .smeme command when there IS an image but no text parameters
        if (exactMatch && hasValidImage) {
            const tutorialText = `
╭━━━『 🎭 TUTORIAL MEME STICKER 』━━━❀
┃ 
┃ 🖼️ *GAMBAR DITEMUKAN!*
┃ ✨ Tinggal tambahin text aja nih!
┃ 
┃ 📝 *FORMAT YANG BENAR:*
┃ 
┃ ${prefix}smeme text atas|text bawah
┃ 
┃ 🎯 *CONTOH PENGGUNAAN:*
┃ 
┃ ▸ ${prefix}smeme when you|see this meme
┃ ▸ ${prefix}smeme coding at|3 AM be like
┃ ▸ ${prefix}smeme me trying|to understand
┃ ▸ ${prefix}smeme boss: why late?|me: traffic jam
┃ ▸ ${prefix}smeme expectation|vs reality
┃ ▸ ${prefix}smeme monday morning|energy level
┃ ▸ ${prefix}smeme debugging|works perfectly
┃ ▸ ${prefix}smeme my code|actually works?
┃ ▸ ${prefix}smeme trying to|fix one bug
┃ ▸ ${prefix}smeme stackoverflow|hero
┃ 
┃ 🎨 *TIPS KREATIF:*
┃ • Text atas: situasi/konteks
┃ • Text bawah: reaksi/response
┃ • Pisahkan dengan tanda | (pipe)
┃ • Bisa hanya text atas atau bawah saja
┃ • Gunakan text pendek dan catchy
┃ 
┃ 🚀 *CARA CEPAT:*
┃ 1. Reply gambar ini dengan: ${prefix}smeme text|text
┃ 2. Atau kirim ulang gambar dengan caption: ${prefix}smeme text|text
┃ 3. Bot langsung bikin meme sticker!
┃ 
┃ 🎭 *PACK INFO:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

💡 *SEKARANG COBA:* Reply gambar ini dengan ${prefix}smeme text|text
_Contoh: ${prefix}smeme when you|forget to add text_`;

            await Wily(tutorialText, m, client);
            return;
        }

        if (!match) {
            return; // Bukan command smeme, keluar tanpa response
        }

        // Check access based on bot mode FIRST before processing
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            // In self mode, bot should not respond to unauthorized users
            return; // Silent exit, no response
        }

        // Parse meme texts (format: toptext|bottomtext)
        const textPart = match[1];
        if (textPart.includes('|')) {
            memeTexts = textPart.split('|').map(text => text.trim());
        } else {
            memeTexts = [textPart.trim(), '']; // Only top text
        }

        // Must have image (either direct or quoted)
        if (!hasValidImage) {
            const helpText = `
╭━━━『 🎭 MEME STICKER CREATOR 』━━━❀
┃ 
┃ 📝 *CARA PENGGUNAAN LENGKAP:*
┃ 
┃ 🖼️ *METHOD 1 - KIRIM GAMBAR + CAPTION:*
┃ • Kirim gambar dengan caption ${prefix}smeme text atas|text bawah
┃ • Ini adalah cara PALING MUDAH dan SELALU WORK!
┃ 
┃ 💬 *METHOD 2 - REPLY GAMBAR:*
┃ • Reply/balas gambar dengan ${prefix}smeme text atas|text bawah
┃ • Metode alternatif jika method 1 tidak bisa
┃ 
┃ 🎯 *FORMAT COMMAND:*
┃ • ${prefix}smeme text atas|text bawah
┃ • ${prefix}smeme hanya text atas|
┃ • ${prefix}smeme |hanya text bawah
┃ 
┃ 📦 *CONTOH LENGKAP:*
┃ • ${prefix}smeme ketika|kamu coding
┃ • ${prefix}smeme me trying|to debug
┃ • ${prefix}smeme stonks|📈
┃ • ${prefix}smeme when you|realize it's monday
┃ • ${prefix}smeme coding be like|error everywhere
┃ • ${prefix}smeme drake pointing|meme generator
┃ 
┃ 🎨 *INFO MEME PACK:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ 
┃ 💡 *TIPS PENGGUNAAN:*
┃ • Gunakan text pendek dan catchy
┃ • Format: text atas|text bawah
┃ • Pisahkan dengan tanda | (pipe)
┃ • Semua format gambar didukung (JPG, PNG, GIF, WEBP)
┃ • Ukuran maksimal 10MB
┃ 
┃ 🚀 *LANGKAH CEPAT:*
┃ 1. Kirim gambar 
┃ 2. Tulis caption: ${prefix}smeme text|text
┃ 3. Send dan tunggu sticker jadi!
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim gambar dengan caption untuk membuat meme sticker! 🎭_`;

            await Wily(helpText, m, client);
            return;
        }

        // Validate meme texts
        const topText = memeTexts[0] || '';
        const bottomText = memeTexts[1] || '';

        if (!topText && !bottomText) {
            await Wily(`❌ Masukkan text untuk meme!\n\n*Contoh:* ${prefix}smeme when you|see this meme`, m, client);
            return;
        }

        // Send processing message
        await Wily(`🎭 Sedang membuat meme sticker...\n\n📝 *Text Atas:* ${topText || 'Kosong'}\n📝 *Text Bawah:* ${bottomText || 'Kosong'}`, m, client);

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
            const emergencyMsg = `
❌ *GAGAL DOWNLOAD GAMBAR*

🔧 **SOLUSI CEPAT:**
1️⃣ **Kirim ulang gambar dengan caption ${prefix}smeme text|text**
2️⃣ **Jangan pakai reply** (ada bug WhatsApp)
3️⃣ **Forward gambar** lalu kirim dengan caption ${prefix}smeme text|text

💡 **CARA YANG SELALU WORK:**
• Kirim gambar → langsung tulis ${prefix}smeme text|text di caption
• Ini 100% pasti berhasil!

🚀 **Tips:** Caption method lebih stabil dan cepat!`;

            await Wily(emergencyMsg, m, client);
            return;
        }

        // Create meme using improved manual method
        try {
            let memeBuffer;

            // Create meme with text overlay - ALWAYS apply text if provided
            memeBuffer = await createMemeManual(buffer, topText, bottomText);

            // Create sticker using wa-sticker-formatter
            const stickerMetadata = {
                pack: config.sticker?.packname || 'WilyKun Bot',
                author: config.sticker?.author || '© WilyKun',
                type: StickerTypes.FULL,
                categories: ['🎭', '😂'],
                quality: 95,
                background: 'transparent'
            };

            const sticker = new Sticker(memeBuffer, stickerMetadata);
            const stickerBuffer = await sticker.toBuffer();

            if (!stickerBuffer || stickerBuffer.length === 0) {
                await Wily("❌ Gagal membuat meme sticker. Format gambar mungkin tidak kompatibel.", m, client);
                return;
            }

            // Send sticker
            await client.sendMessage(m.key.remoteJid, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: m });

            // Send success message
            const successText = `
╭━━━『 ✅ MEME STICKER BERHASIL 』━━━❀
┃ 
┃ 🎭 *Meme sticker berhasil dibuat!*
┃ 📝 Text Atas: ${topText || 'Kosong'}
┃ 📝 Text Bawah: ${bottomText || 'Kosong'}
┃ 📦 Pack: ${stickerMetadata.pack}
┃ ✍️ Author: ${stickerMetadata.author}
┃ 
┃ 💡 *Tips meme terbaik:*
┃ • Gunakan text pendek dan catchy
┃ • Kombinasi gambar + text yang lucu
┃ • Format: text atas|text bawah
┃ • Semua format gambar didukung
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Selamat menggunakan meme sticker baru! 😂_`;

            await Wily(successText, m, client);

        } catch (stickerError) {
            await Wily("❌ Gagal membuat meme sticker. Pastikan gambar tidak corrupt dan ukuran tidak terlalu besar!", m, client);
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ ERROR MEME STICKER 』━━━❀
┃ 
┃ 💥 *Gagal membuat meme sticker!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Format gambar tidak didukung
┃ • Ukuran file terlalu besar (>10MB)
┃ • File gambar corrupt atau rusak
┃ • Text terlalu panjang
┃ • Koneksi tidak stabil
┃ 
┃ 💡 *Solusi:*
┃ • Coba dengan gambar lain
┃ • Pastikan ukuran < 10MB
┃ • Gunakan format JPG/PNG/GIF/WEBP
┃ • Persingkat text meme
┃ • Periksa koneksi internet
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan gambar dan text yang berbeda!_`;

        await Wily(errorText, m, client);
    }
}

module.exports = {
    handleSmemeCommand,
    checkAccess,
    loadConfig
};
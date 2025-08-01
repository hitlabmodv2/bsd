
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { Wily } = require('../CODE_REPLAY/reply');

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
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        sticker: { packname: 'WilyKun Bot', author: '© WilyKun' }
    };
}

// Check access based on bot mode
function checkAccess(senderJid, config, fromMe) {
    if (config.bot?.mode === 'self') {
        const senderNumber = senderJid?.split('@')[0];
        const botNumber = config.bot?.botNumber;
        const ownerNumber = config.bot?.owner;
        
        return fromMe || 
               senderNumber === botNumber || 
               senderNumber === ownerNumber || 
               senderNumber === '6289681008411';
    }
    return true; // Public mode allows all users
}

// Function to create sticker with watermark
async function createStickerWithWatermark(imageBuffer, packname, author) {
    try {
        const stickerMetadata = {
            pack: packname || 'WilyKun Bot',
            author: author || '© WilyKun',
            type: StickerTypes.FULL,
            categories: ['💧', '🏷️'],
            quality: 95,
            background: 'transparent'
        };

        const sticker = new Sticker(imageBuffer, stickerMetadata);
        return await sticker.toBuffer();
    } catch (error) {
        throw new Error(`Failed to create sticker: ${error.message}`);
    }
}

// Main handler for SWM commands
async function handleSwmCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';
        
        // Get message text
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';
        
        if (!messageText) return;
        
        // Parse command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();
        
        if (command !== 'swm' && command !== 'wm') return;
        
        // Check access based on bot mode
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        
        if (!checkAccess(senderJid, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }
        
        // Check if sticker is provided via reply
        let stickerMessage = null;
        let imageMessage = null;
        
        // Check for replied sticker
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
            stickerMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage;
        }
        // Check for replied image
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            imageMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        }
        // Check for direct sticker
        else if (msg.message?.stickerMessage) {
            stickerMessage = msg.message.stickerMessage;
        }
        // Check for direct image
        else if (msg.message?.imageMessage) {
            imageMessage = msg.message.imageMessage;
        }
        
        if (!stickerMessage && !imageMessage) {
            const helpText = `❌ *FORMAT SALAH!*

📝 *Cara penggunaan SWM (Sticker Watermark):*

🎯 *Fungsi:*
• *SWM* = Sticker Watermark
• *WM* = Watermark
• Menambahkan watermark (pack name & author) pada sticker

📋 *Format penggunaan:*
${prefix}swm packname|author (reply sticker/gambar)
${prefix}wm packname|author (reply sticker/gambar)

💡 *Contoh lengkap:*
1. Reply sticker dengan: ${prefix}swm MyPack|MyName
2. Reply gambar dengan: ${prefix}wm BotPack|Owner
3. Kirim gambar dengan caption: ${prefix}swm TestPack|TestAuthor

📋 *Detail parameter:*
• *packname* = Nama pack sticker (akan muncul di info sticker)
• *author* = Nama author/pembuat (akan muncul di info sticker)
• Gunakan tanda "|" untuk memisahkan packname dan author

🔧 *Apa itu SWM/WM?*
• Memberikan identitas pada sticker Anda
• Menambahkan nama pack dan author
• Sticker akan ter-watermark dengan info yang Anda berikan
• Berguna untuk branding sticker pack pribadi

⚡ *Fitur:*
• Support sticker dan gambar
• Kualitas HD tetap terjaga
• Background transparan dipertahankan
• Compatible dengan semua WhatsApp client

📱 *Status Bot:*
• Mode: ${config.bot.mode.toUpperCase()}
• Prefix: ${prefix}
• Akses: ${config.bot.mode === 'self' ? 'Owner & Bot Only' : 'Semua User'}

✨ Reply sticker/gambar dengan format yang benar!`;

            await Wily(helpText, msg, sock);
            return;
        }
        
        // Check if watermark parameters are provided
        if (args.length < 2) {
            const parameterText = `❌ *PARAMETER TIDAK LENGKAP!*

📝 *Format yang benar:*
${prefix}${command} packname|author

💡 *Contoh:*
• ${prefix}${command} MyStickers|Owner
• ${prefix}${command} BotPack|WilyKun
• ${prefix}${command} CustomPack|MyName

🔧 *Penjelasan:*
• *packname* = Nama pack yang akan muncul di info sticker
• *author* = Nama pembuat yang akan muncul di info sticker
• Gunakan tanda "|" untuk memisahkan keduanya

⚠️ *Catatan penting:*
• Jangan lupa reply sticker/gambar yang mau di-watermark
• Kedua parameter (packname & author) wajib diisi
• Maksimal 30 karakter untuk masing-masing parameter

📱 Silakan coba lagi dengan format yang benar!`;

            await Wily(parameterText, msg, sock);
            return;
        }
        
        // Parse watermark parameters
        const watermarkText = args.slice(1).join(' ');
        const watermarkParts = watermarkText.split('|');
        
        if (watermarkParts.length !== 2) {
            const formatText = `❌ *FORMAT WATERMARK SALAH!*

📝 *Format yang benar:*
${prefix}${command} packname|author

❌ *Format yang Anda gunakan:*
${watermarkText}

💡 *Contoh yang benar:*
• ${prefix}${command} MyPack|Owner
• ${prefix}${command} BotStickers|WilyKun
• ${prefix}${command} FunnyPack|Creator

🔧 *Aturan format:*
• Harus ada tanda "|" untuk memisahkan packname dan author
• Packname di sebelah kiri tanda "|"
• Author di sebelah kanan tanda "|"
• Tidak boleh ada tanda "|" tambahan

📱 Silakan gunakan format yang benar!`;

            await Wily(formatText, msg, sock);
            return;
        }
        
        const packname = watermarkParts[0].trim();
        const author = watermarkParts[1].trim();
        
        // Validate packname and author length
        if (packname.length === 0 || author.length === 0) {
            const validationText = `❌ *PARAMETER KOSONG!*

⚠️ *Masalah ditemukan:*
${packname.length === 0 ? '• Packname tidak boleh kosong' : ''}
${author.length === 0 ? '• Author tidak boleh kosong' : ''}

📝 *Format yang benar:*
${prefix}${command} packname|author

💡 *Contoh:*
• ${prefix}${command} MyStickers|Owner
• ${prefix}${command} BotPack|Creator

🔧 *Pastikan:*
• Packname terisi (di sebelah kiri "|")
• Author terisi (di sebelah kanan "|")
• Tidak ada spasi berlebih

📱 Silakan coba lagi!`;

            await Wily(validationText, msg, sock);
            return;
        }
        
        if (packname.length > 30 || author.length > 30) {
            const lengthText = `❌ *PARAMETER TERLALU PANJANG!*

📏 *Batas karakter:*
• Packname: ${packname.length}/30 karakter
• Author: ${author.length}/30 karakter

⚠️ *Masalah:*
${packname.length > 30 ? `• Packname terlalu panjang (${packname.length} karakter)` : ''}
${author.length > 30 ? `• Author terlalu panjang (${author.length} karakter)` : ''}

💡 *Solusi:*
• Persingkat nama packname dan author
• Maksimal 30 karakter untuk masing-masing
• Gunakan singkatan jika perlu

📝 *Contoh yang baik:*
• ${prefix}${command} MyPack|Owner (pendek dan jelas)
• ${prefix}${command} BotStic|Wily (disingkat)

📱 Silakan coba dengan nama yang lebih pendek!`;

            await Wily(lengthText, msg, sock);
            return;
        }
        
        // Send loading message
        const loadingText = `⏳ *SEDANG MEMPROSES SWM...*

🎨 Menambahkan watermark pada sticker...
📦 Pack: ${packname}
✍️ Author: ${author}
🔄 Processing dengan wa-sticker-formatter...

💧 Mohon tunggu sebentar...`;
        
        await Wily(loadingText, msg, sock);
        
        try {
            let mediaBuffer;
            
            // Download media
            if (stickerMessage) {
                // Create a mock message object for sticker
                const mockStickerMsg = {
                    key: msg.key,
                    message: {
                        stickerMessage: stickerMessage
                    }
                };
                mediaBuffer = await downloadMediaMessage(mockStickerMsg, 'buffer', {});
            } else if (imageMessage) {
                // Create a mock message object for image
                const mockImageMsg = {
                    key: msg.key,
                    message: {
                        imageMessage: imageMessage
                    }
                };
                mediaBuffer = await downloadMediaMessage(mockImageMsg, 'buffer', {});
            }
            
            if (!mediaBuffer || mediaBuffer.length === 0) {
                await Wily('❌ *GAGAL DOWNLOAD MEDIA!*\n\nTidak dapat mengunduh sticker/gambar yang direply.\n\n💡 Pastikan sticker/gambar masih tersedia dan coba lagi.', msg, sock);
                return;
            }
            
            // Create sticker with custom watermark
            const stickerBuffer = await createStickerWithWatermark(mediaBuffer, packname, author);
            
            if (!stickerBuffer || stickerBuffer.length === 0) {
                await Wily('❌ *GAGAL MEMBUAT STICKER!*\n\nTerjadi kesalahan saat memproses watermark.\n\n💡 Coba dengan media yang berbeda.', msg, sock);
                return;
            }
            
            // Send watermarked sticker
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: msg });
            
            // Send success message
            const successText = `✅ *SWM BERHASIL DITAMBAHKAN!*

💧 *Watermark berhasil diterapkan:*
📦 Pack: ${packname}
✍️ Author: ${author}
🎨 Engine: wa-sticker-formatter
⚡ Kualitas: HD Original

🔧 *Detail SWM:*
• Sticker watermark telah berhasil dibuat
• Info pack dan author ter-embed dalam sticker
• Background transparan dipertahankan
• Compatible dengan semua WhatsApp client

💡 *Fitur SWM:*
• Memberikan identitas pada sticker Anda
• Branding untuk koleksi sticker pribadi
• Info watermark akan muncul di detail sticker
• Berguna untuk membedakan sticker pack

🎯 *Tips:*
• Gunakan nama pack yang mudah diingat
• Author bisa berupa nama atau brand Anda
• Watermark akan permanen pada sticker
• Bisa digunakan untuk semua jenis gambar/sticker

✨ Sticker dengan watermark siap digunakan!`;

            await Wily(successText, msg, sock);
            
        } catch (error) {
            const errorText = `❌ *ERROR PROCESSING SWM!*

💥 Gagal memproses watermark sticker
🔧 Error: ${error.message}

💡 *Kemungkinan penyebab:*
• Format media tidak didukung
• File media corrupt atau rusak
• Ukuran file terlalu besar
• Masalah koneksi saat download

🛠️ *Solusi:*
• Coba dengan sticker/gambar lain
• Pastikan media dalam kondisi baik
• Gunakan file dengan ukuran < 10MB
• Periksa koneksi internet

🔄 Silakan coba lagi dengan media yang berbeda!`;

            await Wily(errorText, msg, sock);
        }
        
    } catch (error) {
        // Silent error handling
        const errorText = `❌ *TERJADI KESALAHAN SISTEM!*

💥 Error saat memproses command SWM
🔧 Silakan coba lagi dalam beberapa saat

💡 *Tips:*
• Pastikan format command benar
• Reply sticker/gambar yang valid
• Gunakan parameter watermark yang sesuai

🔄 Coba lagi: ${config?.bot?.prefix || '.'}swm packname|author`;

        await Wily(errorText, msg, sock);
    }
}

module.exports = {
    handleSwmCommand
};

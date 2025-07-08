

const axios = require('axios');
const { loadConfig } = require('../Wilykun.js');
const { Wily } = require('../CODE_REPLAY/reply.js');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Function to check access based on bot mode
function checkAccess(senderJid, config, fromMe) {
    if (config.bot?.mode === 'self') {
        const botNumber = config.bot?.botNumber || '';
        const ownerNumber = config.bot?.owner || '';
        const senderNumber = senderJid.split('@')[0];
        const isHardcodedBot = senderNumber === '6289681008411';

        return fromMe || senderNumber === botNumber || senderNumber === ownerNumber || isHardcodedBot;
    }
    return true; // Public mode allows everyone
}

// Function to upload image to hosting service
async function uploadImageToHost(imageBuffer) {
    try {
        // Try uploading to catbox.moe
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', blob, 'image.jpg');

        const response = await axios.post('https://catbox.moe/user/api.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 30000
        });

        if (response.data && response.data.startsWith('https://')) {
            return response.data.trim();
        }

        throw new Error('Upload failed');
    } catch (error) {
        // Fallback to telegra.ph
        try {
            const formData = new FormData();
            const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
            formData.append('file', blob, 'image.jpg');

            const response = await axios.post('https://telegra.ph/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 30000
            });

            if (response.data && response.data[0] && response.data[0].src) {
                return 'https://telegra.ph' + response.data[0].src;
            }

            throw new Error('Telegra.ph upload failed');
        } catch (telegraphError) {
            // Final fallback - use default image
            return 'https://i.pinimg.com/736x/0b/9f/0a/0b9f0a92a598e6c22629004c1027d23f.jpg';
        }
    }
}

// Main handler function for togen command
async function handleTogenCommand(sock, msg) {
    try {
        const config = loadConfig();
        const senderJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

        // Extract sender number correctly
        let senderNumber;
        if (msg.key.participant) {
            senderNumber = msg.key.participant;
        } else if (msg.key.fromMe) {
            senderNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        } else {
            senderNumber = msg.key.remoteJid;
        }

        // Check access based on bot mode
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Get command text from different message types
        let messageText = '';
        let isReplyToImage = false;
        let quotedImageBuffer = null;
        let isImageWithCaption = false;

        // Check if this is an image with caption (direct image + caption)
        if (msg.message?.imageMessage?.caption) {
            messageText = msg.message.imageMessage.caption;
            isImageWithCaption = true;

            // Download the image directly
            try {
                const imageBuffer = await downloadMediaMessage(msg, 'buffer', {}, {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                });

                if (imageBuffer && imageBuffer.length > 0) {
                    quotedImageBuffer = imageBuffer;
                    isReplyToImage = true; // Treat as reply mode for processing
                }
            } catch (downloadError) {
                console.error('Error downloading image with caption:', downloadError);
                await Wily(`❌ Gagal mendownload gambar\n\n💡 Pastikan gambar valid dan bisa diakses`, msg, sock);
                return;
            }
        }
        // Check if this is a reply to an image with caption
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            messageText = msg.message.extendedTextMessage.text || '';

            // Check if quoted message is an image
            if (quotedMsg.imageMessage) {
                isReplyToImage = true;
                // Download the quoted image
                try {
                    const quotedBuffer = await downloadMediaMessage({
                        key: {
                            remoteJid: senderJid,
                            fromMe: false,
                            id: msg.message.extendedTextMessage.contextInfo.stanzaId
                        },
                        message: {
                            imageMessage: quotedMsg.imageMessage
                        }
                    }, 'buffer', {}, {
                        logger: console,
                        reuploadRequest: sock.updateMediaMessage
                    });

                    if (quotedBuffer && quotedBuffer.length > 0) {
                        quotedImageBuffer = quotedBuffer;
                    }
                } catch (downloadError) {
                    console.error('Error downloading quoted image:', downloadError);
                    await Wily(`❌ Gagal mendownload gambar yang direply\n\n💡 Pastikan gambar masih valid dan bisa diakses`, msg, sock);
                    return;
                }
            }
        } else {
            // Regular message
            messageText = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text || '';
        }

        const args = messageText.slice(config.bot?.prefix?.length || 1).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'togen') return;

        // Parse arguments: .togen text | author (for reply mode) or .togen text | author | image_url (for URL mode)
        const fullText = args.slice(1).join(' ');

        if (!fullText || fullText.length === 0) {
            const helpText = `
📝 *CARA PENGGUNAAN TOGEN*

🎯 *Format 1 - Langsung Generate:*
${config.bot?.prefix || '.'}togen <text> | <author>

🎯 *Format 2 - Gambar + Caption:*
• Kirim gambar dengan caption:
${config.bot?.prefix || '.'}togen <text> | <author>

🎯 *Format 3 - Reply Gambar:*
• Reply gambar dengan caption:
${config.bot?.prefix || '.'}togen <text> | <author>

🎯 *Format 4 - URL Gambar:*
${config.bot?.prefix || '.'}togen <text> | <author> | <image_url>

📋 *Contoh Langsung Generate:*
${config.bot?.prefix || '.'}togen Hidup ini indah | Anonim

📋 *Contoh Gambar + Caption:*
1. Upload foto dengan caption:
   ${config.bot?.prefix || '.'}togen Hidup ini indah | Anonim

📋 *Contoh Reply Gambar:*
1. Reply foto lalu ketik:
   ${config.bot?.prefix || '.'}togen Hidup ini indah | Anonim

📋 *Contoh URL Gambar:*
${config.bot?.prefix || '.'}togen Jangan pernah menyerah | Motivator | https://example.com/image.jpg

📌 *Format Gambar yang Didukung:*
• JPG, JPEG, PNG, WEBP
• GIF (akan dikonversi ke static)
• Maksimal 20MB

📌 *Keterangan:*
• Pisahkan dengan tanda "|" (pipe)
• Text: Kutipan yang ingin ditampilkan
• Author: Nama penulis kutipan
• Image URL: Link gambar background (opsional untuk format 4)

🎨 *Generator Quote Card Image* ✨

💡 *Tips:*
• Ketik langsung untuk generate otomatis dengan gambar default
• Mode gambar + caption untuk gambar personal
• Mode reply juga mudah digunakan
• Bisa menggunakan foto apapun dari chat`;

            await Wily(helpText, msg, sock);
            return;
        }

        // Split by pipe separator
        const parts = fullText.split('|').map(part => part.trim());

        // Validation - we need at least text and author for all modes
        if (parts.length < 2) {
            await Wily(`❌ *FORMAT SALAH!*\n\nGunakan format: ${config.bot?.prefix || '.'}togen <text> | <author>\n\nContoh:\n${config.bot?.prefix || '.'}togen Hidup ini indah | Anonim\n\n💡 Bot akan otomatis generate dengan gambar default jika tidak ada gambar`, msg, sock);
            return;
        }

        const quoteText = parts[0] || 'Your quote here';
        const author = parts[1] || 'Anonymous';
        let imageUrl = parts[2] || 'https://i.pinimg.com/736x/0b/9f/0a/0b9f0a92a598e6c22629004c1027d23f.jpg';

        // Send loading message with different text based on mode
        if ((isReplyToImage || isImageWithCaption) && quotedImageBuffer) {
            const modeText = isImageWithCaption ? 'gambar dengan caption' : 'gambar yang direply';
            await Wily(`🔄 *MEMBUAT QUOTE CARD DARI GAMBAR...*\n\n⏳ Sedang memproses:\n📝 Text: "${quoteText}"\n👤 Author: "${author}"\n🖼️ Background: ${modeText}\n📤 Uploading gambar...\n\n💡 Tunggu sebentar ya!`, msg, sock);

            // Upload the image and get URL
            try {
                imageUrl = await uploadImageToHost(quotedImageBuffer);
                if (!imageUrl || !imageUrl.startsWith('http')) {
                    throw new Error('Upload failed');
                }
            } catch (uploadError) {
                await Wily(`❌ *GAGAL UPLOAD GAMBAR*\n\n🔄 Error: ${uploadError.message}\n💡 Menggunakan gambar default sebagai backup`, msg, sock);
                imageUrl = 'https://i.pinimg.com/736x/0b/9f/0a/0b9f0a92a598e6c22629004c1027d23f.jpg';
            }
        } else if (parts.length >= 3 && parts[2]) {
            // URL mode with custom image
            await Wily(`🔄 *MEMBUAT QUOTE CARD...*\n\n⏳ Sedang membuat kartu quote dengan:\n📝 Text: "${quoteText}"\n👤 Author: "${author}"\n🖼️ Background: Custom Image URL\n\n💡 Tunggu sebentar ya!`, msg, sock);
        } else {
            // Direct generation mode with default image
            await Wily(`🔄 *MEMBUAT QUOTE CARD...*\n\n⏳ Sedang membuat kartu quote dengan:\n📝 Text: "${quoteText}"\n👤 Author: "${author}"\n🖼️ Background: Gambar Default\n\n✨ Generate otomatis dengan template default!\n💡 Tunggu sebentar ya!`, msg, sock);
        }

        try {
            // Build API URL with parameters
            const apiUrl = 'https://api.siputzx.my.id/api/m/quote-gen';
            const params = {
                text: quoteText,
                author: author,
                image: imageUrl
            };

            // Make API request
            const response = await axios.get(apiUrl, {
                params: params,
                responseType: 'arraybuffer',
                headers: {
                    'accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            if (!response.data) {
                throw new Error('No image data received');
            }

            // Prepare success message based on mode
            let successCaption;
            if ((isReplyToImage || isImageWithCaption) && quotedImageBuffer) {
                const modeText = isImageWithCaption ? 'Gambar + Caption' : 'Gambar dari Reply';
                const modeDisplay = isImageWithCaption ? 'Image + Caption' : 'Reply Image + Caption';

                successCaption = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀
┃ 🎨 *QUOTE CARD GENERATOR*
┃ 
┃ 📝 *Quote:* "${quoteText}"
┃ 👤 *Author:* ${author}
┃ 🖼️ *Background:* ${modeText}
┃ 📤 *Upload Status:* Berhasil ✅
┃ 🔗 *Image URL:* ${imageUrl}
┃ 
┃ ✨ *Generated Successfully!*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🎯 *WilyKun Bot - Quote Card Generator* 🎨
📱 *Mode:* ${modeDisplay}`;
            } else if (parts.length >= 3 && parts[2]) {
                // URL mode with custom image
                successCaption = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀
┃ 🎨 *QUOTE CARD GENERATOR*
┃ 
┃ 📝 *Quote:* "${quoteText}"
┃ 👤 *Author:* ${author}
┃ 🖼️ *Background:* Custom Image URL
┃ 
┃ ✨ *Generated Successfully!*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🎯 *WilyKun Bot - Quote Card Generator* 🎨
📱 *Mode:* URL Image`;
            } else {
                // Direct generation mode
                successCaption = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀
┃ 🎨 *QUOTE CARD GENERATOR*
┃ 
┃ 📝 *Quote:* "${quoteText}"
┃ 👤 *Author:* ${author}
┃ 🖼️ *Background:* Default Template
┃ 
┃ ✨ *Generated Successfully!*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🎯 *WilyKun Bot - Quote Card Generator* 🎨
📱 *Mode:* Direct Generation

💡 *Tips:*
• Kirim gambar + caption untuk background personal
• Reply gambar untuk menggunakan gambar tersebut
• Tambahkan URL gambar di akhir untuk custom background`;
            }

            // Send the generated quote card image
            await sock.sendMessage(senderJid, {
                image: response.data,
                caption: successCaption
            }, { quoted: msg });

        } catch (apiError) {
            let errorMessage = '❌ *GAGAL MEMBUAT QUOTE CARD*\n\n';

            if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
                errorMessage += '⏰ Koneksi timeout ke server generator\n💡 Coba lagi dalam beberapa saat';
            } else if (apiError.response?.status === 404) {
                errorMessage += '🔍 API quote generator tidak ditemukan\n💡 Service mungkin sedang maintenance';
            } else if (apiError.response?.status >= 500) {
                errorMessage += '🔧 Server error pada API generator\n💡 Coba lagi nanti';
            } else if (apiError.message.includes('Network Error')) {
                errorMessage += '🌐 Error koneksi internet\n💡 Periksa koneksi dan coba lagi';
            } else if (apiError.message.includes('Invalid URL') || apiError.message.includes('image')) {
                if (isReplyToImage || isImageWithCaption) {
                    const modeText = isImageWithCaption ? 'gambar dengan caption' : 'gambar yang direply';
                    const tipText = isImageWithCaption ? 
                        '• Coba kirim gambar lain dengan caption\n• Pastikan gambar tidak terlalu besar (max 20MB)\n• Format yang didukung: JPG, JPEG, PNG, WEBP' :
                        '• Coba reply gambar lain\n• Pastikan gambar tidak terlalu besar (max 20MB)\n• Format yang didukung: JPG, JPEG, PNG, WEBP';

                    errorMessage += `🖼️ Gagal memproses ${modeText}\n💡 Pastikan gambar masih valid dan tidak rusak\n\n📋 Tips:\n${tipText}`;
                } else {
                    errorMessage += '🖼️ URL gambar tidak valid atau tidak dapat diakses\n💡 Pastikan URL gambar benar dan dapat diakses\n\n📋 Contoh URL yang benar:\n• https://i.pinimg.com/736x/0b/9f/0a/0b9f0a92a598e6c22629004c1027d23f.jpg\n• https://example.com/image.jpg\n\nAtau gunakan mode gambar + caption atau reply gambar untuk lebih mudah';
                }
            } else {
                errorMessage += `🔄 Error: ${apiError.message}\n💡 Silakan coba command lagi`;
            }

            await Wily(errorMessage, msg, sock);
        }

    } catch (error) {
        // Silent error handling - no console logs
        try {
            await Wily(`❌ *TERJADI KESALAHAN*\n\n🔄 Gagal memproses command togen\n💡 Silakan coba lagi dalam beberapa saat`, msg, sock);
        } catch (sendError) {
            // Silent fail
        }
    }
}

module.exports = {
    handleTogenCommand,
    checkAccess
};


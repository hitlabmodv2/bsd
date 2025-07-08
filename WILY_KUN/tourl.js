const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');
const { Wily } = require('../CODE_REPLAY/reply');

// Load config with fallback
function loadConfig() {
    try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            // Clear require cache for fresh config
            delete require.cache[require.resolve(configPath)];
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

// Check access based on bot mode
function checkAccess(senderJid, config, fromMe) {
    if (fromMe) return true; // Bot's own messages

    const mode = config?.bot?.mode || 'public';
    const owner = config?.bot?.owner || '';
    const botNumber = config?.bot?.botNumber || '';

    if (mode === 'self') {
        // Extract sender number
        const senderNumber = senderJid.includes('@') ? senderJid.split('@')[0] : senderJid;

        // Allow only owner and bot number
        return senderNumber === owner || senderNumber === botNumber;
    }

    return true; // Public mode allows everyone
}

async function uploadMedia(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);

    const { data } = await axios.post('https://cdn.vioo.my.id/upload', form, {
        headers: {
            ...form.getHeaders(),
            'Accept': 'application/json'
        }
    });

    return data;
}

async function handleTourlCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text to check for command
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        // Check if it's tourl command
        if (!messageText.startsWith(`${prefix}tourl`)) return;

        // Check access based on bot mode FIRST before processing
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            // In self mode, bot should not respond to unauthorized users
            return; // Silent exit, no response
        }

        let mediaMessage = null;
        let quotedMessage = null;

        // Check if this is a reply to a media message
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            quotedMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            if (quotedMessage.imageMessage || quotedMessage.videoMessage || quotedMessage.documentMessage || quotedMessage.audioMessage) {
                mediaMessage = quotedMessage;
            }
        }

        // Check if this is a media message with caption
        if (!mediaMessage) {
            if (msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.documentMessage || msg.message?.audioMessage) {
                mediaMessage = msg.message;
            }
        }

        if (!mediaMessage) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ *FORMAT SALAH!*\n\n📝 *Cara penggunaan:*\n• Reply media dengan `.tourl`\n• Kirim media dengan caption `.tourl`\n\n📋 *Media yang didukung:*\n• Gambar (JPG, PNG, GIF)\n• Video (MP4, AVI, MKV)\n• Audio (MP3, WAV, OGG)\n• Dokumen (PDF, ZIP, RAR)\n\n⚠️ *Maksimal ukuran: 50MB*'
            }, {
                quoted: msg
            });
            return;
        }

        // Send loading message
        await sock.sendMessage(msg.key.remoteJid, {
            text: '⏳ *UPLOADING MEDIA...*\n\n📤 Sedang mengupload media ke server...\n⏰ Mohon tunggu sebentar...'
        }, {
            quoted: msg
        });

        // Download media
        let buffer;
        try {
            buffer = await downloadMediaMessage(
                { message: { [Object.keys(mediaMessage)[0]]: mediaMessage[Object.keys(mediaMessage)[0]] } },
                'buffer',
                {}
            );
        } catch (error) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ *GAGAL DOWNLOAD MEDIA!*\n\nTerjadi error saat mendownload media. Silakan coba lagi.'
            }, {
                quoted: msg
            });
            return;
        }

        // Check file size (50MB limit)
        if (buffer.length > 50 * 1024 * 1024) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ *UKURAN FILE TERLALU BESAR!*\n\n📊 *Informasi:*\n• Ukuran file: ' + (buffer.length / 1024 / 1024).toFixed(2) + 'MB\n• Maksimal: 50MB\n\n💡 *Solusi:*\n• Kompres file terlebih dahulu\n• Gunakan file yang lebih kecil'
            }, {
                quoted: msg
            });
            return;
        }

        // Get file extension
        let ext = 'bin';
        let mimeType = '';

        if (mediaMessage.imageMessage) {
            mimeType = mediaMessage.imageMessage.mimetype || 'image/jpeg';
            ext = mimeType.split('/')[1] || 'jpg';
        } else if (mediaMessage.videoMessage) {
            mimeType = mediaMessage.videoMessage.mimetype || 'video/mp4';
            ext = mimeType.split('/')[1] || 'mp4';
        } else if (mediaMessage.audioMessage) {
            mimeType = mediaMessage.audioMessage.mimetype || 'audio/mp3';
            ext = mimeType.split('/')[1] || 'mp3';
        } else if (mediaMessage.documentMessage) {
            mimeType = mediaMessage.documentMessage.mimetype || 'application/octet-stream';
            ext = mediaMessage.documentMessage.fileName?.split('.').pop() || 'bin';
        }

        const filename = `WilyKun_${Date.now()}.${ext}`;

        try {
            const result = await uploadMedia(buffer, filename);

            if (result && result.data && result.data.url) {
                const successText = `✅ *UPLOAD BERHASIL!*

📤 *Media telah diupload ke server*

🔗 *URL Media:*
${result.data.url}

📊 *Detail Upload:*
├─ 📁 Nama File: ${filename}
├─ 📋 Tipe: ${mimeType}
├─ 💾 Ukuran: ${(buffer.length / 1024 / 1024).toFixed(2)}MB
└─ ⏰ Upload: ${new Date().toLocaleString('id-ID')}

💡 *Cara Penggunaan:*
• Copy URL di atas
• Share ke teman atau simpan
• URL permanent dan bisa diakses kapan saja

🤖 *ToURL by WilyKun Bot*`;

                await sock.sendMessage(msg.key.remoteJid, {
                    text: successText
                }, {
                    quoted: msg
                });
            } else {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ *UPLOAD GAGAL!*\n\nServer tidak memberikan URL yang valid. Silakan coba lagi.'
                }, {
                    quoted: msg
                });
            }
        } catch (uploadError) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ *UPLOAD GAGAL!*\n\n🔍 *Error:* ${uploadError.message}\n\n💡 *Silakan coba lagi dalam beberapa saat*`
            }, {
                quoted: msg
            });
        }

    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ *TERJADI ERROR!*\n\nSilakan coba lagi atau hubungi developer.'
        }, {
            quoted: msg
        });
    }
}

module.exports = {
    handleTourlCommand
};
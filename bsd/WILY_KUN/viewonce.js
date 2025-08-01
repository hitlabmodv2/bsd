const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { Wily } = require('../CODE_REPLAY/reply');

// Fungsi untuk load config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        autoFeatures: {}
    };
}

// Fungsi untuk ekstrak media dari berbagai struktur pesan
function extractMediaFromMessage(quotedMsg) {
    let targetMessage = quotedMsg;

    // Check if it's wrapped in ephemeral message
    if (quotedMsg.ephemeralMessage?.message) {
        targetMessage = quotedMsg.ephemeralMessage.message;
    }

    // Check if it's a viewOnceMessage wrapper
    if (quotedMsg.viewOnceMessage?.message) {
        targetMessage = quotedMsg.viewOnceMessage.message;
    }

    // Check all possible media types
    const mediaTypes = [
        'imageMessage',
        'videoMessage', 
        'audioMessage',
        'documentMessage',
        'stickerMessage'
    ];

    for (const mediaType of mediaTypes) {
        if (targetMessage[mediaType]) {
            return {
                mediaMessage: targetMessage[mediaType],
                mediaType: mediaType,
                isViewOnce: targetMessage[mediaType].viewOnce === true || 
                           quotedMsg.viewOnceMessage || 
                           quotedMsg.ephemeralMessage?.message?.[mediaType]?.viewOnce === true
            };
        }
    }

    return null;
}

// Fungsi untuk cek apakah pesan adalah view once
function isViewOnceMessage(quotedMsg) {
    // Direct view once check
    if (quotedMsg.viewOnceMessage) return true;

    // Check ephemeral wrapper
    if (quotedMsg.ephemeralMessage?.message) {
        const ephemeralContent = quotedMsg.ephemeralMessage.message;
        if (ephemeralContent.viewOnceMessage) return true;

        // Check media properties in ephemeral
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
        for (const type of mediaTypes) {
            if (ephemeralContent[type]?.viewOnce) return true;
        }
    }

    // Direct media view once check
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
    for (const type of mediaTypes) {
        if (quotedMsg[type]?.viewOnce) return true;
    }

    return false;
}

// Handler utama untuk fitur .rvo
async function viewOnceHandler(sock, msg) {
    try {
        const messageText = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || '';

        const config = loadConfig();
        const prefix = config.bot.prefix || '.';

        // Cek apakah command adalah .rvo (HARUS EXACT MATCH, BUKAN RVOV2)
        const cleanCommand = messageText.toLowerCase().trim();
        if (!cleanCommand || (cleanCommand !== `${prefix}rvo` && !cleanCommand.startsWith(`${prefix}rvo `))) {
            return false;
        }

        // Pastikan bukan command rvov2
        if (cleanCommand.startsWith(`${prefix}rvov2`)) {
            return false;
        }

        // Prevent duplicate processing
        if (msg._viewOnceProcessed) {
            return true;
        }
        msg._viewOnceProcessed = true;

        // VALIDASI AKSES BERDASARKAN MODE BOT
        const botNumber = sock.user?.id?.split(':')[0];
        const senderJid = msg.key.remoteJid;

        // Ekstrak nomor pengirim yang tepat
        let actualSenderNumber;
        if (msg.key.participant) {
            // Jika ada participant (pesan grup), gunakan itu
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            // Jika pesan dari bot sendiri, gunakan bot number
            actualSenderNumber = botNumber;
        } else {
            // Untuk private chat biasa
            actualSenderNumber = senderJid?.split('@')[0];
        }

        // Validasi akses berdasarkan mode bot
        if (config.bot?.mode === 'self') {
            const isBotNumber = actualSenderNumber === botNumber;
            const isOwnerNumber = actualSenderNumber === config.bot?.owner;
            const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
            const isFromMe = msg.key.fromMe === true;

            // Untuk mode self: HANYA owner/bot yang bisa akses
            const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig;

            if (!isAuthorizedUser) {
                // Bot diam saja, tidak ada response untuk user yang tidak authorized
                return true; // Return true agar tidak diproses lebih lanjut
            }
        }

        // Cek apakah ada quoted message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMsg) {
            await Wily(`⚠️ *Cara Penggunaan ViewOnce*

📋 *Command:* ${prefix}rvo
🔄 *Action:* Reply pesan view once yang ingin dibuka

✅ *Format yang Didukung:*
• 🖼️ Gambar View Once
• 🎥 Video View Once  
• 🎵 Audio View Once
• 📄 Dokumen View Once
• 🏷️ Sticker View Once

💡 *Contoh Penggunaan:*
1. Reply pesan view once
2. Ketik: ${prefix}rvo
3. Media akan ditampilkan ulang di chat

🤖 Mode Bot: ${config.bot.mode.toUpperCase()} ✅`, msg, sock);
            return true;
        }

        // Enhanced media detection
        const mediaInfo = extractMediaFromMessage(quotedMsg);
        const isViewOnce = isViewOnceMessage(quotedMsg);

        // Check if we found media
        if (!mediaInfo) {
            const allKeys = Object.keys(quotedMsg);
            const ephemeralKeys = quotedMsg.ephemeralMessage?.message ? Object.keys(quotedMsg.ephemeralMessage.message) : [];
            const viewOnceKeys = quotedMsg.viewOnceMessage?.message ? Object.keys(quotedMsg.viewOnceMessage.message) : [];

            await Wily(`╭━━━『 *❌ MEDIA ERROR* 』━━━❀
┃ 
┃ 🔍 *Detail Analisis Media*
┃ ⌬ Status: Media tidak terdeteksi
┃ ⌬ View Once: ${isViewOnce ? 'Ya' : 'Tidak'}
┃ ⌬ Raw Keys: ${allKeys.join(', ') || 'None'}
┃ ⌬ Ephemeral: ${ephemeralKeys.join(', ') || 'None'}
┃ ⌬ ViewOnce: ${viewOnceKeys.join(', ') || 'None'}
┃ 
┃ ✅ *Format Yang Didukung:*
┃ ⌬ 🖼️ Gambar View Once
┃ ⌬ 🎥 Video View Once  
┃ ⌬ 🎵 Audio View Once
┃ ⌬ 📄 Dokumen View Once
┃ ⌬ 🏷️ Sticker View Once
┃ 
┃ 💡 *Tips Troubleshooting:*
┃ ⌬ Pastikan reply media view once
┃ ⌬ Jangan reply pesan teks biasa
┃ ⌬ Media harus berstatus view once
┃ ⌬ Coba kirim ulang media view once
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_❌ Media tidak dapat diproses - pastikan ini adalah media view once!_`, msg, sock);
            return true;
        }

        // Waktu Jakarta yang akurat
        const jakartaTime = new Date().toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const formatCaption = (type, originalCaption = '') => {
            return `╭━━━『 *📱 VIEW ONCE MEDIA* 』━━━┄⊱
┃
┃ *🎯 Type:* ${type}
┃ *📅 Waktu:* ${jakartaTime} WIB
┃ *💬 Caption:* ${originalCaption || 'No caption'}
┃ *🔒 Mode:* Same Chat
┃ *📱 Sender:* ${msg.pushName || 'Unknown'}
┃ *✅ Status:* Successfully Opened
┃
┃ *✨ ViewOnce Features:*
┃ ⌬ Preservasi media permanen
┃ ⌬ Anti delete protection
┃ ⌬ Format caption enhanced
┃ ⌬ Support semua media type
┃ ⌬ Single response system
┃
╰━━━━━━━━━━━━━━━━━┄⊱

_📱 ViewOnce media telah berhasil dibuka dan ditampilkan di chat ini!_
_🔐 Premium ViewOnce Feature - WilyKun Bot_`;
        };

        // Create message key for download
        const messageKey = {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || msg.key.id,
            participant: msg.key.participant || msg.key.remoteJid
        };

        // Create proper message structure for download
        let downloadMessage = {};
        downloadMessage[mediaInfo.mediaType] = mediaInfo.mediaMessage;

        try {
            // Download media
            const buffer = await downloadMediaMessage(
                {
                    message: downloadMessage,
                    key: messageKey
                },
                "buffer",
                {},
                { logger: pino({ level: "silent" }) }
            );

            const caption = mediaInfo.mediaMessage.caption || '';
            let mediaTypeDisplay = '';
            let sendOptions = {};

            // Handle different media types
            switch (mediaInfo.mediaType) {
                case 'imageMessage':
                    mediaTypeDisplay = '🖼️ Image';
                    sendOptions = {
                        image: buffer,
                        caption: formatCaption(mediaTypeDisplay, caption)
                    };
                    break;

                case 'videoMessage':
                    mediaTypeDisplay = '🎥 Video';
                    sendOptions = {
                        video: buffer,
                        caption: formatCaption(mediaTypeDisplay, caption)
                    };
                    break;

                case 'audioMessage':
                    mediaTypeDisplay = '🎵 Audio';
                    sendOptions = {
                        audio: buffer,
                        caption: formatCaption(mediaTypeDisplay, caption),
                        mimetype: mediaInfo.mediaMessage.mimetype || 'audio/ogg; codecs=opus',
                        ptt: mediaInfo.mediaMessage.ptt || false
                    };
                    break;

                case 'documentMessage':
                    mediaTypeDisplay = '📄 Document';
                    sendOptions = {
                        document: buffer,
                        caption: formatCaption(mediaTypeDisplay, caption),
                        mimetype: mediaInfo.mediaMessage.mimetype || 'application/octet-stream',
                        fileName: mediaInfo.mediaMessage.fileName || 'ViewOnce_Document'
                    };
                    break;

                case 'stickerMessage':
                    mediaTypeDisplay = '🏷️ Sticker';
                    sendOptions = {
                        sticker: buffer
                    };
                    break;

                default:
                    throw new Error(`Unsupported media type: ${mediaInfo.mediaType}`);
            }

            // Send media to same chat with quoted message
            await sock.sendMessage(msg.key.remoteJid, sendOptions, { quoted: msg });

        } catch (downloadError) {
            await Wily(`❌ *GAGAL MENGUNDUH MEDIA*

*Detail Error:*
${downloadError.message}

*Kemungkinan Penyebab:*
• Media sudah expired
• Koneksi tidak stabil  
• Format media tidak didukung
• Server WhatsApp bermasalah

*Tips Solusi:*
• Pastikan media masih valid
• Coba reply ulang media view once
• Restart bot jika error berlanjut
• Hubungi admin jika masalah persisten

_🔧 ViewOnce Error Handler - WilyKun Bot_`, msg, sock);
        }

        return true;

    } catch (error) {
        await Wily(`❌ *SISTEM ERROR*

*Detail Error:*
${error.message}

*Solusi:*
• Restart bot jika error berlanjut
• Hubungi admin jika masalah persisten
• Coba gunakan command lain terlebih dahulu

_⚠️ System Error Handler - WilyKun Bot_`, msg, sock);
        return true;
    }
}

module.exports = { 
    viewOnceHandler,
    extractMediaFromMessage,
    isViewOnceMessage
};
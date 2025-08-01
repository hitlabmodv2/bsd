const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../../CODE_REPLAY/reply');

// Helper function to load config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return { bot: { prefix: '.', mode: 'public' } };
    } catch (error) {
        return { bot: { prefix: '.', mode: 'public' } };
    }
}

// Function to check access based on bot mode
function checkAccess(senderJid, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    if (botMode === 'public') {
        return true;
    }

    const botNumber = config?.bot?.botNumber;
    const ownerNumber = config?.bot?.owner;

    const cleanSender = senderJid?.split('@')[0]?.split(':')[0];
    const cleanBot = botNumber?.split('@')[0]?.split(':')[0];
    const cleanOwner = ownerNumber?.split('@')[0]?.split(':')[0];

    const isBotNumber = cleanSender === cleanBot;
    const isOwnerNumber = cleanSender === cleanOwner;
    const isFromMe = fromMe === true;

    return isFromMe || isBotNumber || isOwnerNumber;
}

// Function to validate YouTube URL
function isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)/;
    return youtubeRegex.test(url);
}

// Function to send quoted message
async function sendQuotedMessage(sock, chatId, content, quotedMessage) {
    try {
        await sock.sendMessage(chatId, content, { quoted: quotedMessage });
    } catch (error) {
        await sock.sendMessage(chatId, content);
    }
}

// Handler for .ytmp3 command
async function handleYtmp3Command(sock, msg) {
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

        if (command !== 'ytmp3') return;

        // Check access based on bot mode
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Check if URL provided
        if (args.length < 2) {
            const helpText = `
╭━━━『 🎵 YOUTUBE MP3 DOWNLOADER 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ ${prefix}ytmp3 <link youtube>
┃ 
┃ 🎯 *Contoh penggunaan:*
┃ • ${prefix}ytmp3 https://www.youtube.com/watch?v=dQw4w9WgXcQ
┃ • ${prefix}ytmp3 https://youtu.be/dQw4w9WgXcQ
┃ 
┃ 📋 *Fitur:*
┃ • Download audio MP3 dari YouTube
┃ • Kualitas audio 320kbps
┃ • Support semua link YouTube
┃ • Auto detect metadata
┃ • Thumbnail cover included
┃ 
┃ 🎵 *Format output:* MP3 Audio (320kbps)
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim link YouTube untuk download audio MP3!_`;

            await sendQuotedMessage(sock, msg.key.remoteJid, { text: helpText }, msg);
            return;
        }

        // Get YouTube URL
        const youtubeUrl = args.slice(1).join(' ');

        // Validate YouTube URL
        if (!isValidYouTubeUrl(youtubeUrl)) {
            await sendQuotedMessage(sock, msg.key.remoteJid, { 
                text: "❌ Link YouTube tidak valid! Pastikan link berasal dari YouTube." 
            }, msg);
            return;
        }

        // Send processing message
        const loadingText = `
╭━━━『 🔍 YOUTUBE MP3 PROCESSOR 』━━━❀
┃ 
┃ ⏳ *Sedang memproses...*
┃ 
┃ 🎯 *URL:* ${youtubeUrl}
┃ 🔍 *Status:* Analyzing...
┃ 🌐 *API:* NekoRinn YouTube Downloader
┃ 🎵 *Format:* MP3 Audio (320kbps)
┃ 
┃ ⚡ *Mohon tunggu sebentar...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎵 Sedang mengunduh audio dari YouTube..._`;

        await sendQuotedMessage(sock, msg.key.remoteJid, { text: loadingText }, msg);

        try {
            // Call NekoRinn API for MP3
            const response = await axios.get(`https://api.nekorinn.my.id/downloader/youtube`, {
                params: {
                    url: youtubeUrl,
                    format: '320',
                    type: 'audio'
                },
                timeout: 30000
            });

            if (!response.data || !response.data.status) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Gagal mengunduh audio. API tidak merespons dengan benar!" 
                }, msg);
                return;
            }

            const result = response.data.result;

            if (!result || !result.downloadUrl) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Audio tidak ditemukan atau format response tidak valid!" 
                }, msg);
                return;
            }

            // Send found message with info
            const foundText = `
╭━━━『 ✅ AUDIO DITEMUKAN 』━━━❀
┃ 
┃ 🎵 *Judul:* ${result.title}
┃ 🎵 *Format:* MP3 Audio
┃ 📊 *Kualitas:* ${result.format}kbps
┃ 🔗 *Source:* YouTube
┃ 📄 *URL:* ${youtubeUrl}
┃ 
┃ 📥 *Status:* Sedang mengunduh...
┃ ⏳ *Progress:* Memproses dari server...
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Mohon tunggu, sedang mengunduh video..._`;

            await sendQuotedMessage(sock, msg.key.remoteJid, { text: foundText }, msg);

            // Download the audio file
            const audioResponse = await axios.get(result.downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            if (!audioResponse.data) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Gagal mengunduh file audio dari server!" 
                }, msg);
                return;
            }

            const audioBuffer = Buffer.from(audioResponse.data);

            // Send the audio file with complete info in caption
            await sock.sendMessage(msg.key.remoteJid, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${result.title}.mp3`,
                caption: `╭━━━『 ✅ AUDIO BERHASIL DIKIRIM 』━━━❀
┃ 
┃ 🎵 *Judul:* ${result.title}
┃ 📊 *Kualitas:* ${result.format}kbps
┃ 💾 *Size:* ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB
┃ 🎵 *Format:* MP3 Audio
┃ 🔗 *URL:* ${youtubeUrl}
┃ 
┃ 💡 *Info:*
┃ • Audio siap diputar di semua pemutar musik
┃ • Kualitas ${result.format}kbps untuk pengalaman terbaik
┃ • File sudah dalam format MP3 standard
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎶 Selamat menikmati audio pilihan Anda!_`,
                contextInfo: {
                    externalAdReply: {
                        title: result.title,
                        body: `MP3 Audio • ${result.format}kbps • ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`,
                        thumbnailUrl: result.cover,
                        mediaType: 1,
                        mediaUrl: youtubeUrl,
                        sourceUrl: youtubeUrl
                    }
                }
            }, { quoted: msg });

        } catch (apiError) {
            if (apiError.code === 'ECONNABORTED') {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Timeout! Server terlalu lama merespons. Silakan coba lagi." 
                }, msg);
            } else if (apiError.response?.status === 404) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Video YouTube tidak ditemukan! Pastikan link benar dan video dapat diakses." 
                }, msg);
            } else if (apiError.response?.status >= 500) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Server API sedang bermasalah. Silakan coba lagi nanti." 
                }, msg);
            } else {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Terjadi kesalahan saat mengakses API YouTube!" 
                }, msg);
            }
        }

    } catch (error) {
        // Silent error handling
    }
}

// Handler for .ytmp4 command
async function handleYtmp4Command(sock, msg) {
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

        if (command !== 'ytmp4') return;

        // Check access based on bot mode
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Check if URL provided
        if (args.length < 2) {
            const helpText = `
╭━━━『 🎬 YOUTUBE MP4 DOWNLOADER 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ ${prefix}ytmp4 <link youtube>
┃ 
┃ 🎯 *Contoh penggunaan:*
┃ • ${prefix}ytmp4 https://www.youtube.com/watch?v=dQw4w9WgXcQ
┃ • ${prefix}ytmp4 https://youtu.be/dQw4w9WgXcQ
┃ 
┃ 📋 *Fitur:*
┃ • Download video MP4 dari YouTube
┃ • Kualitas video HD/SD otomatis
┃ • Support semua link YouTube
┃ • Auto detect metadata
┃ • Thumbnail cover included
┃ 
┃ 🎬 *Format output:* MP4 Video
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim link YouTube untuk download video MP4!_`;

            await sendQuotedMessage(sock, msg.key.remoteJid, { text: helpText }, msg);
            return;
        }

        // Get YouTube URL
        const youtubeUrl = args.slice(1).join(' ');

        // Validate YouTube URL
        if (!isValidYouTubeUrl(youtubeUrl)) {
            await sendQuotedMessage(sock, msg.key.remoteJid, { 
                text: "❌ Link YouTube tidak valid! Pastikan link berasal dari YouTube." 
            }, msg);
            return;
        }

        // Send processing message
        const loadingText = `
╭━━━『 🔍 YOUTUBE MP4 PROCESSOR 』━━━❀
┃ 
┃ ⏳ *Sedang memproses...*
┃ 
┃ 🎯 *URL:* ${youtubeUrl}
┃ 🔍 *Status:* Analyzing...
┃ 🌐 *API:* NekoRinn YouTube Downloader
┃ 🎬 *Format:* MP4 Video
┃ 
┃ ⚡ *Mohon tunggu sebentar...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎬 Sedang mengunduh video dari YouTube..._`;

        await sendQuotedMessage(sock, msg.key.remoteJid, { text: loadingText }, msg);

        try {
            // Call NekoRinn API for MP4
            const response = await axios.get(`https://api.nekorinn.my.id/downloader/youtube`, {
                params: {
                    url: youtubeUrl,
                    format: '720',
                    type: 'video'
                },
                timeout: 30000
            });

            if (!response.data || !response.data.status) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Gagal mengunduh video. API tidak merespons dengan benar!" 
                }, msg);
                return;
            }

            const result = response.data.result;

            if (!result || !result.downloadUrl) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Video tidak ditemukan atau format response tidak valid!" 
                }, msg);
                return;
            }

            // Send found message with info
            const foundText = `
╭━━━『 ✅ VIDEO DITEMUKAN 』━━━❀
┃ 
┃ 🎬 *Judul:* ${result.title}
┃ 📹 *Format:* MP4 Video
┃ 📊 *Kualitas:* ${result.format}p
┃ 🔗 *Source:* YouTube
┃ 📄 *URL:* ${youtubeUrl}
┃ 
┃ 📥 *Status:* Sedang mengunduh...
┃ ⏳ *Progress:* Memproses dari server...
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Mohon tunggu, sedang mengunduh video..._`;

            await sendQuotedMessage(sock, msg.key.remoteJid, { text: foundText }, msg);

            // Download the video file
            const videoResponse = await axios.get(result.downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000 // 2 minutes for video
            });

            if (!videoResponse.data) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Gagal mengunduh file video dari server!" 
                }, msg);
                return;
            }

            const videoBuffer = Buffer.from(videoResponse.data);

            // Send the video file with complete info in caption
            await sock.sendMessage(msg.key.remoteJid, {
                video: videoBuffer,
                mimetype: 'video/mp4',
                fileName: `${result.title}.mp4`,
                caption: `╭━━━『 ✅ VIDEO BERHASIL DIKIRIM 』━━━❀
┃ 
┃ 🎬 *Judul:* ${result.title}
┃ 📊 *Kualitas:* ${result.format}p
┃ 💾 *Size:* ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB
┃ 🎬 *Format:* MP4 Video
┃ 🔗 *URL:* ${youtubeUrl}
┃ 
┃ 💡 *Info:*
┃ • Video siap diputar di semua pemutar
┃ • Kualitas ${result.format}p untuk pengalaman terbaik
┃ • File sudah dalam format MP4 standard
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎬 Selamat menikmati video pilihan Anda!_`,
                contextInfo: {
                    externalAdReply: {
                        title: result.title,
                        body: `MP4 Video • ${result.format}p • ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`,
                        thumbnailUrl: result.cover,
                        mediaType: 1,
                        mediaUrl: youtubeUrl,
                        sourceUrl: youtubeUrl
                    }
                }
            }, { quoted: msg });

        } catch (apiError) {
            if (apiError.code === 'ECONNABORTED') {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Timeout! Server terlalu lama merespons. Silakan coba lagi." 
                }, msg);
            } else if (apiError.response?.status === 404) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Video YouTube tidak ditemukan! Pastikan link benar dan video dapat diakses." 
                }, msg);
            } else if (apiError.response?.status >= 500) {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Server API sedang bermasalah. Silakan coba lagi nanti." 
                }, msg);
            } else {
                await sendQuotedMessage(sock, msg.key.remoteJid, { 
                    text: "❌ Terjadi kesalahan saat mengakses API YouTube!" 
                }, msg);
            }
        }

    } catch (error) {
        // Silent error handling
    }
}

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

module.exports = { 
    handleYtmp3Command,
    handleYtmp4Command 
};
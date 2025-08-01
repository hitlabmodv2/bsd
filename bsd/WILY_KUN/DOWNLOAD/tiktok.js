const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../../CODE_REPLAY/reply');

// Fungsi untuk memuat config
function loadConfig() {
    try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return getDefaultConfig();
    } catch (error) {
        return getDefaultConfig();
    }
}

function getDefaultConfig() {
    return {
        bot: {
            mode: "public",
            prefix: "."
        }
    };
}

// Fungsi untuk mengecek akses berdasarkan mode bot
function checkAccess(msg, sock, config) {
    if (config.bot?.mode === 'self') {
        const botNumber = sock.user?.id?.split(':')[0];
        const actualSenderNumber = msg.key.participant ? 
            msg.key.participant.split('@')[0] : 
            msg.key.remoteJid?.split('@')[0];

        const isFromMe = msg.key.fromMe === true;
        const isBotNumber = actualSenderNumber === botNumber;
        const isOwnerNumber = actualSenderNumber === config.bot?.owner;
        const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
        const isHardcodedBot = actualSenderNumber === '6289681008411';

        return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;
    }

    return true; // Mode public, semua bisa akses
}

// Fungsi untuk download TikTok
async function downloadTikTok(url) {
    try {
        const apiUrl = `https://api.siputzx.my.id/api/tiktok/v2?url=${encodeURIComponent(url)}`;

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        if (response.data && response.data.success === true) {
            return {
                success: true,
                data: response.data.data
            };
        } else {
            return {
                success: false,
                error: 'Gagal mengambil data dari API'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Terjadi kesalahan saat mengunduh'
        };
    }
}

// Set untuk tracking request yang sedang diproses
const processingRequests = new Set();

// Handler untuk command TikTok download
async function handleTikTokCommand(sock, msg) {
    try {
        const config = loadConfig();

        // Cek akses berdasarkan mode bot
        if (!checkAccess(msg, sock, config)) {
            return; // Bot tidak merespons jika mode self dan bukan user yang diizinkan
        }

        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        const args = messageText.trim().split(' ');

        if (args.length < 2) {
            const helpText = `
❌ *FORMAT SALAH!*

📝 *Cara penggunaan:*
${config.bot.prefix}tt https://vt.tiktok.com/xxxxx/
${config.bot.prefix}tiktok https://www.tiktok.com/@user/video/xxxxx

📋 *Dukungan:*
• TikTok Video (Normal & Slide)
• TikTok Audio/Music
• Video HD & SD Quality
• Tanpa Watermark

💡 *Contoh:*
${config.bot.prefix}tt https://vt.tiktok.com/ZSjXNEnbC/
${config.bot.prefix}tiktok https://www.tiktok.com/@username/video/7435708060544290104

🔗 Pastikan link TikTok valid dan dapat diakses!`;

            await Wily(helpText, msg, sock);
            return;
        }

        const tiktokUrl = args[1];

        // Validasi URL TikTok
        const tiktokRegex = /^https?:\/\/(www\.)?(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\//;

        if (!tiktokRegex.test(tiktokUrl)) {
            const errorText = `
❌ *URL TIDAK VALID!*

🔗 *Format URL yang benar:*
• https://vt.tiktok.com/xxxxx/
• https://www.tiktok.com/@user/video/xxxxx
• https://vm.tiktok.com/xxxxx/

💡 *Tips:*
• Salin link langsung dari TikTok
• Pastikan link dapat dibuka di browser
• Jangan gunakan link yang sudah dipendekkan selain dari TikTok

📱 Silakan coba lagi dengan URL yang valid!`;

            await Wily(errorText, msg, sock);
            return;
        }

        // Buat unique key untuk request tracking
        const requestKey = `${msg.key.remoteJid}-${tiktokUrl}`;

        // Cek apakah request sedang diproses
        if (processingRequests.has(requestKey)) {
            return; // Skip jika request yang sama sedang diproses
        }

        // Tambahkan ke processing set
        processingRequests.add(requestKey);

        // Auto cleanup setelah 2 menit
        setTimeout(() => {
            processingRequests.delete(requestKey);
        }, 120000);

        // Kirim pesan loading
        const loadingText = `
⏳ *MENGUNDUH TIKTOK*

🔄 *Status:* Sedang memproses...
🔗 *URL:* ${tiktokUrl}
📱 *Platform:* TikTok
⚡ *API:* SiputZX Downloader

⏱️ Mohon tunggu sebentar...`;

        await Wily(loadingText, msg, sock);

        // Download TikTok content
        const result = await downloadTikTok(tiktokUrl);

        if (!result.success) {
            const errorText = `
❌ *GAGAL MENGUNDUH!*

🔥 *Error:* ${result.error}

🔧 *Solusi:*
• Periksa kembali URL TikTok
• Pastikan konten masih tersedia
• Coba gunakan URL yang berbeda
• Pastikan konten tidak private

💡 *Tips:*
• Gunakan URL langsung dari TikTok
• Jangan gunakan link dari screenshot
• Pastikan video tidak di-private

🔄 Silakan coba lagi dengan URL yang valid!`;

            await Wily(errorText, msg, sock);
            processingRequests.delete(requestKey);
            return;
        }

        const data = result.data;
        const metadata = data.metadata;
        const download = data.download;

        // Kirim informasi TikTok
        const infoText = `
✅ *TIKTOK DOWNLOAD BERHASIL!*

📊 *STATISTIK:*
❤️ *Likes:* ${metadata.stats.likeCount.toLocaleString()}
👁️ *Views:* ${metadata.stats.playCount.toLocaleString()}
💬 *Comments:* ${metadata.stats.commentCount.toLocaleString()}
🔄 *Shares:* ${metadata.stats.shareCount.toLocaleString()}

📍 *Lokasi:* ${metadata.locationCreated || 'Tidak diketahui'}
📝 *Deskripsi:* ${metadata.description || metadata.title || 'Tidak ada deskripsi'}

⏳ Sedang mengirim video...`;

        await Wily(infoText, msg, sock);

        // Download dan kirim video
        if (download.video && download.video.length > 0) {
            // Ambil video berkualitas terbaik (biasanya index pertama HD)
            const videoUrl = download.video[0];

            try {
                // Download video dari URL
                const videoResponse = await axios.get(videoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.tiktok.com/'
                    }
                });

                const videoBuffer = Buffer.from(videoResponse.data);

                // Caption untuk video
                const videoCaption = `📱 *TikTok Download*

❤️ ${metadata.stats.likeCount.toLocaleString()} likes • 👁️ ${metadata.stats.playCount.toLocaleString()} views
💬 ${metadata.stats.commentCount.toLocaleString()} comments • 🔄 ${metadata.stats.shareCount.toLocaleString()} shares

📝 ${metadata.description || metadata.title || 'Video TikTok'}

📥 Downloaded by WilyKun Bot`;

                // Kirim video
                await sock.sendMessage(msg.key.remoteJid, {
                    video: videoBuffer,
                    caption: videoCaption,
                    mimetype: 'video/mp4'
                }, { quoted: msg });

                // Jika ada audio, tawarkan untuk download
                if (download.audio) {
                    const audioOfferText = `
🎵 *AUDIO TERSEDIA*

🔗 Audio dari video ini tersedia untuk didownload
💿 Format: MP3
🎧 Kualitas: High

💡 Ketik *${config.bot.prefix}ttaudio [URL]* untuk download audio saja`;

                    await Wily(audioOfferText, msg, sock);
                }

            } catch (videoError) {
                const videoErrorText = `
❌ *GAGAL MENGIRIM VIDEO*

🔥 *Error:* ${videoError.message}

🔧 *Kemungkinan Penyebab:*
• File video terlalu besar untuk WhatsApp
• Koneksi internet tidak stabil
• Server TikTok sedang bermasalah

💡 *Solusi:*
• Coba download ulang
• Periksa koneksi internet
• Gunakan URL yang berbeda`;

                await Wily(videoErrorText, msg, sock);
            }

        } else {
            const noVideoText = `
⚠️ *TIDAK ADA VIDEO*

❌ *Error:* Tidak ditemukan video untuk diunduh

🔧 *Kemungkinan Penyebab:*
• Video sudah dihapus
• Akun di-private
• Link sudah expired
• Video tidak dapat diakses

💡 *Solusi:*
• Pastikan video masih tersedia
• Gunakan akun yang bisa akses video
• Coba URL yang berbeda`;

            await Wily(noVideoText, msg, sock);
        }

        // Cleanup request tracking
        processingRequests.delete(requestKey);

    } catch (error) {
        const generalErrorText = `
❌ *SISTEM ERROR!*

🔥 *Error:* Terjadi kesalahan sistem

🔧 *Detail:*
• Error pada proses download
• Kemungkinan server overload
• Atau masalah jaringan

💡 *Solusi:*
• Tunggu beberapa menit lalu coba lagi
• Pastikan bot dalam kondisi baik
• Hubungi admin jika masalah berlanjut

🤖 Bot akan kembali normal setelah restart otomatis`;

        try {
            await Wily(generalErrorText, msg, sock);
        } catch (replyError) {
            // Silent error jika gagal reply
        }

        // Cleanup di error
        const requestKey = `${msg.key.remoteJid}-${messageText.split(' ')[1] || ''}`;
        processingRequests.delete(requestKey);
    }
}

// Handler untuk command audio TikTok
async function handleTikTokAudioCommand(sock, msg) {
    try {
        const config = loadConfig();

        // Cek akses berdasarkan mode bot
        if (!checkAccess(msg, sock, config)) {
            return;
        }

        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        const args = messageText.trim().split(' ');

        if (args.length < 2) {
            const helpText = `
❌ *FORMAT SALAH!*

📝 *Cara penggunaan:*
${config.bot.prefix}ttaudio https://vt.tiktok.com/xxxxx/

🎵 *Fitur:*
• Download audio dari TikTok
• Format MP3 berkualitas tinggi
• Tanpa video, hanya audio

💡 *Contoh:*
${config.bot.prefix}ttaudio https://vt.tiktok.com/ZSjXNEnbC/`;

            await Wily(helpText, msg, sock);
            return;
        }

        const tiktokUrl = args[1];

        // Kirim pesan loading
        const loadingText = `
⏳ *MENGUNDUH AUDIO TIKTOK*

🔄 *Status:* Sedang memproses...
🔗 *URL:* ${tiktokUrl}
🎵 *Format:* MP3
⚡ *API:* SiputZX Downloader

⏱️ Mohon tunggu sebentar...`;

        await Wily(loadingText, msg, sock);

        // Download TikTok content
        const result = await downloadTikTok(tiktokUrl);

        if (!result.success) {
            const errorText = `
❌ *GAGAL MENGUNDUH AUDIO!*

🔥 *Error:* ${result.error}

🔄 Silakan coba lagi dengan URL yang valid!`;

            await Wily(errorText, msg, sock);
            return;
        }

        const data = result.data;
        const download = data.download;

        if (download.audio) {
            try {
                // Download audio dari URL
                const audioResponse = await axios.get(download.audio, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const audioBuffer = Buffer.from(audioResponse.data);

                // Caption untuk audio
                const audioCaption = `🎵 *TikTok Audio*

📝 ${data.metadata.description || data.metadata.title || 'Audio TikTok'}
🎧 Format: MP3
📥 Downloaded by WilyKun Bot`;

                // Kirim audio
                await sock.sendMessage(msg.key.remoteJid, {
                    audio: audioBuffer,
                    caption: audioCaption,
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: msg });

            } catch (audioError) {
                const audioErrorText = `
❌ *GAGAL MENGIRIM AUDIO*

🔥 *Error:* ${audioError.message}

💡 *Solusi:*
• Coba download ulang
• Periksa koneksi internet`;

                await Wily(audioErrorText, msg, sock);
            }
        } else {
            const noAudioText = `
⚠️ *TIDAK ADA AUDIO*

❌ Video ini tidak memiliki audio yang dapat didownload

💡 *Tips:*
• Coba video lain yang memiliki musik/suara
• Pastikan video bukan video silent`;

            await Wily(noAudioText, msg, sock);
        }

    } catch (error) {
        const generalErrorText = `
❌ *SISTEM ERROR AUDIO!*

🔧 Terjadi kesalahan saat memproses audio

💡 Silakan coba lagi nanti`;

        try {
            await Wily(generalErrorText, msg, sock);
        } catch (replyError) {
            // Silent error
        }
    }
}

module.exports = {
    handleTikTokCommand,
    handleTikTokAudioCommand,
    downloadTikTok
};
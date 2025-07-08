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

// Fungsi untuk download Instagram
async function downloadInstagram(url) {
    try {
        const apiUrl = `https://api.nekorinn.my.id/downloader/instagram?url=${encodeURIComponent(url)}`;

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        if (response.data && response.data.status === true) {
            return {
                success: true,
                data: response.data.result
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

// Handler untuk command Instagram download
async function handleIgCommand(sock, msg) {
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
${config.bot.prefix}ig https://www.instagram.com/reel/xxxxx/
${config.bot.prefix}ig https://www.instagram.com/p/xxxxx/

📋 *Dukungan:*
• Instagram Reels
• Instagram Posts 
• Instagram IGTV
• Instagram Stories (jika masih tersedia)

💡 *Contoh:*
${config.bot.prefix}ig https://www.instagram.com/reel/DKgDCllzIQ5/

🔗 Pastikan link Instagram valid dan dapat diakses!`;

            await Wily(helpText, msg, sock);
            return;
        }

        const instagramUrl = args[1];

        // Validasi URL Instagram
        const instagramRegex = /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|tv|stories)\/([A-Za-z0-9_-]+)\/?/;

        if (!instagramRegex.test(instagramUrl)) {
            const errorText = `
❌ *URL TIDAK VALID!*

🔗 *Format URL yang benar:*
• https://www.instagram.com/reel/xxxxx/
• https://www.instagram.com/p/xxxxx/
• https://www.instagram.com/tv/xxxxx/

💡 *Tips:*
• Salin link langsung dari Instagram
• Pastikan link dapat dibuka di browser
• Jangan gunakan link yang sudah dipendekkan

📱 Silakan coba lagi dengan URL yang valid!`;

            await Wily(errorText, msg, sock);
            processingRequests.delete(requestKey);
            return;
        }

        // Kirim pesan loading sekali saja
        const loadingText = `
⏳ *MENGUNDUH INSTAGRAM*

🔄 *Status:* Sedang memproses...
🔗 *URL:* ${instagramUrl}
📱 *Platform:* Instagram
⚡ *API:* NekoRinn Downloader

⏱️ Mohon tunggu sebentar...`;

        await Wily(loadingText, msg, sock);

        // Download Instagram content
        const result = await downloadInstagram(instagramUrl);

        if (!result.success) {
            const errorText = `
❌ *GAGAL MENGUNDUH!*

🔥 *Error:* ${result.error}

🔧 *Solusi:*
• Periksa kembali URL Instagram
• Pastikan konten masih tersedia
• Coba gunakan URL yang berbeda
• Pastikan konten tidak private

💡 *Tips:*
• Gunakan URL langsung dari Instagram
• Jangan gunakan link dari screenshot
• Pastikan akun tidak private

🔄 Silakan coba lagi dengan URL yang valid!`;

            await Wily(errorText, msg, sock);
            processingRequests.delete(requestKey);
            return;
        }

        const data = result.data;
        const metadata = data.metadata;
        const downloadUrls = data.downloadUrl;

        // Download dan kirim media
        if (downloadUrls && downloadUrls.length > 0) {
            for (let i = 0; i < downloadUrls.length; i++) {
                const mediaUrl = downloadUrls[i];

                try {
                    // Download media dari URL
                    const mediaResponse = await axios.get(mediaUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    const mediaBuffer = Buffer.from(mediaResponse.data);

                    // Caption untuk media (simple untuk menghindari duplikasi)
                    const mediaCaption = `📱 *Instagram Download*

👤 @${metadata.username}
❤️ ${metadata.like.toLocaleString()} likes • 💭 ${metadata.comment.toLocaleString()} comments

💬 ${metadata.caption.length > 300 ? metadata.caption.substring(0, 300) + '...' : metadata.caption}

📥 Downloaded by WilyKun Bot`;

                    // Kirim media berdasarkan tipe
                    if (metadata.isVideo) {
                        // Kirim sebagai video
                        await sock.sendMessage(msg.key.remoteJid, {
                            video: mediaBuffer,
                            caption: mediaCaption,
                            mimetype: 'video/mp4'
                        }, { quoted: msg });
                    } else {
                        // Kirim sebagai gambar
                        await sock.sendMessage(msg.key.remoteJid, {
                            image: mediaBuffer,
                            caption: mediaCaption,
                            mimetype: 'image/jpeg'
                        }, { quoted: msg });
                    }

                    // Delay antar media jika ada multiple files
                    if (downloadUrls.length > 1 && i < downloadUrls.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                } catch (mediaError) {
                    const mediaErrorText = `
❌ *GAGAL MENGIRIM MEDIA ${i + 1}*

🔥 *Error:* ${mediaError.message}

🔧 *Kemungkinan Penyebab:*
• File terlalu besar untuk WhatsApp
• Koneksi internet tidak stabil
• Server Instagram sedang bermasalah

💡 *Solusi:*
• Coba download ulang
• Periksa koneksi internet
• Gunakan URL yang berbeda`;

                    await Wily(mediaErrorText, msg, sock);
                }
            }
        } else {
            const noMediaText = `
⚠️ *TIDAK ADA MEDIA*

❌ *Error:* Tidak ditemukan media untuk diunduh

🔧 *Kemungkinan Penyebab:*
• Konten sudah dihapus
• Akun di-private
• Link sudah expired
• Konten tidak mengandung media

💡 *Solusi:*
• Pastikan konten masih tersedia
• Gunakan akun yang bisa akses konten
• Coba URL yang berbeda`;

            await Wily(noMediaText, msg, sock);
        }

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
    }
}

module.exports = {
    handleIgCommand,
    downloadInstagram
};